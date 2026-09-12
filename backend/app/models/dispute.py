from datetime import datetime, timezone

from app import db


class Dispute(db.Model):
    __tablename__ = "disputes"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=True)
    raised_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    against_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    cooperative_id = db.Column(db.Integer, db.ForeignKey("cooperatives.id"), nullable=True)
    category = db.Column(db.String(80), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), default="open", nullable=False)
    resolution = db.Column(db.Text, nullable=True)
    resolved_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    booking = db.relationship("Booking", backref="disputes")
    raiser = db.relationship("User", foreign_keys=[raised_by], backref="disputes_raised")
    against_user = db.relationship("User", foreign_keys=[against_user_id])
    resolver = db.relationship("User", foreign_keys=[resolved_by])
    cooperative = db.relationship("Cooperative", backref="disputes")

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "raised_by": self.raised_by,
            "against_user_id": self.against_user_id,
            "cooperative_id": self.cooperative_id,
            "category": self.category,
            "description": self.description,
            "status": self.status,
            "resolution": self.resolution,
            "resolved_by": self.resolved_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
