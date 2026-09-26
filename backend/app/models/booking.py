from datetime import datetime, timezone
from app import db
from app.utils.helpers import money_float


class ServiceRequest(db.Model):
    __tablename__ = "service_requests"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    cooperative_id = db.Column(db.Integer, db.ForeignKey("cooperatives.id"), nullable=True)
    description = db.Column(db.Text, nullable=True)
    location_address = db.Column(db.String(500), nullable=True)
    location_lat = db.Column(db.Float, nullable=True)
    location_lng = db.Column(db.Float, nullable=True)
    preferred_date = db.Column(db.Date, nullable=True)
    preferred_time_start = db.Column(db.Time, nullable=True)
    preferred_time_end = db.Column(db.Time, nullable=True)
    urgency = db.Column(db.String(20), default="normal", nullable=False)
    special_requirements = db.Column(db.JSON, nullable=True)
    status = db.Column(db.String(20), default="pending", nullable=False)
    allocated_worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=True)
    allocation_id = db.Column(db.Integer, db.ForeignKey("allocations.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    customer = db.relationship("User", backref="service_requests")
    cooperative = db.relationship("Cooperative", backref="service_requests")
    allocated_worker = db.relationship("Worker", backref="allocated_requests")
    allocation = db.relationship(
        "Allocation",
        foreign_keys="[Allocation.request_id]",
        backref=db.backref("service_request", uselist=False, foreign_keys="[Allocation.request_id]"),
        uselist=False,
        lazy=True,
    )
    bookings = db.relationship("Booking", backref="request", lazy=True)

    def to_dict(self):
        booking = self.bookings[0] if self.bookings else None
        return {
            "id": self.id,
            "booking_id": booking.id if booking else None,
            "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else None,
            "service_id": self.service_id,
            "cooperative_id": self.cooperative_id,
            "description": self.description,
            "location_address": self.location_address,
            "location_lat": self.location_lat,
            "location_lng": self.location_lng,
            "preferred_date": self.preferred_date.isoformat() if self.preferred_date else None,
            "preferred_time_start": str(self.preferred_time_start) if self.preferred_time_start else None,
            "preferred_time_end": str(self.preferred_time_end) if self.preferred_time_end else None,
            "urgency": self.urgency,
            "special_requirements": self.special_requirements,
            "status": self.status,
            "allocated_worker_id": self.allocated_worker_id,
            "allocated_worker": self.allocated_worker.to_dict() if self.allocated_worker else None,
            "allocation_id": self.allocation_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "service_name": self.service.name if self.service else None,
            "total_amount": booking.total_amount if booking else (self.service.base_price if self.service else None),
            "final_amount": booking.final_amount if booking else None,
            "financials": booking.to_dict().get("financials") if booking else None,
            "rating": booking.rating.to_dict() if booking and booking.rating else None,
            "payment_status": booking.to_dict().get("payment_status") if booking else "pending",
            "candidate_rankings": (self.special_requirements or {}).get("candidate_rankings", []) if isinstance(self.special_requirements, dict) else [],
        }


class Allocation(db.Model):
    __tablename__ = "allocations"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    request_id = db.Column(db.Integer, db.ForeignKey("service_requests.id"), nullable=False)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=False)
    cooperative_id = db.Column(db.Integer, db.ForeignKey("cooperatives.id"), nullable=False)
    admin_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    recommendation_score = db.Column(db.Float, nullable=True)
    allocation_reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="recommended", nullable=False)
    allocated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    worker = db.relationship("Worker", backref="allocations")
    cooperative = db.relationship("Cooperative", backref="allocations")
    admin_user = db.relationship("User", backref="allocations_made")
    bookings = db.relationship("Booking", foreign_keys="[Booking.allocation_id]", backref="allocation", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "worker_id": self.worker_id,
            "cooperative_id": self.cooperative_id,
            "admin_user_id": self.admin_user_id,
            "recommendation_score": self.recommendation_score,
            "allocation_reason": self.allocation_reason,
            "status": self.status,
            "allocated_at": self.allocated_at.isoformat() if self.allocated_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Booking(db.Model):
    __tablename__ = "bookings"
    __table_args__ = (
        db.UniqueConstraint("request_id", name="uq_bookings_request_id"),
        db.UniqueConstraint("allocation_id", name="uq_bookings_allocation_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    request_id = db.Column(db.Integer, db.ForeignKey("service_requests.id"), nullable=False)
    allocation_id = db.Column(db.Integer, db.ForeignKey("allocations.id"), nullable=True)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    cooperative_id = db.Column(db.Integer, db.ForeignKey("cooperatives.id"), nullable=False)
    service_date = db.Column(db.Date, nullable=True)
    time_start = db.Column(db.Time, nullable=True)
    time_end = db.Column(db.Time, nullable=True)
    status = db.Column(db.String(20), default="confirmed", nullable=False)
    actual_start = db.Column(db.DateTime, nullable=True)
    actual_end = db.Column(db.DateTime, nullable=True)
    total_amount = db.Column(db.Numeric(12, 2), nullable=True)
    material_charges = db.Column(db.Numeric(12, 2), default=0.0, nullable=True)
    final_amount = db.Column(db.Numeric(12, 2), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    worker = db.relationship("Worker", backref="bookings")
    customer = db.relationship("User", backref="bookings")
    cooperative = db.relationship("Cooperative", backref="bookings")
    payments = db.relationship("Payment", backref="booking", lazy=True)
    invoice = db.relationship("Invoice", backref="booking", uselist=False)
    rating = db.relationship("Rating", backref="booking", uselist=False)

    def to_dict(self):
        payment = next((item for item in reversed(self.payments) if item.status not in ("failed",)), None)
        invoice = self.invoice
        if invoice:
            financials = invoice.to_dict()
        elif self.total_amount:
            try:
                from flask import current_app
                from app.services.pricing import compute_invoice
                c_rate = current_app.config.get("COMMISSION_RATE", 0.10) if current_app else 0.10
                t_rate = current_app.config.get("TAX_RATE", 0.0) if current_app else 0.0
                parts = compute_invoice(
                    service_amount=self.total_amount,
                    material_charges=self.material_charges or 0,
                    commission_rate=c_rate,
                    tax_rate=t_rate,
                )
                financials = {
                    "service_charges": float(parts["service_amount"]),
                    "material_charges": float(parts["material_charges"]),
                    "commission_amount": float(parts["commission_amount"]),
                    "worker_payout": float(parts["worker_payout"]),
                    "total_amount": float(parts["net_amount"]),
                    "tax_amount": float(parts["tax_amount"]),
                    "net_amount": float(parts["net_amount"]),
                    "payment_status": "paid" if payment and payment.status == "completed" else "pending",
                }
            except Exception:
                financials = None
        else:
            financials = None

        candidate_rankings = []
        if self.request and isinstance(self.request.special_requirements, dict):
            candidate_rankings = self.request.special_requirements.get("candidate_rankings", [])

        return {
            "id": self.id,
            "request_id": self.request_id,
            "allocation_id": self.allocation_id,
            "worker_id": self.worker_id,
            "customer_id": self.customer_id,
            "cooperative_id": self.cooperative_id,
            "service_date": self.service_date.isoformat() if self.service_date else None,
            "time_start": str(self.time_start) if self.time_start else None,
            "time_end": str(self.time_end) if self.time_end else None,
            "status": self.status,
            "actual_start": self.actual_start.isoformat() if self.actual_start else None,
            "actual_end": self.actual_end.isoformat() if self.actual_end else None,
            "total_amount": money_float(self.total_amount),
            "material_charges": money_float(self.material_charges),
            "final_amount": money_float(self.final_amount),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "service_name": self.request.service.name if self.request and self.request.service else None,
            "location_address": self.request.location_address if self.request else None,
            "description": self.request.description if self.request else None,
            "urgency": self.request.urgency if self.request else None,
            "customer_name": self.customer.name if self.customer else None,
            "worker_name": self.worker.name if self.worker else None,
            "cooperative_name": self.cooperative.name if self.cooperative else None,
            "payment_status": "paid" if payment and payment.status == "completed" else (payment.status if payment else "pending"),
            "payment": payment.to_dict() if payment else None,
            "financials": financials,
            "materials": [item.to_dict() for item in self.material_requirements],
            "rating": self.rating.to_dict() if self.rating else None,
            "candidate_rankings": candidate_rankings,
        }


class MatchingRecommendation(db.Model):
    """Auditable snapshot of the AI recommendation shown to the coop admin.

    Candidate rankings must NOT live only inside
    ``ServiceRequest.special_requirements``; every recommendation is stored
    here with its full score breakdown (Phase 9).
    """

    __tablename__ = "matching_recommendations"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    request_id = db.Column(db.Integer, db.ForeignKey("service_requests.id"), nullable=False)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=False)
    score = db.Column(db.Float, nullable=False)
    skill_score = db.Column(db.Float, nullable=True)
    qualification_score = db.Column(db.Float, nullable=True)
    location_score = db.Column(db.Float, nullable=True)
    availability_score = db.Column(db.Float, nullable=True)
    experience_score = db.Column(db.Float, nullable=True)
    workload_score = db.Column(db.Float, nullable=True)
    fairness_score = db.Column(db.Float, nullable=True)
    rating_score = db.Column(db.Float, nullable=True)
    explanation = db.Column(db.Text, nullable=True)
    rank = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "worker_id": self.worker_id,
            "score": self.score,
            "skill_score": self.skill_score,
            "qualification_score": self.qualification_score,
            "location_score": self.location_score,
            "availability_score": self.availability_score,
            "experience_score": self.experience_score,
            "workload_score": self.workload_score,
            "fairness_score": self.fairness_score,
            "rating_score": self.rating_score,
            "explanation": self.explanation,
            "rank": self.rank,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AllocationOffer(db.Model):
    """2-minute worker allocation offer with server-side timeout (Phase 8).

    One active (``offered``) offer per request at most. Expiry releases the
    worker opportunity and returns the request to the allocation queue.
    All timestamps are server time (naive UTC, SQLite-safe).
    """

    __tablename__ = "allocation_offers"

    OFFER_TTL_SECONDS = 120

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    request_id = db.Column(db.Integer, db.ForeignKey("service_requests.id"), nullable=False)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=False)
    allocation_id = db.Column(db.Integer, db.ForeignKey("allocations.id"), nullable=True)
    status = db.Column(db.String(20), default="offered", nullable=False)
    offered_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime, nullable=False)
    accepted_at = db.Column(db.DateTime, nullable=True)
    rejected_at = db.Column(db.DateTime, nullable=True)
    timeout_at = db.Column(db.DateTime, nullable=True)
    response_reason = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "worker_id": self.worker_id,
            "allocation_id": self.allocation_id,
            "status": self.status,
            "offered_at": self.offered_at.isoformat() if self.offered_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "accepted_at": self.accepted_at.isoformat() if self.accepted_at else None,
            "rejected_at": self.rejected_at.isoformat() if self.rejected_at else None,
            "timeout_at": self.timeout_at.isoformat() if self.timeout_at else None,
            "response_reason": self.response_reason,
        }


class Settlement(db.Model):
    """Settlement ledger separating completion/invoice/payment/settlement
    (Phase 13). One row per booking; created when the booking completes."""

    __tablename__ = "settlements"
    __table_args__ = (
        db.UniqueConstraint("booking_id", name="uq_settlements_booking_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=True)
    gross_amount = db.Column(db.Numeric(12, 2), nullable=True)
    commission = db.Column(db.Numeric(12, 2), nullable=True)
    worker_payout = db.Column(db.Numeric(12, 2), nullable=True)
    status = db.Column(db.String(20), default="pending", nullable=False)
    settled_at = db.Column(db.DateTime, nullable=True)
    transaction_reference = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "invoice_id": self.invoice_id,
            "gross_amount": money_float(self.gross_amount),
            "commission": money_float(self.commission),
            "worker_payout": money_float(self.worker_payout),
            "status": self.status,
            "settled_at": self.settled_at.isoformat() if self.settled_at else None,
            "transaction_reference": self.transaction_reference,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    payment_method = db.Column(db.String(50), nullable=True)
    transaction_reference = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default="pending", nullable=False)
    paid_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "amount": money_float(self.amount),
            "payment_method": self.payment_method,
            "transaction_reference": self.transaction_reference,
            "status": self.status,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False)
    __table_args__ = (
        db.UniqueConstraint("booking_id", name="uq_invoices_booking_id"),
    )
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    service_charges = db.Column(db.Numeric(12, 2), nullable=True)
    material_charges = db.Column(db.Numeric(12, 2), nullable=True)
    commission_amount = db.Column(db.Numeric(12, 2), nullable=True)
    worker_payout = db.Column(db.Numeric(12, 2), nullable=True)
    total_amount = db.Column(db.Numeric(12, 2), nullable=True)
    tax_amount = db.Column(db.Numeric(12, 2), nullable=True)
    net_amount = db.Column(db.Numeric(12, 2), nullable=True)
    payment_status = db.Column(db.String(20), default="pending", nullable=False)
    issued_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "invoice_number": self.invoice_number,
            "service_charges": money_float(self.service_charges),
            "material_charges": money_float(self.material_charges),
            "commission_amount": money_float(self.commission_amount),
            "worker_payout": money_float(self.worker_payout),
            "total_amount": money_float(self.total_amount),
            "tax_amount": money_float(self.tax_amount),
            "net_amount": money_float(self.net_amount),
            "payment_status": self.payment_status,
            "issued_at": self.issued_at.isoformat() if self.issued_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Rating(db.Model):
    __tablename__ = "ratings"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False)
    __table_args__ = (
        db.UniqueConstraint("booking_id", name="uq_ratings_booking_id"),
    )
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    feedback = db.Column(db.Text, nullable=True)
    service_quality = db.Column(db.Integer, nullable=True)
    punctuality = db.Column(db.Integer, nullable=True)
    professionalism = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    customer = db.relationship("User", backref="ratings_given")
    worker = db.relationship("Worker", backref="ratings_received")

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "customer_id": self.customer_id,
            "worker_id": self.worker_id,
            "rating": self.rating,
            "feedback": self.feedback,
            "service_quality": self.service_quality,
            "punctuality": self.punctuality,
            "professionalism": self.professionalism,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ServiceHistory(db.Model):
    __tablename__ = "service_history"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=False)
    cooperative_id = db.Column(db.Integer, db.ForeignKey("cooperatives.id"), nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False)
    __table_args__ = (
        db.UniqueConstraint("booking_id", name="uq_service_history_booking_id"),
    )
    service_name = db.Column(db.String(255), nullable=True)
    service_date = db.Column(db.Date, nullable=True)
    amount = db.Column(db.Numeric(12, 2), nullable=True)
    rating = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    customer = db.relationship("User", backref="service_history")
    worker = db.relationship("Worker", backref="service_history")
    cooperative = db.relationship("Cooperative", backref="service_history")
    booking = db.relationship("Booking", backref="service_history")

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "worker_id": self.worker_id,
            "cooperative_id": self.cooperative_id,
            "booking_id": self.booking_id,
            "service_name": self.service_name,
            "service_date": self.service_date.isoformat() if self.service_date else None,
            "amount": money_float(self.amount),
            "rating": self.rating,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
