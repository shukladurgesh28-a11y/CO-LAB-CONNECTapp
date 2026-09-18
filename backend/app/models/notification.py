from datetime import datetime, timezone
from app import db


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=True)
    type = db.Column(db.String(50), nullable=True)
    reference_type = db.Column(db.String(50), nullable=True)
    reference_id = db.Column(db.Integer, nullable=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", backref="notifications_received")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "reference_type": self.reference_type,
            "reference_id": self.reference_id,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AuditLog(db.Model):
    """Platform audit trail (Admin module 12).

    Records who performed what action, when, and on which record.
    Written by admin/governance endpoints via utils.authorization.audit().
    """

    __tablename__ = "audit_logs"
    __table_args__ = (
        db.Index("ix_audit_logs_actor", "actor_id"),
        db.Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        db.Index("ix_audit_logs_created", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    actor_role = db.Column(db.String(50), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50), nullable=True)
    entity_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    actor = db.relationship("User", backref="audit_entries")

    def to_dict(self):
        return {
            "id": self.id,
            "actor_id": self.actor_id,
            "actor_name": self.actor.name if self.actor else None,
            "actor_role": self.actor_role,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
