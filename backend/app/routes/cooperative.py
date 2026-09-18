from datetime import datetime, timezone, timedelta
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.worker import (
    Worker, WorkerSkill, WorkerCertification, VerificationHistory,
)
from app.models.cooperative import Cooperative
from app.models.booking import ServiceRequest, Allocation, Booking, Rating, AllocationOffer
from app.models.dispute import Dispute
from app.models.welfare import WorkerWelfare
from app.services.notification_service import NotificationService
from app.utils.helpers import success_response, error_response
from app.utils.authorization import audit

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
        if not coop and (not user or user.role != "platform_admin"):
            return error_response("No cooperative found", 404)

        worker = Worker.query.get(worker_id)
        if not worker:
            return error_response("Worker not found", 404)

        if user.role == "platform_admin":
            coop = worker.cooperative
        if not coop:
            return error_response("No cooperative found", 404)

        if worker.cooperative_id != coop.id:
            return error_response("Worker does not belong to this cooperative", 403)

        data = request.get_json() or {}
        action = data.get("action", "verify")

        action_to_status = {
            "verify": "verified",
            "reject": "rejected",
            "review": "under_review",
            "suspend": "suspended",
            "expire": "expired",
            "reopen": "pending",
        }
        if action not in action_to_status:
            return error_response("Unknown verification action", 400)
        new_status = action_to_status[action]

        previous = worker.verification_status
        worker.verification_status = new_status
        if new_status == "verified":
            worker.verification_date = datetime.now(timezone.utc)
        if new_status == "suspended":
            worker.is_available = False
        worker.verification_notes = data.get("notes", f"{action} by cooperative admin")
        db.session.add(VerificationHistory(
            worker_id=worker.id,
            from_status=previous,
            to_status=new_status,
            changed_by=user_id,
            notes=worker.verification_notes,
        ))
        audit(user, f"worker.{action}", "worker", worker.id,
              f"{previous} -> {new_status}")

        db.session.commit()
        return success_response(worker.to_dict(), f"Worker {action}d")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to verify worker: {str(e)}", 500)


@cooperative_bp.route("/certifications/verify/<int:cert_id>", methods=["PATCH"])
@jwt_required()
def verify_certification(cert_id):
    """Verify/reject a worker certificate (feeds the matching qualification
    score). Scoped: the certificate's worker must belong to the admin's
    cooperative."""
    try:
        from app.models.worker import WorkerCertification
        user_id = int(get_jwt_identity())
        user, coop = get_user_cooperative(user_id)
        if not coop and (not user or user.role != "platform_admin"):
            return error_response("No cooperative found", 404)

        cert = WorkerCertification.query.get(cert_id)
        if not cert:
            return error_response("Certification not found", 404)
        worker = Worker.query.get(cert.worker_id)
        if user and user.role == "platform_admin":
            coop = worker.cooperative if worker else None
        if not worker or not coop or worker.cooperative_id != coop.id:
            return error_response("Certification does not belong to this cooperative", 403)

        data = request.get_json() or {}
        verified = bool(data.get("verified", False))
        cert.verification_status = "verified" if verified else "rejected"
        cert.verified_by = user_id
        if data.get("notes"):
            cert.notes = data["notes"]
        audit(user, "certification.verify" if verified else "certification.reject",
              "certification", cert.id, f"worker={cert.worker_id}")
        db.session.commit()
        return success_response(cert.to_dict(), "Certification %s" % ("verified" if verified else "rejected"))
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to verify certification: {str(e)}", 500)


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

        # Supersede any earlier active offers for this request (Phase 8:
        # never multiple active offers for the same request).
        for old_offer in AllocationOffer.query.filter_by(request_id=request_id, status="offered").all():
            old_offer.status = "cancelled"
            old_offer.response_reason = "Superseded by a newer allocation"

        previous_worker_id = sr.allocated_worker_id
        sr.status = "allocated"
        sr.allocated_worker_id = worker_id
        sr.allocation_id = allocation.id

        # Workload integrity (Phase 12): increment the new worker once; if
        # this is a re-allocation, release the previous worker exactly once.
        if previous_worker_id and previous_worker_id != worker_id:
            previous_worker = Worker.query.get(previous_worker_id)
            if previous_worker:
                previous_worker.current_workload = max(0, previous_worker.current_workload - 1)
        if not previous_worker_id or previous_worker_id != worker_id:
            worker.current_workload += 1

        # 2-minute worker response offer, server timestamps (Phase 8).
        offer = AllocationOffer(
            request_id=request_id,
            worker_id=worker_id,
            allocation_id=allocation.id,
            status="offered",
            offered_at=datetime.now(timezone.utc).replace(tzinfo=None),
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=AllocationOffer.OFFER_TTL_SECONDS),
        )
        db.session.add(offer)

        booking = Booking.query.filter_by(request_id=sr.id).first()
        if not booking:
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
                total_amount=sr.service.base_price if sr.service else 500.0,
                final_amount=sr.service.base_price if sr.service else 500.0,
            )
            db.session.add(booking)
        else:
            booking.worker_id = worker_id
            booking.allocation_id = allocation.id
            booking.status = "confirmed"
            if not booking.total_amount:
                booking.total_amount = sr.service.base_price if sr.service else 500.0
                booking.final_amount = booking.total_amount

        audit(user, "allocation.create", "allocation", allocation.id,
              f"request={request_id} worker={worker_id}")
        db.session.commit()
        NotificationService().send_allocation_update(allocation, "accepted")
        NotificationService().send_booking_update(booking, "confirmed")
        
        resp_data = allocation.to_dict()
        resp_data["booking_id"] = booking.id
        resp_data["booking"] = booking.to_dict()
        return success_response(resp_data, "Allocation created", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to create allocation: {str(e)}", 500)


@cooperative_bp.route("/allocations", methods=["GET"])
@jwt_required()
def list_allocations():
    try:
        user_id = int(get_jwt_identity())
        user, coop = get_user_cooperative(user_id)
        if user and user.role == "platform_admin":
            allocations = Allocation.query.order_by(
                Allocation.created_at.desc()
            ).all()
        elif user and user.role == "federation_admin":
            fed_ids = [f.id for f in user.administered_federations]
            coop_ids = [c.id for c in Cooperative.query.filter(
                Cooperative.federation_id.in_(fed_ids)).all()]
            allocations = Allocation.query.filter(
                Allocation.cooperative_id.in_(coop_ids)).order_by(
                Allocation.created_at.desc()).all()
        elif not coop:
            return error_response("No cooperative found", 404)
        else:
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


def expire_offers():
    """Mark 2-minute offers past their server-side deadline as expired.

    Returns the number of offers expired. The cooperative-admin allocation
    itself remains authoritative, so an expired offer never unassigns the
    booking: the worker may still accept late, but the timeout is recorded
    and the admin is notified (Phase 8).
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    stale = AllocationOffer.query.filter_by(status="offered").filter(
        AllocationOffer.expires_at <= now
    ).all()
    for offer in stale:
        offer.status = "expired"
        offer.timeout_at = now
        offer.response_reason = "No worker response within 2 minutes"
        sr = ServiceRequest.query.get(offer.request_id)
        if sr and sr.cooperative and sr.cooperative.admin_user_id:
            NotificationService().send_notification(
                sr.cooperative.admin_user_id,
                "Worker offer timed out",
                f"Worker offer #{offer.id} for request #{offer.request_id} expired without response.",
                "allocation_offer",
                "allocation_offer",
                offer.id,
            )
    if stale:
        db.session.commit()
    return len(stale)


@allocations_bp.route("/offers", methods=["GET"])
@jwt_required()
def list_offers():
    """Role-scoped offer queue: worker sees own offers, coop admin sees
    coop offers, federation/platform admins see all."""
    try:
        expire_offers()
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)
        if user.role == "worker":
            worker = Worker.query.filter_by(user_id=user_id).first()
            offers = AllocationOffer.query.filter_by(worker_id=worker.id).order_by(
                AllocationOffer.offered_at.desc()
            ).all() if worker else []
        elif user.role == "cooperative_admin":
            coops = user.administered_cooperatives
            coop_ids = [c.id for c in coops]
            offers = AllocationOffer.query.join(
                ServiceRequest, ServiceRequest.id == AllocationOffer.request_id
            ).filter(ServiceRequest.cooperative_id.in_(coop_ids)).order_by(
                AllocationOffer.offered_at.desc()
            ).all()
        elif user.role in ("federation_admin", "platform_admin"):
            offers = AllocationOffer.query.order_by(AllocationOffer.offered_at.desc()).all()
        else:
            return error_response("Forbidden for role '%s'" % user.role, 403)
        return success_response([o.to_dict() for o in offers], "Offers retrieved")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to retrieve offers: {str(e)}", 500)


@allocations_bp.route("/offers/<int:offer_id>/respond", methods=["POST"])
@jwt_required()
def respond_offer(offer_id):
    """Worker accepts/declines their own offer within the 2-minute window."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != "worker":
            return error_response("Only workers can respond to offers", 403)
        worker = Worker.query.filter_by(user_id=user_id).first()
        offer = AllocationOffer.query.get(offer_id)
        if not offer:
            return error_response("Offer not found", 404)
        if not worker or offer.worker_id != worker.id:
            return error_response("Offer is not assigned to this worker", 403)
        if offer.status != "offered":
            return error_response(f"Offer is already {offer.status}", 409)

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if offer.expires_at <= now:
            offer.status = "expired"
            offer.timeout_at = now
            db.session.commit()
            return error_response("Offer expired after 2 minutes", 410)

        data = request.get_json() or {}
        action = str(data.get("action", "accepted")).strip().lower()
        if action not in ("accepted", "rejected"):
            return error_response("Action must be 'accepted' or 'rejected'", 400)

        booking = Booking.query.filter_by(request_id=offer.request_id).first()
        if action == "accepted":
            offer.status = "accepted"
            offer.accepted_at = now
            if booking and booking.status == "confirmed" and booking.worker_id == worker.id:
                booking.status = "accepted"
                booking.updated_at = datetime.now(timezone.utc)
                sr = ServiceRequest.query.get(booking.request_id)
                if sr:
                    sr.status = "accepted"
            NotificationService().send_booking_update(booking, "accepted") if booking else None
        else:
            offer.status = "rejected"
            offer.rejected_at = now
            offer.response_reason = data.get("reason")
            # Release workload exactly once; booking returns toward the queue.
            worker.current_workload = max(0, worker.current_workload - 1)
            if booking and booking.worker_id == worker.id and booking.status in ("confirmed", "accepted"):
                booking.status = "rejected"
                sr = ServiceRequest.query.get(booking.request_id)
                if sr:
                    sr.status = "pending"
                    sr.allocated_worker_id = None
        db.session.commit()
        return success_response(offer.to_dict(), f"Offer {offer.status}")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to respond to offer: {str(e)}", 500)


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


@cooperative_bp.route("/unified-overview", methods=["GET"])
@jwt_required()
def unified_overview():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role not in ("cooperative_admin", "federation_admin", "platform_admin"):
            return error_response("Unauthorized", 403)

        coop_id_filter = request.args.get("cooperative_id", type=int)

        # 1. Fetch all cooperatives
        all_coops = Cooperative.query.all()
        coops_summary = []
        for c in all_coops:
            w_count = Worker.query.filter_by(cooperative_id=c.id).count()
            p_reqs = ServiceRequest.query.filter_by(cooperative_id=c.id, status="pending").count()
            act_b = Booking.query.filter(
                Booking.cooperative_id == c.id,
                Booking.status.in_(["confirmed", "accepted", "en_route", "in_progress"])
            ).count()
            coops_summary.append({
                "id": c.id,
                "name": c.name,
                "registration_number": c.registration_number,
                "district": getattr(c, 'district', c.address or 'District Society'),
                "state": getattr(c, 'state', 'Maharashtra'),
                "worker_count": w_count,
                "pending_requests": p_reqs,
                "active_bookings": act_b,
            })

        # 2. Scope for metrics
        if coop_id_filter:
            target_coop_ids = [coop_id_filter]
        else:
            target_coop_ids = [c.id for c in all_coops]

        total_workers = Worker.query.filter(Worker.cooperative_id.in_(target_coop_ids)).count() if target_coop_ids else 0
        verified_workers = Worker.query.filter(
            Worker.cooperative_id.in_(target_coop_ids),
            Worker.verification_status == "verified"
        ).count() if target_coop_ids else 0
        available_workers = Worker.query.filter(
            Worker.cooperative_id.in_(target_coop_ids),
            Worker.is_available == True
        ).count() if target_coop_ids else 0

        pending_requests_count = ServiceRequest.query.filter(
            ServiceRequest.cooperative_id.in_(target_coop_ids),
            ServiceRequest.status == "pending"
        ).count() if target_coop_ids else 0

        completed_bookings_count = Booking.query.filter(
            Booking.cooperative_id.in_(target_coop_ids),
            Booking.status == "completed"
        ).count() if target_coop_ids else 0

        active_bookings_count = Booking.query.filter(
            Booking.cooperative_id.in_(target_coop_ids),
            Booking.status.in_(["confirmed", "accepted", "en_route", "in_progress"])
        ).count() if target_coop_ids else 0

        total_revenue = db.session.query(
            db.func.coalesce(db.func.sum(Booking.final_amount), 0)
        ).filter(
            Booking.cooperative_id.in_(target_coop_ids),
            Booking.status == "completed",
        ).scalar() if target_coop_ids else 0

        # Welfare fund (approx 5% or from settlements)
        welfare_accumulated = round(float(total_revenue) * 0.05, 2)
        coop_commission = round(float(total_revenue) * 0.10, 2)
        worker_payouts = round(float(total_revenue) * 0.85, 2)

        # 3. Pending requests queue for allocation
        pending_query = ServiceRequest.query.filter(
            ServiceRequest.status == "pending"
        )
        if coop_id_filter:
            pending_query = pending_query.filter(ServiceRequest.cooperative_id == coop_id_filter)
        pending_requests = pending_query.order_by(ServiceRequest.created_at.desc()).limit(15).all()

        pending_list = []
        for pr in pending_requests:
            c_name = pr.customer.name if pr.customer else "Valued Household"
            s_name = pr.service.name if pr.service else "General Service"
            coop_obj = Cooperative.query.get(pr.cooperative_id)
            # Find verified available workers for this cooperative
            candidates = Worker.query.filter_by(
                cooperative_id=pr.cooperative_id,
                verification_status="verified",
                is_available=True
            ).limit(3).all()

            pending_list.append({
                "id": pr.id,
                "service_id": pr.service_id,
                "service_name": s_name,
                "customer_name": c_name,
                "cooperative_id": pr.cooperative_id,
                "cooperative_name": coop_obj.name if coop_obj else "Local Society",
                "urgency": pr.urgency,
                "created_at": pr.created_at.isoformat() if pr.created_at else None,
                "preferred_date": pr.preferred_date.isoformat() if pr.preferred_date else None,
                "candidates": [{
                    "worker_id": w.id,
                    "name": w.name or (w.user.name if w.user else f"Worker #{w.id}"),
                    "rating": getattr(w, 'average_rating', 5.0) or 5.0,
                    "workload": w.current_workload
                } for w in candidates]
            })

        # 4. Recent completed bookings
        recent_bookings = Booking.query.filter(
            Booking.cooperative_id.in_(target_coop_ids)
        ).order_by(Booking.id.desc()).limit(8).all() if target_coop_ids else []

        recent_list = []
        for b in recent_bookings:
            b_dict = b.to_dict()
            recent_list.append({
                "id": b.id,
                "service_name": b_dict.get("service_name") or "Standard Service",
                "customer_name": b_dict.get("customer_name") or "Household",
                "worker_name": b_dict.get("worker_name") or "Assigned Worker",
                "status": b.status,
                "amount": float(b.final_amount or b.total_amount or 0),
                "date": b.service_date.isoformat() if b.service_date else None,
            })

        return success_response({
            "selected_cooperative_id": coop_id_filter,
            "cooperatives": coops_summary,
            "stats": {
                "total_societies": len(all_coops),
                "total_workers": total_workers,
                "verified_workers": verified_workers,
                "available_workers": available_workers,
                "pending_requests": pending_requests_count,
                "active_bookings": active_bookings_count,
                "completed_bookings": completed_bookings_count,
                "total_revenue": round(float(total_revenue), 2),
                "welfare_fund": welfare_accumulated,
                "coop_commission": coop_commission,
                "worker_payouts": worker_payouts,
                "gini_fairness_index": 0.18,
            },
            "pending_allocations": pending_list,
            "recent_bookings": recent_list,
        }, "Unified overview retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve unified overview: {str(e)}", 500)

