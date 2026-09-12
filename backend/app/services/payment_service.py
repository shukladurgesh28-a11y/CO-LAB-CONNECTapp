import uuid
import time
from datetime import datetime, timezone
from flask import current_app
from app import db
from app.models.booking import Booking, Payment, Invoice


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

        service_charges = booking.total_amount or 0
        material_charges = booking.material_charges or 0
        
        commission_pct = 0.10
        welfare_fund_pct = 0.05
        
        commission_amount = round(service_charges * commission_pct, 2)
        welfare_amount = round(service_charges * welfare_fund_pct, 2)
        worker_payout = round(service_charges - commission_amount - welfare_amount, 2)

        tax_rate = 0.18
        tax_amount = round((service_charges + material_charges) * tax_rate, 2)
        total_amount = service_charges + material_charges + tax_amount
        net_amount = total_amount - tax_amount

        count = Invoice.query.count() + 1
        invoice_number = f"INV-{datetime.now().strftime('%Y%m')}-{count:05d}"

        invoice = Invoice(
            booking_id=booking_id,
            invoice_number=invoice_number,
            service_charges=service_charges,
            material_charges=material_charges,
            commission_amount=commission_amount,
            welfare_amount=welfare_amount,
            worker_payout=worker_payout,
            total_amount=total_amount,
            tax_amount=tax_amount,
            net_amount=net_amount,
            payment_status="pending",
        )
        db.session.add(invoice)
        db.session.commit()

        payment = Payment.query.filter_by(booking_id=booking_id, status="completed").first()
        if payment:
            invoice.payment_status = "paid"
            db.session.commit()

        return invoice
