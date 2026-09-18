"""Society Workforce Requirement models (cooperative-first bulk hiring).

A Society (cooperative) requests MULTIPLE worker categories with different
quantities and durations as ONE requirement. The Labour Cooperative
Federation reviews, AI assists matching, and the cooperative/federation
retains final allocation authority. Workers accept/decline; partial
fulfillment stays open for reassignment.
"""

from datetime import datetime, timezone
from app import db


REQUIREMENT_STATUSES = (
    "DRAFT", "SUBMITTED", "UNDER_REVIEW", "MATCHING",
    "PARTIALLY_FULFILLED", "FULLY_FULFILLED", "WORK_IN_PROGRESS",
    "COMPLETED", "CANCELLED", "EXPIRED",
)

ITEM_STATUSES = ("PENDING", "PARTIALLY_FULFILLED", "FULLY_FULFILLED", "CANCELLED")

ALLOCATION_STATUSES = ("offered", "accepted", "declined", "completed", "cancelled")

WORK_TYPES = (
    "Maintenance", "Construction", "Cleaning", "Repair",
    "Event", "Regular Operations", "Other",
)


def _inclusive_days(start_date, end_date):
    if not start_date or not end_date or end_date < start_date:
        return 0
    return (end_date - start_date).days + 1


class WorkforceRequirement(db.Model):
    __tablename__ = "society_workforce_requirements"
    __table_args__ = (
        db.Index("ix_workforce_requirements_coop", "cooperative_id"),
        db.Index("ix_workforce_requirements_federation", "federation_id"),
        db.Index("ix_workforce_requirements_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    cooperative_id = db.Column(db.Integer, db.ForeignKey("cooperatives.id"), nullable=False)
    federation_id = db.Column(db.Integer, db.ForeignKey("federations.id"), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    work_type = db.Column(db.String(50), default="Other", nullable=False)
    location_address = db.Column(db.String(500), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    daily_start_time = db.Column(db.Time, nullable=True)
    daily_end_time = db.Column(db.Time, nullable=True)
    break_minutes = db.Column(db.Integer, default=60, nullable=False)
    flexible_timing = db.Column(db.Boolean, default=False, nullable=False)
    working_days = db.Column(db.JSON, nullable=True)
    status = db.Column(db.String(30), default="DRAFT", nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    items = db.relationship("WorkforceItem", backref="requirement", lazy=True,
                            cascade="all, delete-orphan")
    cooperative = db.relationship("Cooperative", backref="workforce_requirements")

    # -- computed summaries (single source; never stored) -------------------
    @property
    def duration_days(self):
        return _inclusive_days(self.start_date, self.end_date)

    @property
    def total_workers_required(self):
        return sum((i.quantity_required or 0) for i in self.items)

    @property
    def total_worker_days(self):
        return sum((i.quantity_required or 0) * i.duration_days for i in self.items)

    @property
    def workers_accepted(self):
        return sum(i.accepted_count for i in self.items)

    @property
    def workers_remaining(self):
        return max(0, self.total_workers_required - self.workers_accepted)

    def refresh_status(self):
        """Derive workflow status from items (call after allocation changes)."""
        if self.status in ("DRAFT", "SUBMITTED", "UNDER_REVIEW", "MATCHING", "CANCELLED", "EXPIRED", "COMPLETED"):
            return self.status
        active = [i for i in self.items if i.status != "CANCELLED"]
        if not active:
            return self.status
        if all(i.status == "FULLY_FULFILLED" for i in active):
            self.status = "FULLY_FULFILLED"
        elif any(i.status in ("PARTIALLY_FULFILLED", "FULLY_FULFILLED") for i in active):
            self.status = "PARTIALLY_FULFILLED"
        return self.status

    def to_dict(self, include_items=False):
        data = {
            "id": self.id,
            "cooperative_id": self.cooperative_id,
            "cooperative_name": self.cooperative.name if self.cooperative else None,
            "federation_id": self.federation_id,
            "created_by": self.created_by,
            "title": self.title,
            "description": self.description,
            "work_type": self.work_type,
            "location_address": self.location_address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "duration_days": self.duration_days,
            "daily_start_time": str(self.daily_start_time) if self.daily_start_time else None,
            "daily_end_time": str(self.daily_end_time) if self.daily_end_time else None,
            "break_minutes": self.break_minutes,
            "flexible_timing": self.flexible_timing,
            "working_days": self.working_days,
            "status": self.status,
            "total_worker_types": len(self.items),
            "total_workers_required": self.total_workers_required,
            "total_worker_days": self.total_worker_days,
            "workers_accepted": self.workers_accepted,
            "workers_remaining": self.workers_remaining,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_items:
            data["items"] = [i.to_dict(include_allocations=True) for i in self.items]
        return data


class WorkforceItem(db.Model):
    __tablename__ = "society_workforce_items"
    __table_args__ = (
        db.Index("ix_workforce_items_requirement", "requirement_id"),
        db.Index("ix_workforce_items_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    requirement_id = db.Column(db.Integer, db.ForeignKey("society_workforce_requirements.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    quantity_required = db.Column(db.Integer, nullable=False, default=1)
    skill_requirement = db.Column(db.String(255), nullable=True)
    minimum_experience = db.Column(db.Integer, default=0, nullable=False)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    working_hours_per_day = db.Column(db.Float, default=8.0, nullable=False)
    priority = db.Column(db.String(20), default="normal", nullable=False)
    special_requirements = db.Column(db.Text, nullable=True)
    gender_preference = db.Column(db.String(20), nullable=True)
    accommodation_required = db.Column(db.Boolean, default=False, nullable=False)
    equipment_provided = db.Column(db.Boolean, default=False, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), default="PENDING", nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    allocations = db.relationship("WorkforceAllocation", backref="item", lazy=True,
                                  cascade="all, delete-orphan")
    service = db.relationship("Service", backref="workforce_items")

    @property
    def duration_days(self):
        return _inclusive_days(self.start_date, self.end_date)

    @property
    def worker_days(self):
        return (self.quantity_required or 0) * self.duration_days

    @property
    def accepted_count(self):
        return sum(1 for a in self.allocations if a.status in ("accepted", "completed"))

    @property
    def allocated_count(self):
        return sum(1 for a in self.allocations if a.status in ("offered", "accepted", "completed"))

    def refresh_status(self):
        if self.status == "CANCELLED":
            return self.status
        need = self.quantity_required or 0
        got = self.accepted_count
        if need > 0 and got >= need:
            self.status = "FULLY_FULFILLED"
        elif got > 0:
            self.status = "PARTIALLY_FULFILLED"
        else:
            self.status = "PENDING"
        return self.status

    def to_dict(self, include_allocations=False):
        data = {
            "id": self.id,
            "requirement_id": self.requirement_id,
            "service_id": self.service_id,
            "service_name": self.service.name if self.service else None,
            "quantity_required": self.quantity_required,
            "skill_requirement": self.skill_requirement,
            "minimum_experience": self.minimum_experience,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "duration_days": self.duration_days,
            "worker_days": self.worker_days,
            "working_hours_per_day": self.working_hours_per_day,
            "priority": self.priority,
            "special_requirements": self.special_requirements,
            "gender_preference": self.gender_preference,
            "accommodation_required": self.accommodation_required,
            "equipment_provided": self.equipment_provided,
            "notes": self.notes,
            "status": self.status,
            "allocated_count": self.allocated_count,
            "accepted_count": self.accepted_count,
            "remaining": max(0, (self.quantity_required or 0) - self.accepted_count),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_allocations:
            data["allocations"] = [a.to_dict() for a in self.allocations]
        return data


class WorkforceAllocation(db.Model):
    __tablename__ = "worker_allocations"
    __table_args__ = (
        db.UniqueConstraint("workforce_item_id", "worker_id", name="uq_workforce_alloc_item_worker"),
        db.Index("ix_workforce_alloc_worker", "worker_id"),
        db.Index("ix_workforce_alloc_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    workforce_item_id = db.Column(db.Integer, db.ForeignKey("society_workforce_items.id"), nullable=False)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=False)
    allocated_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    status = db.Column(db.String(20), default="offered", nullable=False)
    worker_response = db.Column(db.Text, nullable=True)
    offered_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    responded_at = db.Column(db.DateTime, nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)

    worker = db.relationship("Worker", backref="workforce_allocations")

    def to_dict(self):
        return {
            "id": self.id,
            "workforce_item_id": self.workforce_item_id,
            "requirement_id": self.item.requirement_id if self.item else None,
            "worker_id": self.worker_id,
            "worker_name": self.worker.name if self.worker else None,
            "worker_phone": self.worker.phone if self.worker else None,
            "service_name": self.item.service.name if self.item and self.item.service else None,
            "allocated_by": self.allocated_by,
            "status": self.status,
            "worker_response": self.worker_response,
            "offered_at": self.offered_at.isoformat() if self.offered_at else None,
            "responded_at": self.responded_at.isoformat() if self.responded_at else None,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
        }
