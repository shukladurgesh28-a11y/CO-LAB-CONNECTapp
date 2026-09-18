import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def get_database_uri():
    supabase_db_url = os.getenv("SUPABASE_DB_URL", "").strip()
    if supabase_db_url and "[YOUR-PASSWORD]" not in supabase_db_url:
        return supabase_db_url

    configured = (
        os.getenv("NEON_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or os.getenv("SQLALCHEMY_DATABASE_URL")
        or os.getenv("SQLALCHEMY_DATABASE_URI")
    )
    base_dir = os.path.dirname(os.path.abspath(__file__))
    instance_dir = os.path.join(base_dir, "instance")
    os.makedirs(instance_dir, exist_ok=True)
    if configured:
        # Resolve relative SQLite URLs against the backend directory so every
        # process (run.py, seed scripts, tests, gunicorn workers) uses the SAME
        # database file regardless of current working directory. A relative
        # sqlite path is the classic cause of "booking disappears after login
        # as another role" during local development.
        if configured.startswith("sqlite:///") and not configured.startswith("sqlite:////"):
            rel_path = configured[len("sqlite:///"):]
            if not os.path.isabs(rel_path):
                abs_path = os.path.normpath(os.path.join(base_dir, rel_path)).replace("\\", "/")
                return f"sqlite:///{abs_path}"
        return configured

    db_file = os.path.join(instance_dir, "collabconnect.db").replace("\\", "/")
    return f"sqlite:///{db_file}"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
    DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    SQLALCHEMY_DATABASE_URI = get_database_uri()
    DATABASE_CONNECTION_REQUIRED = os.getenv("ALLOW_SQLITE_FALLBACK", "false").lower() != "true"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 280,
        "pool_pre_ping": True,
    }

    OTP_EXPIRY_SECONDS = 300
    OTP_LENGTH = 6

    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", "noreply@collabconnect.com")

    FIREBASE_CREDENTIALS_PATH = os.getenv(
        "FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json"
    )
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
    PAYMENT_GATEWAY_KEY = os.getenv("PAYMENT_GATEWAY_KEY", "")
    PAYMENT_MODE = os.getenv("PAYMENT_MODE", "sandbox").lower()

    # Money math rates - consumed by app/services/pricing.py (single source of truth)
    COMMISSION_RATE = float(os.getenv("COMMISSION_RATE", "0.10"))
    WELFARE_RATE = float(os.getenv("WELFARE_RATE", "0.02"))
    TAX_RATE = float(os.getenv("TAX_RATE", "0.0"))
    COMMISSION_INCLUDE_MATERIAL = os.getenv("COMMISSION_INCLUDE_MATERIAL", "false").lower() == "true"
    OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))
    OTP_EXPOSE_IN_RESPONSE = os.getenv("OTP_EXPOSE_IN_RESPONSE", "false").lower() == "true"

    # Keep Supabase and Neon credentials on the backend only.
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    NEON_API_KEY = os.getenv("NEON_API_KEY", "")

    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    DATABASE_CONNECTION_REQUIRED = False
    DEMO_PASSWORD = "CoLab!Demo2026"


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
