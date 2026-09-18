"""Reusable RBAC / authorization helpers (Phase 4).

Every sensitive backend endpoint must verify authentication, role, resource
ownership, and organizational scope. Never rely only on frontend role
protection. Import these helpers in new routes; existing routes keep their
inline checks (verified equivalent) to avoid regressions.
"""

from functools import wraps

from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.models.user import User
from app.models.worker import Worker
from app.utils.helpers import error_response

CUSTOMER = "customer"
WORKER = "worker"
COOP_ADMIN = "cooperative_admin"
FED_ADMIN = "federation_admin"
PLATFORM_ADMIN = "platform_admin"

ELEVATED = (COOP_ADMIN, FED_ADMIN, PLATFORM_ADMIN)


def current_user():
    try:
        return User.query.get(int(get_jwt_identity()))
    except (ValueError, TypeError):
        return None


def require_roles(*roles):
    """Refuse any authenticated user whose role is not listed."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = current_user()
            if not user:
                return error_response("User not found", 404)
            if user.role not in roles:
                return error_response("Forbidden for role '%s'" % user.role, 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def worker_profile_for(user):
    if user is None or user.role != WORKER:
        return None
    return Worker.query.filter_by(user_id=user.id).first()


def coop_ids_for(user):
    """Cooperative IDs the user administers (empty for non-admins)."""
    if user is None or user.role != COOP_ADMIN:
        return []
    return [c.id for c in user.administered_cooperatives]


def can_access_booking(user, booking):
    """Customer owns it, worker is assigned, coop admin scopes, fed/platform all."""
    if user is None or booking is None:
        return False
    if user.role in (FED_ADMIN, PLATFORM_ADMIN):
        return True
    if user.role == CUSTOMER and booking.customer_id == user.id:
        return True
    if user.role == WORKER:
        profile = worker_profile_for(user)
        if profile and booking.worker_id == profile.id:
            return True
    if user.role == COOP_ADMIN and booking.cooperative_id in coop_ids_for(user):
        return True
    return False


def can_access_request(user, service_request):
    if user is None or service_request is None:
        return False
    if user.role in (FED_ADMIN, PLATFORM_ADMIN):
        return True
    if user.role == CUSTOMER and service_request.customer_id == user.id:
        return True
    if user.role == WORKER:
        profile = worker_profile_for(user)
        if profile and service_request.allocated_worker_id == profile.id:
            return True
    if user.role == COOP_ADMIN and service_request.cooperative_id in coop_ids_for(user):
        return True
    return False


def audit(actor, action, entity_type=None, entity_id=None, details=None):
    """Append one audit-trail row (Admin module 12). Never raises."""
    try:
        from app.models.notification import AuditLog
        from app import db
        db.session.add(AuditLog(
            actor_id=getattr(actor, "id", None),
            actor_role=getattr(actor, "role", None),
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        ))
    except Exception:
        pass
