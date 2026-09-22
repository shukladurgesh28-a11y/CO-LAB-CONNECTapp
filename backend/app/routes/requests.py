from datetime import datetime, timezone, date
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.booking import ServiceRequest, Allocation, Booking, MatchingRecommendation
from app.models.worker import Worker
from app.models.cooperative import Cooperative
from app.models.service import Service
from app.services.matching_engine import MatchingEngine
from app.services.notification_service import NotificationService
from sqlalchemy.orm.attributes import flag_modified
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

        amount = data.get("amount") or data.get("total_amount")
        if amount is not None:
            try:
                amount = float(amount)
            except (ValueError, TypeError):
                amount = float(service.base_price) if service and service.base_price else 500.0
        else:
            amount = float(service.base_price) if service and service.base_price else 500.0

        sr_reqs = data.get("special_requirements")
        if isinstance(sr_reqs, str):
            sr_reqs = {"notes": sr_reqs}
        elif not isinstance(sr_reqs, dict):
            sr_reqs = {}

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
            special_requirements=sr_reqs,
            status="pending",
        )
        db.session.add(sr)
        db.session.flush()

        recommendations = MatchingEngine().find_recommendations(sr.id)
        rankings = [
            {
                "worker_id": r.worker.id,
                "worker_name": r.worker.name,
                "score": round(r.score * 100, 1),
                "skills": [s.skill.name for s in r.worker.skills if s.skill] if r.worker.skills else [],
                "breakdown": {k: round(v, 4) for k, v in r.breakdown.items()},
                "explanation": r.explanation,
                "rank": rank,
            }
            for rank, r in enumerate(recommendations, start=1)
        ]
        sr_reqs["candidate_rankings"] = rankings
        sr.special_requirements = sr_reqs
        flag_modified(sr, "special_requirements")

        # Auditable snapshot of the exact recommendation shown to the
        # cooperative admin (Phase 9). Recomputed fresh per request.
        MatchingRecommendation.query.filter_by(request_id=sr.id).delete()
        for rank, r in enumerate(recommendations, start=1):
            db.session.add(MatchingRecommendation(
                request_id=sr.id,
                worker_id=r.worker.id,
                score=round(r.score, 4),
                skill_score=round(r.breakdown.get("skill", 0.0), 4),
                qualification_score=round(r.breakdown.get("qualification", 0.0), 4),
                location_score=round(r.breakdown.get("location", 0.0), 4),
                availability_score=round(r.breakdown.get("availability", 0.0), 4),
                experience_score=round(r.breakdown.get("experience", 0.0), 4),
                workload_score=round(r.breakdown.get("workload", 0.0), 4),
                fairness_score=round(r.breakdown.get("fairness", 0.0), 4),
                rating_score=round(r.breakdown.get("rating", 0.0), 4),
                explanation=" | ".join(r.explanation),
                rank=rank,
            ))

        booking = Booking(
            request_id=sr.id,
            customer_id=user_id,
            cooperative_id=cooperative_id,
            worker_id=None,
            allocation_id=None,
            service_date=preferred_date,
            time_start=time_start,
            time_end=time_end,
            status="pending",
            total_amount=amount,
            final_amount=amount,
            material_charges=0.0,
        )
        db.session.add(booking)
        db.session.commit()

        if sr.cooperative and sr.cooperative.admin_user_id:
            NotificationService().send_notification(
                sr.cooperative.admin_user_id,
                "New service request",
                f"A {sr.urgency} {sr.service.name if sr.service else 'service'} request is ready for review.",
                "service_request",
                "service_request",
                sr.id,
            )

        resp_dict = sr.to_dict()
        resp_dict["booking_id"] = booking.id
        resp_dict["booking"] = booking.to_dict()
        return success_response(resp_dict, "Service request created", 201)
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
        elif user.role == "worker":
            # Worker sees pending requests in their cooperative (so they can directly accept)
            worker = Worker.query.filter_by(user_id=user_id).first()
            if worker and worker.cooperative_id:
                query = ServiceRequest.query.filter_by(cooperative_id=worker.cooperative_id)
            else:
                # Fallback: show all pending requests for demo
                query = ServiceRequest.query
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

        if status and status.strip().lower() != "all":
            query = query.filter_by(status=status.strip().lower())

        query = query.order_by(ServiceRequest.created_at.desc())
        requests_list = query.limit(limit).all()

        return success_response(
            [sr.to_dict() for sr in requests_list],
            "Requests retrieved",
        )
    except Exception as e:
        return error_response(f"Failed to retrieve requests: {str(e)}", 500)


@requests_bp.route("/<int:request_id>/accept", methods=["POST"])
@jwt_required()
def accept_request(request_id):
    """Worker directly accepts a customer request — creates allocation+booking and is visible to admin."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)
        if user.role not in ("worker", "platform_admin", "federation_admin"):
            return error_response("Only workers can directly accept requests", 403)
        worker = Worker.query.filter_by(user_id=user_id).first()
        if not worker:
            return error_response("Worker profile not found", 404)
        if worker.verification_status != "verified":
            return error_response("Worker not verified", 403)

        sr = ServiceRequest.query.get(request_id)
        if not sr:
            return error_response("Request not found", 404)
        if sr.status not in ("pending", "recommended"):
            return error_response(f"Request already {sr.status}, cannot accept", 400)
        if sr.allocated_worker_id:
            return error_response("Request already allocated", 400)

        # Create allocation (worker claims it)
        alloc = Allocation(
            request_id=sr.id,
            worker_id=worker.id,
            cooperative_id=sr.cooperative_id,
            admin_user_id=worker.user_id,
            recommendation_score=100.0,
            allocation_reason="Worker directly accepted customer request (bypassing cooperative queue for demo)",
            status="accepted",
            allocated_at=datetime.now(timezone.utc),
        )
        db.session.add(alloc)
        db.session.flush()

        sr.allocated_worker_id = worker.id
        sr.allocation_id = alloc.id
        sr.status = "allocated"
        sr.updated_at = datetime.now(timezone.utc)

        # Update or create booking for this request
        booking = Booking.query.filter_by(request_id=sr.id).first()
        if booking:
            booking.worker_id = worker.id
            booking.allocation_id = alloc.id
            booking.status = "accepted"
            booking.updated_at = datetime.now(timezone.utc)
        else:
            booking = Booking(
                request_id=sr.id,
                customer_id=sr.customer_id,
                cooperative_id=sr.cooperative_id,
                worker_id=worker.id,
                allocation_id=alloc.id,
                service_date=sr.preferred_date,
                time_start=sr.preferred_time_start,
                time_end=sr.preferred_time_end,
                status="accepted",
                total_amount=float(sr.service.base_price) if sr.service and sr.service.base_price else 500.0,
                final_amount=float(sr.service.base_price) if sr.service and sr.service.base_price else 500.0,
                material_charges=0.0,
            )
            db.session.add(booking)
            db.session.flush()

        # Notify customer and admin
        try:
            NotificationService().send_notification(
                sr.customer_id,
                "Request accepted",
                f"Worker {worker.name} accepted your {sr.service.name if sr.service else 'service'} request.",
                "service_request",
                "service_request",
                sr.id,
            )
            if sr.cooperative and sr.cooperative.admin_user_id:
                NotificationService().send_notification(
                    sr.cooperative.admin_user_id,
                    "Request claimed",
                    f"Worker {worker.name} directly accepted request #{sr.id}.",
                    "service_request",
                    "service_request",
                    sr.id,
                )
        except Exception:
            pass

        db.session.commit()
        resp = sr.to_dict()
        resp["booking_id"] = booking.id
        resp["booking"] = booking.to_dict()
        resp["allocation"] = alloc.to_dict() if hasattr(alloc, "to_dict") else {"id": alloc.id, "worker_id": worker.id}
        return success_response(resp, "Request accepted successfully — booking created and visible to admin", 200)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to accept request: {str(e)}", 500)


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
