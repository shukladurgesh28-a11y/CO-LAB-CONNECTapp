from datetime import datetime, timezone
import uuid
from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.booking import Booking, Payment, Invoice
from app.services.payment_service import PaymentService
from app.services.notification_service import NotificationService
from app.utils.helpers import success_response, error_response

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")


@payments_bp.route("", methods=["POST"])
@payments_bp.route("/initiate", methods=["POST"])
@jwt_required()
def initiate_payment():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        booking_id = data.get("booking_id")
        if not booking_id:
            return error_response("Booking ID is required", 400)

        booking = Booking.query.get(booking_id)
        if not booking:
            return error_response("Booking not found", 404)

        if booking.customer_id != user_id:
            return error_response("Unauthorized", 403)

        if booking.status != "completed":
            return error_response("Payment is available only after service completion", 400)

        amount = booking.final_amount or booking.total_amount
        method = data.get("payment_method", "upi")

        payment_service = PaymentService()
        payment = payment_service.initiate_payment(booking_id, amount, method)

        message = "Payment completed in sandbox mode" if current_app.config.get("PAYMENT_MODE") == "sandbox" else "Payment initiated"
        return success_response(payment.to_dict(), message, 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to initiate payment: {str(e)}", 500)


@payments_bp.route("/<int:payment_id>", methods=["GET"])
@jwt_required()
def get_payment(payment_id):
    try:
        payment = Payment.query.get(payment_id)
        if not payment:
            return error_response("Payment not found", 404)
        user_id = int(get_jwt_identity())
        if payment.booking.customer_id != user_id:
            return error_response("Unauthorized", 403)
        return success_response(payment.to_dict(), "Payment retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve payment: {str(e)}", 500)


@payments_bp.route("/webhook", methods=["POST"])
def payment_webhook():
    try:
        payload = request.get_json()
        if not payload:
            return error_response("Payload required", 400)

        payment_service = PaymentService()
        result = payment_service.process_webhook(payload)
        return success_response(result, "Webhook processed")
    except Exception as e:
        return error_response(f"Webhook processing failed: {str(e)}", 500)


@payments_bp.route("/invoice/<int:booking_id>", methods=["GET"])
@jwt_required()
def get_invoice(booking_id):
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return error_response("Booking not found", 404)
        user = User.query.get(int(get_jwt_identity()))
        worker = __import__("app.models.worker", fromlist=["Worker"]).Worker.query.filter_by(user_id=user.id).first() if user else None
        is_admin = user and (user.role in ("federation_admin", "platform_admin") or booking.cooperative_id in {coop.id for coop in user.administered_cooperatives})
        if not (booking.customer_id == int(get_jwt_identity()) or (worker and booking.worker_id == worker.id) or is_admin):
            return error_response("Unauthorized", 403)

        invoice = Invoice.query.filter_by(booking_id=booking_id).first()
        if not invoice:
            payment_service = PaymentService()
            invoice = payment_service.generate_invoice(booking_id)

        return success_response(invoice.to_dict(), "Invoice retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve invoice: {str(e)}", 500)
