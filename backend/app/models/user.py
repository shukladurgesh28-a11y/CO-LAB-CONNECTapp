import bcrypt
import hashlib
import hmac
from datetime import datetime, timezone
from app import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), unique=True, nullable=True)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.Enum("customer", "worker", "cooperative_admin", "federation_admin", "platform_admin", name="user_role"),
        nullable=False,
        default="customer",
    )
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    language_preference = db.Column(db.String(10), default="en", nullable=False)

    worker_profile = db.relationship("Worker", backref="user", uselist=False, lazy=True)
    notifications = db.relationship("Notification", backref="recipient", lazy=True)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def check_password(self, password):
        return bcrypt.checkpw(password.encode("utf-8"), self.password_hash.encode("utf-8"))

    def to_dict(self):
        data = {
            "id": self.id,
            "email": self.email,
            "phone": self.phone,
            "name": self.name,
            "role": self.role,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "language_preference": self.language_preference,
        }
        if self.worker_profile:
            data["worker_profile_id"] = self.worker_profile.id
        return data


class OtpChallenge(db.Model):
    """Persistent OTP challenge storage (Phase 3).

    OTPs must NOT live only in Python process memory: a server restart or a
    second gunicorn worker must not lose or bypass verification state.
    Only the SHA-256 hash is stored; plaintext OTPs are never persisted and
    are only echoed back when OTP_EXPOSE_IN_RESPONSE is enabled (dev only).
    """

    __tablename__ = "otp_challenges"
    __table_args__ = (
        db.Index("ix_otp_challenges_phone", "phone"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    otp_hash = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    attempts = db.Column(db.Integer, default=0, nullable=False)
    max_attempts = db.Column(db.Integer, default=5, nullable=False)
    last_sent_at = db.Column(db.DateTime, nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = db.relationship("User", backref="otp_challenges")

    @staticmethod
    def hash_otp(otp):
        return hashlib.sha256(str(otp).encode("utf-8")).hexdigest()

    def check_otp(self, otp):
        return hmac.compare_digest(self.otp_hash, OtpChallenge.hash_otp(otp))
