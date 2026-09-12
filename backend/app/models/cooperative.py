from datetime import datetime, timezone
from app import db


class Cooperative(db.Model):
    __tablename__ = "cooperatives"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    registration_number = db.Column(db.String(100), unique=True, nullable=True)
    contact_email = db.Column(db.String(255), nullable=True)
    contact_phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    service_area_km = db.Column(db.Float, default=25.0, nullable=False)
    admin_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    federation_id = db.Column(db.Integer, db.ForeignKey("federations.id"), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    admin = db.relationship("User", foreign_keys=[admin_user_id], backref="administered_cooperatives")
    federation = db.relationship("Federation", backref="cooperatives")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "registration_number": self.registration_number,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "service_area_km": self.service_area_km,
            "admin_user_id": self.admin_user_id,
            "federation_id": self.federation_id,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Federation(db.Model):
    __tablename__ = "federations"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    contact_email = db.Column(db.String(255), nullable=True)
    contact_phone = db.Column(db.String(20), nullable=True)
    admin_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    admin = db.relationship("User", foreign_keys=[admin_user_id], backref="administered_federations")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "admin_user_id": self.admin_user_id,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
