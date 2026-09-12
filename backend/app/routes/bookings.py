from datetime import datetime, timezone
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.worker import Worker
from app.models.booking import Booking, Allocation, ServiceRequest, ServiceHistory, Payment
from app.models.material import MaterialRequirement
from app.services.notification_service import NotificationService
from app.utils.helpers import success_response, error_response

bookings_bp = Blueprint("bookings", __name__, url_prefix="/api/bookings")


@bookings_bp.route("", methods=["POST"])
@bookings_bp.route("/", methods=["POST"])
@jwt_required()
def create_booking():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        if user.role not in ("cooperative_admin", "federation_admin", "platform_admin"):
            return error_response("Only admins can create bookings", 403)

        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        allocation_id = data.get("allocation_id")
        if not allocation_id:
            return error_response("Allocation ID is required", 400)

        allocation = Allocation.query.get(allocation_id)
        if not allocation:
            return error_response("Allocation not found", 404)

        if allocation.status != "accepted":
            return error_response("Allocation must be accepted before creating booking", 400)

        sr = ServiceRequest.query.get(allocation.request_id)
        if not sr:
            return error_response("Service request not found", 404)

        if Booking.query.filter(
            (Booking.request_id == allocation.request_id) | (Booking.allocation_id == allocation_id)
        ).first():
            return error_response("A booking already exists for this allocation", 409)

        booking = Booking(
            request_id=allocation.request_id,
            allocation_id=allocation_id,
            worker_id=allocation.worker_id,
            customer_id=sr.customer_id,
            cooperative_id=allocation.cooperative_id,
            service_date=data.get("service_date", sr.preferred_date.isoformat() if sr.preferred_date else None),
            time_start=data.get("time_start", str(sr.preferred_time_start) if sr.preferred_time_start else None),
            time_end=data.get("time_end", str(sr.preferred_time_end) if sr.preferred_time_end else None),
            status="confirmed",
            total_amount=data.get("total_amount"),
            material_charges=0.0,
            final_amount=data.get("total_amount"),
        )

        if isinstance(booking.service_date, str):
            booking.service_date = datetime.strptime(booking.service_date, "%Y-%m-%d").date()
        if isinstance(booking.time_start, str):
            booking.time_start = datetime.strptime(booking.time_start, "%H:%M").time()
        if isinstance(booking.time_end, str):
            booking.time_end = datetime.strptime(booking.time_end, "%H:%M").time()

        sr.status = "confirmed"
        sr.allocation_id = allocation_id

        db.session.add(booking)
        db.session.commit()

        notif_service = NotificationService()
        notif_service.send_booking_update(booking, "confirmed")

        return success_response(booking.to_dict(), "Booking created", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to create booking: {str(e)}", 500)


@bookings_bp.route("", methods=["GET"])
@bookings_bp.route("/", methods=["GET"])
@jwt_required()
def list_bookings():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        status = request.args.get("status")

        if user.role == "customer":
            query = Booking.query.filter_by(customer_id=user_id)
        elif user.role == "worker":
            worker = Worker.query.filter_by(user_id=user_id).first()
            if worker:
                query = Booking.query.filter_by(worker_id=worker.id)
            else:
                query = Booking.query.filter_by(customer_id=user_id)
        elif user.role == "cooperative_admin":
            coops = user.administered_cooperatives
            coop_ids = [c.id for c in coops]
            query = Booking.query.filter(Booking.cooperative_id.in_(coop_ids))
        elif user.role in ("federation_admin", "platform_admin"):
            query = Booking.query
        else:
            query = Booking.query.filter_by(customer_id=user_id)

        if status:
            query = query.filter_by(status=status)

        bookings = query.order_by(Booking.created_at.desc()).all()
        return success_response(
            [b.to_dict() for b in bookings],
            "Bookings retrieved",
        )
    except Exception as e:
        return error_response(f"Failed to retrieve bookings: {str(e)}", 500)


@bookings_bp.route("/<int:booking_id>", methods=["GET"])
@jwt_required()
def get_booking(booking_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)
        booking = Booking.query.get(booking_id)
        if not booking:
            return error_response("Booking not found", 404)

        worker = Worker.query.filter_by(user_id=user_id).first()
        is_cooperative_admin = booking.cooperative_id in [coop.id for coop in user.administered_cooperatives]
        if not (
            booking.customer_id == user_id
            or (worker and booking.worker_id == worker.id)
            or is_cooperative_admin
            or user.role in ("federation_admin", "platform_admin")
        ):
            return error_response("Unauthorized", 403)

        data = booking.to_dict()
        if booking.worker:
            data["worker"] = booking.worker.to_dict()
        if booking.customer:
            data["customer"] = booking.customer.to_dict()
        return success_response(data, "Booking retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve booking: {str(e)}", 500)


@bookings_bp.route("/<int:booking_id>/materials", methods=["POST"])
@jwt_required()
def add_material(booking_id):
    try:
        user_id = int(get_jwt_identity())
        worker = Worker.query.filter_by(user_id=user_id).first()
        booking = Booking.query.get(booking_id)
        if not booking:
            return error_response("Booking not found", 404)
        if not worker or booking.worker_id != worker.id:
            return error_response("Only the assigned worker can add materials", 403)
        if booking.status not in ("accepted", "en_route", "service_started", "in_progress"):
            return error_response("Materials can only be added to an active booking", 409)

        data = request.get_json() or {}
        item_name = str(data.get("name", "")).strip()
        quantity = int(data.get("quantity", 1))
        estimated_cost = float(data.get("estimated_cost", data.get("unit_cost", 0)) or 0)
        if not item_name or quantity < 1 or estimated_cost < 0:
            return error_response("Material name, quantity, and a non-negative cost are required", 422)

        material = MaterialRequirement(
            booking_id=booking.id,
            worker_id=worker.id,
            item_name=item_name,
            quantity=quantity,
            estimated_cost=round(estimated_cost * quantity, 2),
            status="approved",
        )
        db.session.add(material)
        booking.material_charges = round(
            sum((item.estimated_cost or 0) for item in booking.material_requirements) + (material.estimated_cost or 0),
            2,
        )
        booking.final_amount = round((booking.total_amount or 0) + booking.material_charges, 2)
        db.session.commit()
        return success_response(booking.to_dict(), "Material added")
    except (TypeError, ValueError):
        db.session.rollback()
        return error_response("Quantity and cost must be valid numbers", 422)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to add material: {str(e)}", 500)


@bookings_bp.route("/<int:booking_id>/status", methods=["PATCH"])
@jwt_required()
def update_booking_status(booking_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        booking = Booking.query.get(booking_id)
        if not booking:
            return error_response("Booking not found", 404)

        data = request.get_json()
        if not data or "status" not in data:
            return error_response("Status is required", 400)

        new_status = str(data["status"]).strip().lower()
        if new_status == "service_completed":
            new_status = "completed"
        valid_transitions = {
            "confirmed": ["accepted", "rejected", "en_route", "cancelled"],
            "accepted": ["en_route", "cancelled"],
            "en_route": ["service_started", "in_progress", "cancelled"],
            "service_started": ["completed", "cancelled"],
            "in_progress": ["completed", "cancelled"],
        }

        current_valid = valid_transitions.get(booking.status, [])
        if new_status not in current_valid:
            return error_response(
                f"Cannot transition from '{booking.status}' to '{new_status}'",
                400,
            )

        if user.role == "worker":
            worker = Worker.query.filter_by(user_id=user_id).first()
            if not worker or worker.id != booking.worker_id:
                return error_response("Only the assigned worker can update this status", 403)
        elif user.role not in ("cooperative_admin", "federation_admin", "platform_admin"):
            return error_response("Unauthorized", 403)

        booking.status = new_status

        if new_status in ("service_started", "in_progress"):
            booking.actual_start = datetime.now(timezone.utc)
        elif new_status == "completed":
            booking.actual_end = datetime.now(timezone.utc)

        booking.updated_at = datetime.now(timezone.utc)
        service_request = ServiceRequest.query.get(booking.request_id)
        if service_request:
            service_request.status = new_status
            service_request.updated_at = datetime.now(timezone.utc)
        if new_status == "rejected":
            allocation = Allocation.query.get(booking.allocation_id) if booking.allocation_id else None
            if allocation:
                allocation.status = "rejected"
            if booking.worker_id:
                worker_profile = Worker.query.get(booking.worker_id)
                if worker_profile:
                    worker_profile.current_workload = max(0, worker_profile.current_workload - 1)
        db.session.commit()

        notif_service = NotificationService()
        notif_service.send_booking_update(booking, new_status)

        if new_status == "completed":
            sr = ServiceRequest.query.get(booking.request_id)
            if not ServiceHistory.query.filter_by(booking_id=booking.id).first():
                history = ServiceHistory(
                    customer_id=booking.customer_id,
                    worker_id=booking.worker_id,
                    cooperative_id=booking.cooperative_id,
                    booking_id=booking.id,
                    service_name=sr.service.name if sr and sr.service else None,
                    service_date=booking.service_date,
                    amount=booking.final_amount,
                )
                db.session.add(history)

            worker = Worker.query.get(booking.worker_id)
            if worker:
                worker.total_completed_services += 1
                worker.current_workload = max(0, worker.current_workload - 1)

            db.session.commit()

        return success_response(booking.to_dict(), f"Booking status updated to {new_status}")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update booking status: {str(e)}", 500)


@bookings_bp.route("/<int:booking_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_booking(booking_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        booking = Booking.query.get(booking_id)
        if not booking:
            return error_response("Booking not found", 404)

        is_cooperative_admin = booking.cooperative_id in {
            coop.id for coop in user.administered_cooperatives
        }
        if user.role == "customer" and booking.customer_id != user_id:
            return error_response("Unauthorized", 403)
        if user.role == "cooperative_admin" and not is_cooperative_admin:
            return error_response("Unauthorized", 403)
        if user.role not in ("customer", "cooperative_admin", "federation_admin", "platform_admin"):
            return error_response("Only the customer or an authorized admin can cancel this booking", 403)

        if booking.status in ("completed", "cancelled"):
            return error_response(f"Cannot cancel a {booking.status} booking", 400)

        booking.status = "cancelled"
        booking.updated_at = datetime.now(timezone.utc)

        sr = ServiceRequest.query.get(booking.request_id)
        if sr:
            sr.status = "cancelled"
            sr.updated_at = datetime.now(timezone.utc)

        if booking.worker_id:
            worker = Worker.query.get(booking.worker_id)
            if worker:
                worker.current_workload = max(0, worker.current_workload - 1)

        completed_payment = Payment.query.filter_by(
            booking_id=booking.id, status="completed"
        ).first()
        if completed_payment:
            completed_payment.status = "refund_pending"

        db.session.commit()

        notif_service = NotificationService()
        notif_service.send_booking_update(booking, "cancelled")

        return success_response(booking.to_dict(), "Booking cancelled")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to cancel booking: {str(e)}", 500)
