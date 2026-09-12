from app.routes.services import services_bp
from app.routes.workers import workers_bp
from app.routes.requests import requests_bp
from app.routes.bookings import bookings_bp
from app.routes.cooperative import cooperative_bp, allocations_bp
from app.routes.federation import federation_bp
from app.routes.payments import payments_bp
from app.routes.ratings import ratings_bp
from app.routes.notifications import notifications_bp
from app.routes.analytics import analytics_bp
from app.routes.history import history_bp
from app.routes.users import users_bp
from app.routes.disputes import disputes_bp
from app.routes.welfare import welfare_bp
from app.routes.exports import exports_bp

__all__ = [
    "services_bp",
    "workers_bp",
    "requests_bp",
    "bookings_bp",
    "cooperative_bp",
    "allocations_bp",
    "federation_bp",
    "payments_bp",
    "ratings_bp",
    "notifications_bp",
    "analytics_bp",
    "history_bp",
    "users_bp",
    "disputes_bp",
    "welfare_bp",
    "exports_bp",
]
