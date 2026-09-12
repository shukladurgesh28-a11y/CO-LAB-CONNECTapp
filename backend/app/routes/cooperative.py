from datetime import datetime, timezone, timedelta
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.worker import Worker, WorkerSkill, WorkerCertification
from app.models.cooperative import Cooperative
from app.models.booking import ServiceRequest, Allocation, Booking, Rating
from app.models.dispute import Dispute
from app.models.welfare import WorkerWelfare
from app.services.notification_service import NotificationService
from app.utils.helpers import success_response, error_response

cooperative_bp = Blueprint("cooperative", __name__, url_prefix="/api/cooperative")
allocations_bp = Blueprint("allocations", __name__, url_prefix="/api")


def get_user_cooperative(user_id):
    user = User.query.get(user_id)
    if not user:
        return None, None
    coops = user.administered_cooperatives
    if coops:
        return user, coops[0]
    return user, None


@cooperative_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    try:
        user_id = int(get_jwt_identity())
        user, coop = get_user_cooperative(user_id)
        if not coop:
            return error_response("No cooperative found for this user", 404)

        worker_count = Worker.query.filter_by(cooperative_id=coop.id).count()
        verified_count = Worker.query.filter_by(cooperative_id=coop.id, verification_status="verified").count()
        available_count = Worker.query.filter_by(cooperative_id=coop.id, is_available=True).count()
        pending_requests = ServiceRequest.query.filter_by(cooperative_id=coop.id, status="pending").count()
        active_bookings = Booking.query.filter(
            Booking.cooperative_id == coop.id,
            Booking.status.in_(["confirmed", "en_route", "in_progress"]),
        ).count()
        completed_bookings = Booking.query.filter_by(cooperative_id=coop.id, status="completed").count()
        open_disputes = Dispute.query.filter(
            Dispute.cooperative_id == coop.id,
            Dispute.status.in_(["open", "under_review"]),
        ).count()
        welfare_records = WorkerWelfare.query.join(Worker).filter(Worker.cooperative_id == coop.id).count()

        total_revenue = db.session.query(
            db.func.coalesce(db.func.sum(Booking.final_amount), 0)
        ).filter(
            Booking.cooperative_id == coop.id,
            Booking.status == "completed",
        ).scalar()

        return success_response({
            "cooperative": coop.to_dict(),
            "workers_total": worker_count,
            "workers_verified": verified_count,
            "workers_available": available_count,
            "pending_requests": pending_requests,
            "active_bookings": active_bookings,
            "completed_bookings": completed_bookings,
            "total_revenue": float(total_revenue),
            "open_disputes": open_disputes,
            "welfare_records": welfare_records,
        }, "Dashboard retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve dashboard: {str(e)}", 500)


@cooperative_bp.route("/workers", methods=["GET"])
@jwt_required()
def list_workers():
    try:
        user_id = int(get_jwt_identity())
        user, coop = get_user_cooperative(user_id)
        if not coop:
            return error_response("No cooperative found", 404)

        workers = Worker.query.filter_by(cooperative_id=coop.id).all()
        return success_response(
            [w.to_dict(include_details=True) for w in workers],
            "Workers retrieved",
        )
    except Exception as e:
        return error_response(f"Failed to retrieve workers: {str(e)}", 500)


@cooperative_bp.route("/workers/verify/<int:worker_id>", methods=["POST"])
@jwt_required()
def verify_worker(worker_id):
    try:
        user_id = int(get_jwt_identity())
        user, coop = get_user_cooperative(user_id)
        if not coop:
            return error_response("No cooperative found", 404)

        worker = Worker.query.get(worker_id)
        if not worker:
            return error_response("Worker not found", 404)

        if worker.cooperative_id != coop.id:
            return error_response("Worker does not belong to this cooperative", 403)

        data = request.get_json() or {}
        action = data.get("action", "verify")

        if action == "verify":
            worker.verification_status = "verified"
            worker.verification_date = datetime.now(timezone.utc)
            worker.verification_notes = data.get("notes", "Verified by cooperative admin")
        elif action == "reject":
            worker.verification_status = "rejected"
            worker.verification_notes = data.get("notes", "Rejected by cooperative admin")

        db.session.commit()
        return success_response(worker.to_dict(), f"Worker {action}d")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to verify worker: {str(e)}", 500)


@cooperative_bp.route("/requests", methods=["GET"])
@jwt_required()
def list_requests():
    try:
        user_id = int(get_jwt_identity())
        user, coop = get_user_cooperative(user_id)
        if not coop:
            return error_response("No cooperative found", 404)

        status = request.args.get("status", "pending")
        limit = request.args.get("limit", type=int, default=100)
        limit = max(1, min(limit, 200))
        query = ServiceRequest.query.filter_by(cooperative_id=coop.id)
        if status != "all":
            query = query.filter_by(status=status)

        requests_list = query.order_by(ServiceRequest.created_at.desc()).limit(limit).all()
        return success_response(
            [sr.to_dict() for sr in requests_list],
            "Requests retrieved",
        )
    except Exception as e:
        return error_response(f"Failed to retrieve requests: {str(e)}", 500)


@cooperative_bp.route("/allocations", methods=["POST"])
@jwt_required()
def create_allocation():
    try:
        user_id = int(get_jwt_identity())
        user, coop = get_user_cooperative(user_id)
        if not coop:
            return error_response("No cooperative found", 404)

        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        request_id = data.get("request_id")
        worker_id = data.get("worker_id")

        if not request_id or not worker_id:
            return error_response("Request ID and Worker ID are required", 400)

        sr = ServiceRequest.query.get(request_id)
        if not sr:
            return error_response("Service request not found", 404)
        if sr.cooperative_id != coop.id:
            return error_response("Service request does not belong to this cooperative", 403)

        if Allocation.query.filter_by(request_id=request_id, status="accepted").first():
            return error_response("This request already has an active allocation", 409)

        worker = Worker.query.get(worker_id)
        if not worker:
            return error_response("Worker not found", 404)

        if worker.cooperative_id != coop.id:
            return error_response("Worker does not belong to this cooperative", 403)
        if worker.verification_status != "verified":
            return error_response("Worker is not verified", 409)
        if not worker.is_available or worker.current_workload >= worker.max_workload:
            return error_response("Worker is unavailable", 409)

        allocation = Allocation(
            request_id=request_id,
            worker_id=worker_id,
            cooperative_id=coop.id,
            admin_user_id=user_id,
            recommendation_score=data.get("recommendation_score"),
            allocation_reason=data.get("reason", "Admin allocation"),
            status="accepted",
        )
        db.session.add(allocation)
        db.session.flush()

        sr.status = "allocated"
        sr.allocated_worker_id = worker_id
        sr.allocation_id = allocation.id

        worker.current_workload += 1

        if not Booking.query.filter_by(request_id=sr.id).first():
            booking = Booking(
                request_id=sr.id,
                allocation_id=allocation.id,
                worker_id=worker_id,
                customer_id=sr.customer_id,
                cooperative_id=coop.id,
                service_date=sr.preferred_date,
                time_start=sr.preferred_time_start,
                time_end=sr.preferred_time_end,
                status="confirmed",
                total_amount=sr.service.base_price if sr.service else None,
                final_amount=sr.service.base_price if sr.service else None,
            )
            db.session.add(booking)

        db.session.commit()
        NotificationService().send_allocation_update(allocation, "accepted")
        booking = Booking.query.filter_by(request_id=sr.id).first()
        if booking:
            NotificationService().send_booking_update(booking, "confirmed")
        return success_response(allocation.to_dict(), "Allocation created", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to create allocation: {str(e)}", 500)


@cooperative_bp.route("/allocations", methods=["GET"])
@jwt_required()
def list_allocations():
    try:
        user_id = int(get_jwt_identity())
        user, coop = get_user_cooperative(user_id)
        if not coop:
            return error_response("No cooperative found", 404)

        allocations = Allocation.query.filter_by(cooperative_id=coop.id).order_by(
            Allocation.created_at.desc()
        ).all()
        return success_response(
            [a.to_dict() for a in allocations],
            "Allocations retrieved",
        )
    except Exception as e:
        return error_response(f"Failed to retrieve allocations: {str(e)}", 500)


@allocations_bp.route("/allocations", methods=["POST"])
@jwt_required()
def create_allocation_api():
    return create_allocation()


@allocations_bp.route("/allocations", methods=["GET"])
@jwt_required()
def list_allocations_api():
    return list_allocations()


@cooperative_bp.route("/performance", methods=["GET"])
@jwt_required()
def performance():
    try:
        user_id = int(get_jwt_identity())
        user, coop = get_user_cooperative(user_id)
        if not coop:
            return error_response("No cooperative found", 404)

        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        total_bookings = Booking.query.filter(
            Booking.cooperative_id == coop.id,
            Booking.created_at >= thirty_days_ago,
        ).count()

        completed_bookings = Booking.query.filter(
            Booking.cooperative_id == coop.id,
            Booking.status == "completed",
            Booking.created_at >= thirty_days_ago,
        ).count()

        cancelled_bookings = Booking.query.filter(
            Booking.cooperative_id == coop.id,
            Booking.status == "cancelled",
            Booking.created_at >= thirty_days_ago,
        ).count()

        total_revenue = db.session.query(
            db.func.coalesce(db.func.sum(Booking.final_amount), 0)
        ).filter(
            Booking.cooperative_id == coop.id,
            Booking.status == "completed",
            Booking.created_at >= thirty_days_ago,
        ).scalar()

        avg_rating = db.session.query(
            db.func.coalesce(db.func.avg(Rating.rating), 0)
        ).join(Booking).filter(
            Booking.cooperative_id == coop.id,
            Rating.created_at >= thirty_days_ago,
        ).scalar()

        fulfillment_rate = (completed_bookings / total_bookings * 100) if total_bookings > 0 else 0

        return success_response({
            "period": "last_30_days",
            "total_bookings": total_bookings,
            "completed_bookings": completed_bookings,
            "cancelled_bookings": cancelled_bookings,
            "total_revenue": float(total_revenue),
            "average_rating": round(float(avg_rating), 2),
            "fulfillment_rate": round(fulfillment_rate, 2),
        }, "Performance metrics retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve performance: {str(e)}", 500)


@cooperative_bp.route("/demand", methods=["GET"])
@jwt_required()
def demand():
    try:
        user_id = int(get_jwt_identity())
        user, coop = get_user_cooperative(user_id)
        if not coop:
            return error_response("No cooperative found", 404)

        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        requests_by_service = db.session.query(
            ServiceRequest.service_id,
            db.func.count(ServiceRequest.id).label("count"),
        ).filter(
            ServiceRequest.cooperative_id == coop.id,
            ServiceRequest.created_at >= thirty_days_ago,
        ).group_by(ServiceRequest.service_id).all()

        requests_by_status = db.session.query(
            ServiceRequest.status,
            db.func.count(ServiceRequest.id).label("count"),
        ).filter(
            ServiceRequest.cooperative_id == coop.id,
            ServiceRequest.created_at >= thirty_days_ago,
        ).group_by(ServiceRequest.status).all()

        requests_by_urgency = db.session.query(
            ServiceRequest.urgency,
            db.func.count(ServiceRequest.id).label("count"),
        ).filter(
            ServiceRequest.cooperative_id == coop.id,
            ServiceRequest.created_at >= thirty_days_ago,
        ).group_by(ServiceRequest.urgency).all()

        return success_response({
            "by_service": [{"service_id": r[0], "count": r[1]} for r in requests_by_service],
            "by_status": [{"status": r[0], "count": r[1]} for r in requests_by_status],
            "by_urgency": [{"urgency": r[0], "count": r[1]} for r in requests_by_urgency],
        }, "Demand analytics retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve demand analytics: {str(e)}", 500)
