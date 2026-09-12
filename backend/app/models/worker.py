from datetime import datetime, timezone
from app import db


class Worker(db.Model):
    __tablename__ = "workers"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    cooperative_id = db.Column(db.Integer, db.ForeignKey("cooperatives.id"), nullable=True)
    name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(255), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    service_area_km = db.Column(db.Float, default=10.0, nullable=False)
    verification_status = db.Column(
        db.Enum("pending", "verified", "rejected", name="verification_status"),
        default="pending",
        nullable=False,
    )
    verification_date = db.Column(db.DateTime, nullable=True)
    verification_notes = db.Column(db.Text, nullable=True)
    profile_photo = db.Column(db.String(512), nullable=True)
    experience_years = db.Column(db.Integer, default=0, nullable=False)
    current_workload = db.Column(db.Integer, default=0, nullable=False)
    max_workload = db.Column(db.Integer, default=5, nullable=False)
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    total_completed_services = db.Column(db.Integer, default=0, nullable=False)
    average_rating = db.Column(db.Float, default=0.0, nullable=False)
    bio = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    skills = db.relationship("WorkerSkill", backref="worker", lazy=True, cascade="all, delete-orphan")
    certifications = db.relationship("WorkerCertification", backref="worker", lazy=True, cascade="all, delete-orphan")
    availabilities = db.relationship("WorkerAvailability", backref="worker", lazy=True, cascade="all, delete-orphan")
    cooperative = db.relationship("Cooperative", backref="workers")

    def to_dict(self, include_details=False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "cooperative_id": self.cooperative_id,
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "service_area_km": self.service_area_km,
            "verification_status": self.verification_status,
            "profile_photo": self.profile_photo,
            "experience_years": self.experience_years,
            "current_workload": self.current_workload,
            "max_workload": self.max_workload,
            "is_available": self.is_available,
            "total_completed_services": self.total_completed_services,
            "average_rating": self.average_rating,
            "bio": self.bio,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_details:
            data["skills"] = [s.to_dict() for s in self.skills]
            data["certifications"] = [c.to_dict() for c in self.certifications]
            data["availabilities"] = [a.to_dict() for a in self.availabilities]
        return data


class WorkerSkill(db.Model):
    __tablename__ = "worker_skills"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey("skills.id"), nullable=False)
    proficiency = db.Column(
        db.Enum("beginner", "intermediate", "expert", name="proficiency_level"),
        default="intermediate",
        nullable=False,
    )
    years_experience = db.Column(db.Integer, default=0, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    skill = db.relationship("Skill", backref="worker_skills")

    def to_dict(self):
        return {
            "id": self.id,
            "worker_id": self.worker_id,
            "skill_id": self.skill_id,
            "skill_name": self.skill.name if self.skill else None,
            "proficiency": self.proficiency,
            "years_experience": self.years_experience,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class WorkerCertification(db.Model):
    __tablename__ = "worker_certifications"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey("skills.id"), nullable=True)
    certification_name = db.Column(db.String(255), nullable=False)
    issuing_authority = db.Column(db.String(255), nullable=False)
    issue_date = db.Column(db.Date, nullable=True)
    expiry_date = db.Column(db.Date, nullable=True)
    document_url = db.Column(db.String(512), nullable=True)
    verification_status = db.Column(
        db.Enum("pending", "verified", "rejected", name="cert_verification_status"),
        default="pending",
        nullable=False,
    )
    verified_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    skill = db.relationship("Skill", backref="certifications")
    verifier = db.relationship("User", foreign_keys=[verified_by])

    def to_dict(self):
        return {
            "id": self.id,
            "worker_id": self.worker_id,
            "skill_id": self.skill_id,
            "certification_name": self.certification_name,
            "issuing_authority": self.issuing_authority,
            "issue_date": self.issue_date.isoformat() if self.issue_date else None,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "document_url": self.document_url,
            "verification_status": self.verification_status,
            "verified_by": self.verified_by,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class WorkerAvailability(db.Model):
    __tablename__ = "availability"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    effective_from = db.Column(db.Date, nullable=True)
    effective_until = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "worker_id": self.worker_id,
            "day_of_week": self.day_of_week,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "is_available": self.is_available,
            "effective_from": self.effective_from.isoformat() if self.effective_from else None,
            "effective_until": self.effective_until.isoformat() if self.effective_until else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
