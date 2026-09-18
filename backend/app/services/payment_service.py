import uuid
import time
from datetime import datetime, timezone
from flask import current_app
from app import db
from app.models.booking import Booking, Payment, Invoice
from app.services.pricing import compute_invoice


class PaymentService:
    def initiate_payment(self, booking_id, amount, method="upi"):
        booking = Booking.query.get(booking_id)
        if not booking:
            raise ValueError("Booking not found")
        if booking.status != "completed":
            raise ValueError("Payment is available only after service completion")
        if amount is None or float(amount) <= 0:
            raise ValueError("A positive payment amount is required")

        existing_completed = Payment.query.filter_by(
            booking_id=booking_id, status="completed"
        ).first()
        if existing_completed:
            return existing_completed

        existing = Payment.query.filter_by(
            booking_id=booking_id, status="pending"
        ).first()
        if existing:
            existing.amount = amount
            existing.payment_method = method
            db.session.commit()
            return existing

        payment = Payment(
            booking_id=booking_id,
            amount=amount,
            payment_method=method,
            transaction_reference=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            status="pending",
        )
        db.session.add(payment)
        db.session.commit()

        if current_app.config.get("PAYMENT_MODE", "sandbox") == "sandbox":
            self._simulate_gateway(payment)

        return payment

    def _simulate_gateway(self, payment):
        payment.status = "processing"
        db.session.commit()
        payment.status = "completed"
        payment.paid_at = datetime.now(timezone.utc)
        db.session.commit()
        self.generate_invoice(payment.booking_id)

    def process_webhook(self, payload):
        txn_ref = payload.get("transaction_reference")
        status = payload.get("status")

        if not txn_ref or not status:
            raise ValueError("transaction_reference and status are required")

        payment = Payment.query.filter_by(transaction_reference=txn_ref).first()
        if not payment:
            raise ValueError(f"Payment not found for reference: {txn_ref}")

        status_map = {
            "success": "completed",
            "failed": "failed",
            "processing": "processing",
        }
        normalized_status = status_map.get(status, status)
        if payment.status in ("completed", "refunded") and normalized_status != payment.status:
            return payment.to_dict()
        payment.status = normalized_status

        if payment.status == "completed":
            payment.paid_at = datetime.now(timezone.utc)
        elif payment.status == "failed":
            payment.paid_at = None

        if payment.status == "completed" and not Invoice.query.filter_by(booking_id=payment.booking_id).first():
            self.generate_invoice(payment.booking_id)

        db.session.commit()
        return payment.to_dict()

    def generate_invoice(self, booking_id):
        booking = Booking.query.get(booking_id)
        if not booking:
            raise ValueError("Booking not found")

        existing = Invoice.query.filter_by(booking_id=booking_id).first()
        if existing:
            return existing

        parts = compute_invoice(
            service_amount=booking.total_amount or 0,
            material_charges=booking.material_charges or 0,
            commission_rate=current_app.config.get("COMMISSION_RATE", 0.10),
            welfare_rate=current_app.config.get("WELFARE_RATE", 0.02),
            tax_rate=current_app.config.get("TAX_RATE", 0.0),
            commission_applies_to_material=current_app.config.get(
                "COMMISSION_INCLUDE_MATERIAL", False
            ),
        )

        invoice = Invoice(
            booking_id=booking_id,
            invoice_number=self._next_invoice_number(),
            service_charges=float(parts["service_amount"]),
            material_charges=float(parts["material_charges"]),
            commission_amount=float(parts["commission_amount"]),
            welfare_amount=float(parts["welfare_amount"]),
            worker_payout=float(parts["worker_payout"]),
            total_amount=float(parts["net_amount"]),
            tax_amount=float(parts["tax_amount"]),
            net_amount=float(parts["net_amount"]),
            payment_status="pending",
        )
        db.session.add(invoice)
        db.session.commit()

        payment = Payment.query.filter_by(booking_id=booking_id, status="completed").first()
        if payment:
            invoice.payment_status = "paid"
            db.session.commit()

        return invoice

    def _next_invoice_number(self):
        prefix = "INV-{0}-".format(datetime.now(timezone.utc).strftime("%Y%m"))
        last = (
            Invoice.query.filter(Invoice.invoice_number.like(prefix + "%"))
            .order_by(Invoice.invoice_number.desc())
            .first()
        )
        sequence = int(last.invoice_number.rsplit("-", 1)[-1]) + 1 if last else 1
        return "{0}{1:05d}".format(prefix, sequence)
