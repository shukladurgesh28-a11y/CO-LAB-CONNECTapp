from datetime import datetime, timezone
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.worker import Worker
from app.models.booking import Booking, Rating
from app.utils.helpers import success_response, error_response

ratings_bp = Blueprint("ratings", __name__, url_prefix="/api/ratings")


@ratings_bp.route("", methods=["POST"])
@ratings_bp.route("/", methods=["POST"])
@jwt_required()
def submit_rating():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        booking_id = data.get("booking_id")
        rating_value = data.get("rating")

        if not booking_id or rating_value is None:
            return error_response("Booking ID and rating are required", 400)

        if not (1 <= rating_value <= 5):
            return error_response("Rating must be between 1 and 5", 400)

        booking = Booking.query.get(booking_id)
        if not booking:
            return error_response("Booking not found", 404)

        if booking.customer_id != user_id:
            return error_response("Only the customer can rate this booking", 403)

        if booking.status != "completed":
            return error_response("Can only rate completed bookings", 400)

        existing = Rating.query.filter_by(booking_id=booking_id, customer_id=user_id).first()
        if existing:
            return error_response("You have already rated this booking", 409)

        rating = Rating(
            booking_id=booking_id,
            customer_id=user_id,
            worker_id=booking.worker_id,
            rating=rating_value,
            feedback=data.get("feedback"),
            service_quality=data.get("service_quality"),
            punctuality=data.get("punctuality"),
            professionalism=data.get("professionalism"),
        )
        db.session.add(rating)
        db.session.flush()

        worker = Worker.query.get(booking.worker_id)
        if worker:
            all_ratings = Rating.query.filter_by(worker_id=worker.id).all()
            avg = sum(r.rating for r in all_ratings) / len(all_ratings) if all_ratings else 0
            worker.average_rating = round(avg, 2)

        db.session.commit()

        notif_service = __import__("app.services.notification_service", fromlist=["NotificationService"]).NotificationService()
        notif_service.send_notification(
            worker.user_id if worker else booking.worker_id,
            "New Rating Received",
            f"You received a {rating_value}-star rating",
            "rating",
            "booking",
            booking_id,
        )

        return success_response(rating.to_dict(), "Rating submitted", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to submit rating: {str(e)}", 500)


@ratings_bp.route("/worker/<int:worker_id>", methods=["GET"])
def get_worker_ratings(worker_id):
    try:
        worker = Worker.query.get(worker_id)
        if not worker:
            return error_response("Worker not found", 404)

        ratings = Rating.query.filter_by(worker_id=worker_id).order_by(Rating.created_at.desc()).all()

        avg_quality = db.session.query(db.func.avg(Rating.service_quality)).filter_by(worker_id=worker_id).scalar()
        avg_punctuality = db.session.query(db.func.avg(Rating.punctuality)).filter_by(worker_id=worker_id).scalar()
        avg_professionalism = db.session.query(db.func.avg(Rating.professionalism)).filter_by(worker_id=worker_id).scalar()

        return success_response({
            "ratings": [r.to_dict() for r in ratings],
            "total_ratings": len(ratings),
            "average_rating": worker.average_rating,
            "average_service_quality": round(float(avg_quality), 2) if avg_quality else None,
            "average_punctuality": round(float(avg_punctuality), 2) if avg_punctuality else None,
            "average_professionalism": round(float(avg_professionalism), 2) if avg_professionalism else None,
        }, "Ratings retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve ratings: {str(e)}", 500)


@ratings_bp.route("/booking/<int:booking_id>", methods=["GET"])
def get_booking_rating(booking_id):
    try:
        rating = Rating.query.filter_by(booking_id=booking_id).first()
        if not rating:
            return success_response(None, "No rating found for this booking")
        return success_response(rating.to_dict(), "Rating retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve rating: {str(e)}", 500)
