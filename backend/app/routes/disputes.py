from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_

from app import db
from app.models.booking import Booking
from app.models.dispute import Dispute
from app.models.user import User
from app.models.worker import Worker
from app.services.notification_service import NotificationService
from app.utils.helpers import error_response, success_response


disputes_bp = Blueprint("disputes", __name__, url_prefix="/api/disputes")
VALID_STATUSES = {"open", "under_review", "resolved", "rejected", "cancelled"}
ADMIN_ROLES = {"cooperative_admin", "federation_admin", "platform_admin"}


def current_user():
    return User.query.get(int(get_jwt_identity()))


def is_visible(user, dispute):
    if user.role == "platform_admin":
        return True
    if dispute.raised_by == user.id or dispute.against_user_id == user.id:
        return True
    if user.role == "cooperative_admin":
        return dispute.cooperative_id in {coop.id for coop in user.administered_cooperatives}
    if user.role == "federation_admin":
        federation_ids = {federation.id for federation in user.administered_federations}
        return bool(dispute.cooperative and dispute.cooperative.federation_id in federation_ids)
    return False


def booking_access(user, booking):
    if user.role in ADMIN_ROLES:
        if user.role == "cooperative_admin":
            return booking.cooperative_id in {coop.id for coop in user.administered_cooperatives}
        if user.role == "federation_admin":
            return booking.cooperative and booking.cooperative.federation_id in {
                federation.id for federation in user.administered_federations
            }
        return True
    worker = Worker.query.filter_by(user_id=user.id).first()
    return booking.customer_id == user.id or bool(worker and booking.worker_id == worker.id)


@disputes_bp.route("", methods=["POST"])
@disputes_bp.route("/", methods=["POST"])
@jwt_required()
def create_dispute():
    user = current_user()
    if not user:
        return error_response("User not found", 404)
    data = request.get_json() or {}
    category = (data.get("category") or "").strip()
    description = (data.get("description") or "").strip()
    if not category or not description:
        return error_response("Category and description are required", 400)

    against_user = None
    if data.get("against_user_id"):
        against_user = User.query.get(data["against_user_id"])
        if not against_user:
            return error_response("Against user not found", 404)

    booking = None
    if data.get("booking_id"):
        booking = Booking.query.get(data["booking_id"])
        if not booking:
            return error_response("Booking not found", 404)
        if not booking_access(user, booking):
            return error_response("Unauthorized", 403)
    elif data.get("cooperative_id") and user.role not in ADMIN_ROLES:
        return error_response("A booking is required to associate this dispute", 400)

    dispute = Dispute(
        booking_id=booking.id if booking else None,
        raised_by=user.id,
        against_user_id=against_user.id if against_user else None,
        cooperative_id=booking.cooperative_id if booking else data.get("cooperative_id"),
        category=category,
        description=description,
        status="open",
    )
    db.session.add(dispute)
    db.session.commit()
    if dispute.cooperative and dispute.cooperative.admin_user_id:
        NotificationService().send_notification(
            dispute.cooperative.admin_user_id,
            "New dispute received",
            f"Dispute #{dispute.id} requires cooperative review.",
            "dispute",
            "dispute",
            dispute.id,
        )
    return success_response(dispute.to_dict(), "Dispute created", 201)


@disputes_bp.route("", methods=["GET"])
@disputes_bp.route("/", methods=["GET"])
@jwt_required()
def list_disputes():
    user = current_user()
    if not user:
        return error_response("User not found", 404)
    query = Dispute.query
    if user.role == "customer" or user.role == "worker":
        query = query.filter(or_(Dispute.raised_by == user.id, Dispute.against_user_id == user.id))
    elif user.role == "cooperative_admin":
        query = query.filter(Dispute.cooperative_id.in_({coop.id for coop in user.administered_cooperatives}))
    elif user.role == "federation_admin":
        federation_ids = {federation.id for federation in user.administered_federations}
        cooperative_ids = [coop.id for coop in user.administered_cooperatives if coop.federation_id in federation_ids]
        from app.models.cooperative import Cooperative
        cooperative_ids = [coop.id for coop in Cooperative.query.filter(Cooperative.federation_id.in_(federation_ids)).all()]
        query = query.filter(Dispute.cooperative_id.in_(cooperative_ids))
    elif user.role != "platform_admin":
        return error_response("Unauthorized", 403)
    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status.lower())
    disputes = query.order_by(Dispute.created_at.desc()).all()
    return success_response([dispute.to_dict() for dispute in disputes], "Disputes retrieved")


@disputes_bp.route("/<int:dispute_id>", methods=["GET"])
@jwt_required()
def get_dispute(dispute_id):
    user = current_user()
    dispute = Dispute.query.get(dispute_id)
    if not dispute:
        return error_response("Dispute not found", 404)
    if not user or not is_visible(user, dispute):
        return error_response("Unauthorized", 403)
    return success_response(dispute.to_dict(), "Dispute retrieved")


@disputes_bp.route("/<int:dispute_id>", methods=["PATCH"])
@jwt_required()
def update_dispute(dispute_id):
    user = current_user()
    dispute = Dispute.query.get(dispute_id)
    if not dispute:
        return error_response("Dispute not found", 404)
    if not user or not is_visible(user, dispute):
        return error_response("Unauthorized", 403)
    data = request.get_json() or {}
    new_status = data.get("status", dispute.status).lower()
    if new_status not in VALID_STATUSES:
        return error_response("Invalid dispute status", 400)
    is_admin = user.role in ADMIN_ROLES
    if not is_admin and (user.id != dispute.raised_by or new_status not in {"cancelled", dispute.status}):
        return error_response("Only an administrator can review or resolve this dispute", 403)
    if "description" in data and user.id == dispute.raised_by and not is_admin:
        dispute.description = str(data["description"]).strip()
    if is_admin:
        dispute.status = new_status
        if "resolution" in data:
            dispute.resolution = data["resolution"]
        if new_status in {"resolved", "rejected"}:
            dispute.resolved_by = user.id
    elif new_status == "cancelled":
        dispute.status = new_status
    dispute.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    if dispute.raised_by != user.id:
        NotificationService().send_notification(
            dispute.raised_by,
            "Dispute updated",
            f"Dispute #{dispute.id} is now {dispute.status.replace('_', ' ')}.",
            "dispute",
            "dispute",
            dispute.id,
        )
    return success_response(dispute.to_dict(), "Dispute updated")
