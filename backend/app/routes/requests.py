from datetime import datetime, timezone, date
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.booking import ServiceRequest, Allocation
from app.models.worker import Worker
from app.models.cooperative import Cooperative
from app.models.service import Service
from app.services.matching_engine import MatchingEngine
from app.services.notification_service import NotificationService
from app.utils.helpers import success_response, error_response

requests_bp = Blueprint("requests", __name__, url_prefix="/api/requests")


@requests_bp.route("", methods=["POST"])
@requests_bp.route("/", methods=["POST"])
@jwt_required()
def create_request():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        service_id = data.get("service_id")
        if not service_id:
            return error_response("Service ID is required", 400)
        service = Service.query.get(service_id)
        if not service or not service.is_active:
            return error_response("Service not found", 404)

        preferred_date = None
        if data.get("preferred_date"):
            preferred_date = datetime.strptime(data["preferred_date"], "%Y-%m-%d").date()

        time_start = None
        if data.get("preferred_time_start"):
            time_start = datetime.strptime(data["preferred_time_start"], "%H:%M").time()

        time_end = None
        if data.get("preferred_time_end"):
            time_end = datetime.strptime(data["preferred_time_end"], "%H:%M").time()

        cooperative_id = data.get("cooperative_id")
        if not cooperative_id:
            demo_cooperative = Cooperative.query.filter_by(is_active=True).order_by(Cooperative.id).first()
            cooperative_id = demo_cooperative.id if demo_cooperative else None

        sr = ServiceRequest(
            customer_id=user_id,
            service_id=service.id,
            cooperative_id=cooperative_id,
            description=data.get("description"),
            location_address=data.get("location_address"),
            location_lat=data.get("location_lat"),
            location_lng=data.get("location_lng"),
            preferred_date=preferred_date,
            preferred_time_start=time_start,
            preferred_time_end=time_end,
            urgency=data.get("urgency", "normal"),
            special_requirements=data.get("special_requirements"),
            status="pending",
        )
        db.session.add(sr)
        db.session.commit()

        recommendations = MatchingEngine().find_recommendations(sr.id)
        # Booking remains PENDING until cooperative allocates a worker, per SIH spec.
        # We just generate recommendations for the UI to fetch later.

        if sr.cooperative and sr.cooperative.admin_user_id:
            NotificationService().send_notification(
                sr.cooperative.admin_user_id,
                "New service request",
                f"A {sr.urgency} {sr.service.name if sr.service else 'service'} request is ready for review.",
                "service_request",
                "service_request",
                sr.id,
            )

        return success_response(sr.to_dict(), "Service request created", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to create request: {str(e)}", 500)


@requests_bp.route("", methods=["GET"])
@requests_bp.route("/", methods=["GET"])
@jwt_required()
def list_requests():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        status = request.args.get("status")
        limit = request.args.get("limit", type=int, default=100)
        limit = max(1, min(limit, 200))

        if user.role == "customer":
            query = ServiceRequest.query.filter_by(customer_id=user_id)
        elif user.role == "cooperative_admin":
            worker = Worker.query.filter_by(user_id=user_id).first()
            cooperative_id = data.get("cooperative_id") if (data := request.args) else None
            if not cooperative_id and worker:
                cooperative_id = worker.cooperative_id
            if cooperative_id:
                query = ServiceRequest.query.filter_by(cooperative_id=cooperative_id)
            else:
                query = ServiceRequest.query.filter(
                    ServiceRequest.cooperative_id.in_(
                        [c.id for c in user.administered_cooperatives]
                    )
                )
        elif user.role in ("federation_admin", "platform_admin"):
            query = ServiceRequest.query
        else:
            query = ServiceRequest.query.filter_by(customer_id=user_id)

        if status:
            query = query.filter_by(status=status)

        query = query.order_by(ServiceRequest.created_at.desc())
        requests_list = query.limit(limit).all()

        return success_response(
            [sr.to_dict() for sr in requests_list],
            "Requests retrieved",
        )
    except Exception as e:
        return error_response(f"Failed to retrieve requests: {str(e)}", 500)


@requests_bp.route("/<int:request_id>", methods=["GET"])
@jwt_required()
def get_request(request_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)
        sr = ServiceRequest.query.get(request_id)
        if not sr:
            return error_response("Request not found", 404)

        worker = Worker.query.filter_by(user_id=user_id).first()
        is_cooperative_admin = any(coop.id == sr.cooperative_id for coop in user.administered_cooperatives)
        if not (
            sr.customer_id == user_id
            or (worker and sr.allocated_worker_id == worker.id)
            or is_cooperative_admin
            or user.role in ("federation_admin", "platform_admin")
        ):
            return error_response("Unauthorized", 403)

        return success_response(sr.to_dict(), "Request retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve request: {str(e)}", 500)


@requests_bp.route("/<int:request_id>", methods=["PATCH"])
@jwt_required()
def update_request(request_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        sr = ServiceRequest.query.get(request_id)
        if not sr:
            return error_response("Request not found", 404)

        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        if "status" in data:
            sr.status = data["status"]
        if "description" in data:
            sr.description = data["description"]
        if "cooperative_id" in data:
            sr.cooperative_id = data["cooperative_id"]
        if "allocated_worker_id" in data:
            sr.allocated_worker_id = data["allocated_worker_id"]
        if "allocation_id" in data:
            sr.allocation_id = data["allocation_id"]

        sr.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        return success_response(sr.to_dict(), "Request updated")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update request: {str(e)}", 500)


@requests_bp.route("/<int:request_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_request(request_id):
    try:
        user_id = int(get_jwt_identity())
        sr = ServiceRequest.query.get(request_id)
        if not sr:
            return error_response("Request not found", 404)

        if sr.customer_id != user_id:
            return error_response("Unauthorized", 403)

        if sr.status in ("completed", "cancelled"):
            return error_response(f"Cannot cancel a {sr.status} request", 400)

        sr.status = "cancelled"
        sr.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        return success_response(sr.to_dict(), "Request cancelled")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to cancel request: {str(e)}", 500)
