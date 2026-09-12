from datetime import datetime, timezone
from app import db


class DemandRecord(db.Model):
    __tablename__ = "demand_records"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    cooperative_id = db.Column(db.Integer, db.ForeignKey("cooperatives.id"), nullable=False)
    region = db.Column(db.String(255), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    request_count = db.Column(db.Integer, default=0, nullable=False)
    fulfilled_count = db.Column(db.Integer, default=0, nullable=False)
    unmet_count = db.Column(db.Integer, default=0, nullable=False)
    avg_response_time = db.Column(db.Float, nullable=True)
    period_start = db.Column(db.Date, nullable=True)
    period_end = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    service = db.relationship("Service", backref="demand_records")
    cooperative = db.relationship("Cooperative", backref="demand_records")

    def to_dict(self):
        return {
            "id": self.id,
            "service_id": self.service_id,
            "cooperative_id": self.cooperative_id,
            "region": self.region,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "request_count": self.request_count,
            "fulfilled_count": self.fulfilled_count,
            "unmet_count": self.unmet_count,
            "avg_response_time": self.avg_response_time,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
