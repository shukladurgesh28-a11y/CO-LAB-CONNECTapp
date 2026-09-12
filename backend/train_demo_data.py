import sys
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import create_app, db
from app.models.booking import ServiceRequest
from app.models.cooperative import Cooperative
from app.models.service import Service
from app.models.user import User


DEMO_MARKER = "AI training demo record v2"
TRAINING_RECORDS = 10000


def populate_training_data():
    app = create_app()
    with app.app_context():
        customer = User.query.filter_by(email="customer@demo.com").first()
        cooperative = Cooperative.query.filter_by(name="CO-LAB Demo Cooperative").first()
        services = Service.query.filter_by(is_active=True).order_by(Service.id).all()

        if not customer or not cooperative or not services:
            raise RuntimeError("Demo customer, cooperative, or services are missing")

        existing = ServiceRequest.query.filter(
            ServiceRequest.description.like(f"{DEMO_MARKER}%")
        ).count()
        if existing:
            print(f"TRAINING_DATA_EXISTS={existing}")
            return

        locations = [
            (18.5204, 73.8567, "Pune Central"),
            (18.5314, 73.8446, "Shivajinagar"),
            (18.5074, 73.8077, "Kothrud"),
            (18.5642, 73.7769, "Aundh"),
        ]
        urgencies = ["normal", "normal", "normal", "urgent", "high"]
        statuses = ["pending", "confirmed", "completed", "completed", "cancelled"]
        today = date.today()
        records = []

        for index in range(TRAINING_RECORDS):
            service = services[index % len(services)]
            created_day = today - timedelta(days=364 - (index % 365))
            latitude, longitude, area = locations[index % len(locations)]
            record = ServiceRequest(
                customer_id=customer.id,
                service_id=service.id,
                cooperative_id=cooperative.id,
                description=f"{DEMO_MARKER} {index + 1}: {service.name} support in {area}",
                location_address=f"{area}, Pune",
                location_lat=latitude,
                location_lng=longitude,
                preferred_date=created_day + timedelta(days=2),
                preferred_time_start=time(9 + index % 6, 0),
                preferred_time_end=time(11 + index % 6, 0),
                urgency=urgencies[index % len(urgencies)],
                status=statuses[index % len(statuses)],
                created_at=datetime.combine(created_day, time(10, 0), tzinfo=timezone.utc),
            )
            records.append(record)

        for start in range(0, len(records), 1000):
            db.session.add_all(records[start:start + 1000])
            db.session.flush()
        db.session.commit()
        print(f"TRAINING_DATA_CREATED={len(records)}")
        print(f"DATA_SOURCE={app.config['SQLALCHEMY_DATABASE_URI'].split(':', 1)[0]}")


if __name__ == "__main__":
    populate_training_data()
