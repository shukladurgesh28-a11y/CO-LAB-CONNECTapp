from datetime import datetime, timezone, timedelta
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.cooperative import Cooperative, Federation
from app.models.worker import Worker
from app.models.booking import ServiceRequest, Booking, Rating, Invoice
from app.utils.helpers import success_response, error_response

federation_bp = Blueprint("federation", __name__, url_prefix="/api/federation")


@federation_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role not in ("federation_admin", "platform_admin"):
            return error_response("Unauthorized", 403)

        federations = user.administered_federations
        federation_ids = [f.id for f in federations] if federations else []

        cooperatives = Cooperative.query.filter(Cooperative.federation_id.in_(federation_ids)).all() if federation_ids else []
        coop_ids = [c.id for c in cooperatives]

        total_workers = Worker.query.filter(Worker.cooperative_id.in_(coop_ids)).count() if coop_ids else 0
        verified_workers = Worker.query.filter(
            Worker.cooperative_id.in_(coop_ids), Worker.verification_status == "verified"
        ).count() if coop_ids else 0

        total_requests = ServiceRequest.query.filter(ServiceRequest.cooperative_id.in_(coop_ids)).count() if coop_ids else 0
        completed_bookings = Booking.query.filter(
            Booking.cooperative_id.in_(coop_ids), Booking.status == "completed"
        ).count() if coop_ids else 0

        total_revenue = db.session.query(
            db.func.coalesce(db.func.sum(Booking.final_amount), 0)
        ).filter(
            Booking.cooperative_id.in_(coop_ids),
            Booking.status == "completed",
        ).scalar() if coop_ids else 0

        # Real invoiced money across the federation (commission is the only
        # deduction).
        money = db.session.query(
            db.func.coalesce(db.func.sum(Invoice.commission_amount), 0),
            db.func.coalesce(db.func.sum(Invoice.worker_payout), 0),
        ).join(Booking, Invoice.booking_id == Booking.id).filter(
            Booking.cooperative_id.in_(coop_ids),
        ).first() if coop_ids else (0, 0)

        return success_response({
            "federations": [f.to_dict() for f in federations],
            "total_cooperatives": len(cooperatives),
            "total_workers": total_workers,
            "verified_workers": verified_workers,
            "total_requests": total_requests,
            "completed_bookings": completed_bookings,
            "total_revenue": float(total_revenue),
            "coop_commission": float(money[0] or 0),
            "worker_payouts": float(money[1] or 0),
        }, "Federation dashboard retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve dashboard: {str(e)}", 500)


@federation_bp.route("/cooperatives", methods=["GET"])
@jwt_required()
def list_cooperatives():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role not in ("federation_admin", "platform_admin"):
            return error_response("Unauthorized", 403)

        if user.role == "platform_admin":
            cooperatives = Cooperative.query.filter_by(is_active=True).all()
        else:
            federation_ids = [f.id for f in user.administered_federations]
            cooperatives = Cooperative.query.filter(
                Cooperative.federation_id.in_(federation_ids),
                Cooperative.is_active == True,
            ).all()

        data = []
        for coop in cooperatives:
            coop_data = coop.to_dict()
            coop_data["worker_count"] = Worker.query.filter_by(cooperative_id=coop.id).count()
            coop_data["completed_bookings"] = Booking.query.filter_by(cooperative_id=coop.id, status="completed").count()
            data.append(coop_data)

        return success_response(data, "Cooperatives retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve cooperatives: {str(e)}", 500)


@federation_bp.route("/demand", methods=["GET"])
@jwt_required()
def demand():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role not in ("federation_admin", "platform_admin"):
            return error_response("Unauthorized", 403)

        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        federation_ids = [f.id for f in user.administered_federations] if user.administered_federations else []
        cooperatives = Cooperative.query.filter(Cooperative.federation_id.in_(federation_ids)).all() if federation_ids else []
        coop_ids = [c.id for c in cooperatives]

        if not coop_ids:
            return success_response({
                "by_cooperative": [],
                "by_service": [],
                "total_requests": 0,
            }, "No cooperatives found")

        by_cooperative = db.session.query(
            ServiceRequest.cooperative_id,
            db.func.count(ServiceRequest.id).label("count"),
        ).filter(
            ServiceRequest.cooperative_id.in_(coop_ids),
            ServiceRequest.created_at >= thirty_days_ago,
        ).group_by(ServiceRequest.cooperative_id).all()

        by_service = db.session.query(
            ServiceRequest.service_id,
            db.func.count(ServiceRequest.id).label("count"),
        ).filter(
            ServiceRequest.cooperative_id.in_(coop_ids),
            ServiceRequest.created_at >= thirty_days_ago,
        ).group_by(ServiceRequest.service_id).all()

        total_requests = ServiceRequest.query.filter(
            ServiceRequest.cooperative_id.in_(coop_ids),
            ServiceRequest.created_at >= thirty_days_ago,
        ).count()

        return success_response({
            "by_cooperative": [{"cooperative_id": r[0], "count": r[1]} for r in by_cooperative],
            "by_service": [{"service_id": r[0], "count": r[1]} for r in by_service],
            "total_requests": total_requests,
        }, "Demand analytics retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve demand: {str(e)}", 500)


@federation_bp.route("/workforce", methods=["GET"])
@jwt_required()
def workforce():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role not in ("federation_admin", "platform_admin"):
            return error_response("Unauthorized", 403)

        federation_ids = [f.id for f in user.administered_federations] if user.administered_federations else []
        cooperatives = Cooperative.query.filter(Cooperative.federation_id.in_(federation_ids)).all() if federation_ids else []
        coop_ids = [c.id for c in cooperatives]

        if not coop_ids:
            return success_response({"by_cooperative": [], "total": 0}, "No cooperatives found")

        total = Worker.query.filter(Worker.cooperative_id.in_(coop_ids)).count()
        verified = Worker.query.filter(
            Worker.cooperative_id.in_(coop_ids), Worker.verification_status == "verified"
        ).count()
        available = Worker.query.filter(
            Worker.cooperative_id.in_(coop_ids), Worker.is_available == True
        ).count()

        by_cooperative = db.session.query(
            Worker.cooperative_id,
            db.func.count(Worker.id).label("count"),
        ).filter(
            Worker.cooperative_id.in_(coop_ids),
        ).group_by(Worker.cooperative_id).all()

        return success_response({
            "total_workers": total,
            "verified_workers": verified,
            "available_workers": available,
            "by_cooperative": [{"cooperative_id": r[0], "count": r[1]} for r in by_cooperative],
        }, "Workforce overview retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve workforce: {str(e)}", 500)


@federation_bp.route("/performance", methods=["GET"])
@jwt_required()
def performance():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role not in ("federation_admin", "platform_admin"):
            return error_response("Unauthorized", 403)

        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        federation_ids = [f.id for f in user.administered_federations] if user.administered_federations else []
        cooperatives = Cooperative.query.filter(Cooperative.federation_id.in_(federation_ids)).all() if federation_ids else []

        coop_performance = []
        for coop in cooperatives:
            total = Booking.query.filter(
                Booking.cooperative_id == coop.id,
                Booking.created_at >= thirty_days_ago,
            ).count()
            completed = Booking.query.filter(
                Booking.cooperative_id == coop.id,
                Booking.status == "completed",
                Booking.created_at >= thirty_days_ago,
            ).count()
            revenue = db.session.query(
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
            coop_performance.append({
                "cooperative_id": coop.id,
                "cooperative_name": coop.name,
                "total_bookings": total,
                "completed_bookings": completed,
                "fulfillment_rate": round((completed / total * 100) if total > 0 else 0, 2),
                "total_revenue": float(revenue),
                "average_rating": round(float(avg_rating), 2),
            })

        return success_response(coop_performance, "Performance comparison retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve performance: {str(e)}", 500)
