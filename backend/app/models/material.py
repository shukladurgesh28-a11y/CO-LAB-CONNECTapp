from datetime import datetime, timezone
from app import db


class MaterialRequirement(db.Model):
    __tablename__ = "material_requirements"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=False)
    item_name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    estimated_cost = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(20), default="pending", nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    booking = db.relationship("Booking", backref="material_requirements")
    worker = db.relationship("Worker", backref="material_requirements")

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "worker_id": self.worker_id,
            "item_name": self.item_name,
            "description": self.description,
            "quantity": self.quantity,
            "estimated_cost": self.estimated_cost,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
