from datetime import datetime, timezone
from app import db


class WorkerWelfare(db.Model):
    __tablename__ = "welfare_records"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=False)
    scheme_name = db.Column(db.String(255), nullable=True)
    provider = db.Column(db.String(255), nullable=True)
    enrollment_status = db.Column(db.String(50), default="pending", nullable=False)
    coverage_details = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    emergency_contact = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    worker = db.relationship("Worker", backref="welfare_records")

    def to_dict(self):
        return {
            "id": self.id,
            "worker_id": self.worker_id,
            "scheme_name": self.scheme_name,
            "provider": self.provider,
            "enrollment_status": self.enrollment_status,
            "coverage_details": self.coverage_details,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "emergency_contact": self.emergency_contact,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
