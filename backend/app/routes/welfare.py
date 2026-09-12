from datetime import date, datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models.user import User
from app.models.welfare import WorkerWelfare
from app.models.worker import Worker
from app.utils.helpers import error_response, success_response

welfare_bp = Blueprint("welfare", __name__, url_prefix="/api/welfare")


def accessible_worker_ids(user):
    if user.role == "worker":
        worker = Worker.query.filter_by(user_id=user.id).first()
        return {worker.id} if worker else set()
    if user.role == "cooperative_admin":
        return {worker.id for coop in user.administered_cooperatives for worker in coop.workers}
    if user.role in ("federation_admin", "platform_admin"):
        if user.role == "platform_admin":
            return {worker.id for worker in Worker.query.all()}
        federation_ids = {federation.id for federation in user.administered_federations}
        return {
            worker.id
            for worker in Worker.query.all()
            if worker.cooperative and worker.cooperative.federation_id in federation_ids
        }
    return set()


@welfare_bp.route("", methods=["GET"])
@welfare_bp.route("/", methods=["GET"])
@jwt_required()
def list_welfare():
    user = User.query.get(int(get_jwt_identity()))
    if not user or user.role == "customer":
        return error_response("Unauthorized", 403)
    worker_id = request.args.get("worker_id", type=int)
    allowed = accessible_worker_ids(user)
    if worker_id and worker_id not in allowed:
        return error_response("Unauthorized", 403)
    query = WorkerWelfare.query.filter(WorkerWelfare.worker_id.in_([worker_id] if worker_id else allowed))
    return success_response([record.to_dict() for record in query.order_by(WorkerWelfare.updated_at.desc()).all()], "Welfare records retrieved")


@welfare_bp.route("", methods=["POST"])
@welfare_bp.route("/", methods=["POST"])
@jwt_required()
def create_welfare():
    user = User.query.get(int(get_jwt_identity()))
    if not user or user.role not in ("worker", "cooperative_admin", "federation_admin", "platform_admin"):
        return error_response("Unauthorized", 403)
    data = request.get_json() or {}
    worker_id = data.get("worker_id")
    if not worker_id or worker_id not in accessible_worker_ids(user):
        return error_response("Worker access is not permitted", 403)
    record = WorkerWelfare(
        worker_id=worker_id,
        scheme_name=data.get("scheme_name"),
        provider=data.get("provider"),
        enrollment_status=data.get("enrollment_status", "pending"),
        coverage_details=data.get("coverage_details"),
        emergency_contact=data.get("emergency_contact"),
        notes=data.get("notes"),
    )
    for field in ("start_date", "end_date"):
        if data.get(field):
            setattr(record, field, date.fromisoformat(data[field]))
    db.session.add(record)
    db.session.commit()
    return success_response(record.to_dict(), "Welfare record created", 201)


@welfare_bp.route("/<int:record_id>", methods=["PATCH"])
@jwt_required()
def update_welfare(record_id):
    user = User.query.get(int(get_jwt_identity()))
    record = WorkerWelfare.query.get(record_id)
    if not record:
        return error_response("Welfare record not found", 404)
    if not user or record.worker_id not in accessible_worker_ids(user):
        return error_response("Unauthorized", 403)
    data = request.get_json() or {}
    if user.role == "worker" and "enrollment_status" in data:
        return error_response("Workers cannot change enrollment status", 403)
    for field in ("scheme_name", "provider", "enrollment_status", "coverage_details", "emergency_contact", "notes"):
        if field in data:
            setattr(record, field, data[field])
    for field in ("start_date", "end_date"):
        if field in data:
            setattr(record, field, date.fromisoformat(data[field]) if data[field] else None)
    record.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return success_response(record.to_dict(), "Welfare record updated")
