from datetime import datetime, timezone
from app import db


class ServiceCategory(db.Model):
    __tablename__ = "service_categories"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    display_order = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    services = db.relationship("Service", backref="category", lazy=True)

    def to_dict(self, include_services=False):
        data = {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "icon": self.icon,
            "is_active": self.is_active,
            "display_order": self.display_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_services:
            data["services"] = [s.to_dict() for s in self.services if s.is_active]
        return data


class Service(db.Model):
    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    category_id = db.Column(db.Integer, db.ForeignKey("service_categories.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    required_skills = db.Column(db.JSON, nullable=True)
    optional_qualifications = db.Column(db.JSON, nullable=True)
    verification_required = db.Column(db.Boolean, default=False, nullable=False)
    availability_type = db.Column(db.String(50), default="on_demand", nullable=False)
    location_rule = db.Column(db.String(50), default="at_customer", nullable=False)
    emergency_support = db.Column(db.Boolean, default=False, nullable=False)
    base_price = db.Column(db.Float, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    service_requests = db.relationship("ServiceRequest", backref="service", lazy=True)

    def to_dict(self, include_skills=False):
        data = {
            "id": self.id,
            "category_id": self.category_id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "required_skills": self.required_skills,
            "optional_qualifications": self.optional_qualifications,
            "verification_required": self.verification_required,
            "availability_type": self.availability_type,
            "location_rule": self.location_rule,
            "emergency_support": self.emergency_support,
            "base_price": self.base_price,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_skills:
            skills = Skill.query.filter_by(category_id=self.category_id, is_active=True).all()
            data["skills"] = [s.to_dict() for s in skills]
        return data


class Skill(db.Model):
    __tablename__ = "skills"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("service_categories.id"), nullable=True)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "category_id": self.category_id,
            "description": self.description,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
