from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from config import config_by_name, Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()

DEFAULT_SERVICE_CATALOG = [
    ("Home & Repair", "home-repair", [
        ("Electrician", "electrician", "Electrical installation, repair, and maintenance.", 800.0),
        ("Plumber", "plumber", "Pipe repair, fixture installation, and leak detection.", 750.0),
        ("Carpenter", "carpenter", "Furniture repair, woodwork, and custom carpentry.", 900.0),
    ]),
    ("Cleaning & Household", "cleaning-household", [
        ("Cleaner", "cleaner", "Professional home and office cleaning services.", 500.0),
        ("Gardener", "gardener", "Garden maintenance, landscaping, and plant care.", 450.0),
    ]),
    ("Childcare & Care", "childcare-care", [
        ("Nanny", "nanny", "Reliable childcare and daily family support.", 700.0),
        ("Elder Caregiver", "elder-caregiver", "Compassionate elder care and health support.", 850.0),
    ]),
]


def create_app(config_name=None):
    if config_name is None:
        import os
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, Config))

    if app.config.get("DATABASE_CONNECTION_REQUIRED") and not app.config["SQLALCHEMY_DATABASE_URI"].startswith("postgresql"):
        raise RuntimeError(
            "SUPABASE_DB_URL is missing or still contains [YOUR-PASSWORD]. "
            "Configure backend/.env before starting the non-testing Flask app."
        )
    if config_name == "production":
        if not app.config["SECRET_KEY"] or not app.config["JWT_SECRET_KEY"]:
            raise RuntimeError("Production SECRET_KEY and JWT_SECRET_KEY must be configured.")

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}})
    jwt.init_app(app)
    mail.init_app(app)

    from app.auth import auth_bp
    from app.routes import (
        services_bp,
        workers_bp,
        requests_bp,
        bookings_bp,
        cooperative_bp,
        allocations_bp,
        federation_bp,
        payments_bp,
        ratings_bp,
        notifications_bp,
        analytics_bp,
        history_bp,
        users_bp,
        disputes_bp,
        welfare_bp,
        exports_bp,
    )
    from app.services.matching_routes import matching_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(services_bp)
    app.register_blueprint(workers_bp)
    app.register_blueprint(requests_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(cooperative_bp)
    app.register_blueprint(allocations_bp)
    app.register_blueprint(federation_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(ratings_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(disputes_bp)
    app.register_blueprint(welfare_bp)
    app.register_blueprint(exports_bp)
    app.register_blueprint(matching_bp)

    with app.app_context():
        from app.models import user, worker, cooperative, service, booking
        from app.models import notification, welfare, demand, material, dispute
        db.create_all()

        from app.models.user import User
        from app.models.worker import Worker
        from app.models.cooperative import Cooperative, Federation
        demo_password = app.config.get("DEMO_PASSWORD", "")
        if demo_password:
            demo_accounts = [
                ("customer@demo.com", "customer", "Customer Demo", "9000000101"),
                ("worker@demo.com", "worker", "Worker Demo", "9000000102"),
                ("coop@demo.com", "cooperative_admin", "Coop Demo", "9000000103"),
                ("federation@demo.com", "federation_admin", "Federation Demo", "9000000104"),
            ]
            for email, role, name, phone in demo_accounts:
                user = User.query.filter_by(email=email).first()
                if not user:
                    user = User(email=email, phone=phone, name=name, role=role, is_active=True, is_verified=True)
                    db.session.add(user)

                user.email = email
                user.phone = phone
                user.name = name
                user.role = role
                user.is_active = True
                user.is_verified = True
                user.set_password(demo_password)

            db.session.commit()

        if demo_password:
            federation_admin = User.query.filter_by(email="federation@demo.com").first()
            cooperative_admin = User.query.filter_by(email="coop@demo.com").first()
            federation = Federation.query.filter_by(name="CO-LAB Demo Federation").first()
            if not federation:
                federation = Federation(
                    name="CO-LAB Demo Federation",
                    description="Demo federation for the CO-LAB CONNECT local environment.",
                    contact_email="federation@demo.com",
                    contact_phone="9000000104",
                    admin_user_id=federation_admin.id,
                    is_active=True,
                )
                db.session.add(federation)
                db.session.flush()

            cooperative = Cooperative.query.filter_by(name="CO-LAB Demo Cooperative").first()
            if not cooperative:
                cooperative = Cooperative(
                    name="CO-LAB Demo Cooperative",
                    registration_number="COLAB-DEMO-001",
                    contact_email="coop@demo.com",
                    contact_phone="9000000103",
                    address="Local Demo Service Area",
                    latitude=18.5204,
                    longitude=73.8567,
                    service_area_km=25.0,
                    admin_user_id=cooperative_admin.id,
                    federation_id=federation.id,
                    is_active=True,
                )
                db.session.add(cooperative)
            else:
                cooperative.admin_user_id = cooperative_admin.id
                cooperative.federation_id = federation.id

            db.session.commit()

            worker_user = User.query.filter_by(email="worker@demo.com").first()
            demo_worker = Worker.query.filter_by(user_id=worker_user.id).first()
            if not demo_worker:
                demo_worker = Worker(
                    user_id=worker_user.id,
                    cooperative_id=cooperative.id,
                    name=worker_user.name,
                    phone=worker_user.phone,
                    email=worker_user.email,
                    verification_status="verified",
                    is_available=True,
                    experience_years=3,
                    latitude=18.5204,
                    longitude=73.8567,
                )
                db.session.add(demo_worker)
            else:
                demo_worker.cooperative_id = cooperative.id
                demo_worker.verification_status = "verified"
                demo_worker.is_available = True
            db.session.commit()

        from app.models.service import ServiceCategory, Service
        if not ServiceCategory.query.first():
            for category_name, category_slug, services in DEFAULT_SERVICE_CATALOG:
                category = ServiceCategory(
                    name=category_name,
                    slug=category_slug,
                    description=f"{category_name} services from trusted local workers.",
                    is_active=True,
                    display_order=len(ServiceCategory.query.all()) + 1,
                )
                db.session.add(category)
                db.session.flush()

                for name, slug, description, base_price in services:
                    db.session.add(Service(
                        category_id=category.id,
                        name=name,
                        slug=slug,
                        description=description,
                        base_price=base_price,
                        is_active=True,
                    ))

            db.session.commit()

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"success": False, "message": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"success": False, "message": "Internal server error"}), 500

    @app.route("/api/health")
    def health_check():
        return jsonify({"success": True, "message": "CO-LAB CONNECT API is running"}), 200

    return app
