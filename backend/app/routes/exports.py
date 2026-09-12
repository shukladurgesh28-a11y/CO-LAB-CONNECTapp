from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.booking import Booking, ServiceHistory, ServiceRequest
from app.models.user import User
from app.models.worker import Worker
from app.utils.helpers import error_response, success_response

exports_bp = Blueprint("exports", __name__, url_prefix="/api/exports")


def scoped_cooperative_ids(user):
    if user.role == "cooperative_admin":
        return [coop.id for coop in user.administered_cooperatives]
    if user.role == "federation_admin":
        return [coop.id for federation in user.administered_federations for coop in federation.cooperatives]
    return None


def scope_query(model, user):
    if user.role == "platform_admin":
        return model.query
    if user.role == "customer":
        return model.query.filter_by(customer_id=user.id)
    if user.role == "worker":
        worker = Worker.query.filter_by(user_id=user.id).first()
        return model.query.filter_by(worker_id=worker.id if worker else -1)
    cooperative_ids = scoped_cooperative_ids(user)
    return model.query.filter(model.cooperative_id.in_(cooperative_ids or [-1]))


@exports_bp.route("", methods=["GET"])
@exports_bp.route("/", methods=["GET"])
@jwt_required()
def export_data():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return error_response("User not found", 404)
    resource = request.args.get("resource", "bookings").lower()
    if resource == "bookings":
        rows = scope_query(Booking, user).order_by(Booking.created_at.desc()).limit(500).all()
    elif resource == "requests":
        rows = scope_query(ServiceRequest, user).order_by(ServiceRequest.created_at.desc()).limit(500).all()
    elif resource == "history":
        rows = scope_query(ServiceHistory, user).order_by(ServiceHistory.created_at.desc()).limit(500).all()
    else:
        return error_response("Unsupported export resource", 400)
    return success_response({"resource": resource, "count": len(rows), "items": [row.to_dict() for row in rows]}, "Export generated")
