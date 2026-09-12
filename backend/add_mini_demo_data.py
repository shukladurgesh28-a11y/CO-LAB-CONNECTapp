import sys
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import create_app, db
from app.models.booking import ServiceRequest
from app.models.cooperative import Cooperative
from app.models.service import Service
from app.models.user import User

MARKER = "Mini demo request"
COUNT = 20


def add_mini_data():
    app = create_app()
    with app.app_context():
        customer = User.query.filter_by(email="customer@demo.com").first()
        cooperative = Cooperative.query.filter_by(name="CO-LAB Demo Cooperative").first()
        services = Service.query.filter_by(is_active=True).order_by(Service.id).all()
        if not customer or not cooperative or not services:
            raise RuntimeError("Demo customer, cooperative, or services are missing")

        existing = ServiceRequest.query.filter(ServiceRequest.description.like(f"{MARKER}%")).count()
        if existing >= COUNT:
            print(f"MINI_DATA_EXISTS={existing}")
            return

        locations = [
            (18.5204, 73.8567, "Pune Central"),
            (18.5314, 73.8446, "Shivajinagar"),
            (18.5074, 73.8077, "Kothrud"),
            (18.5642, 73.7769, "Aundh"),
        ]
        records = []
        today = date.today()
        for index in range(COUNT):
            service = services[index % len(services)]
            latitude, longitude, area = locations[index % len(locations)]
            records.append(ServiceRequest(
                customer_id=customer.id,
                service_id=service.id,
                cooperative_id=cooperative.id,
                description=f"{MARKER} {index + 1}: {service.name} requested in {area}",
                location_address=f"{area}, Pune",
                location_lat=latitude,
                location_lng=longitude,
                preferred_date=today + timedelta(days=(index % 14) + 1),
                preferred_time_start=time(9 + index % 6, 0),
                preferred_time_end=time(11 + index % 6, 0),
                urgency="urgent" if index % 7 == 0 else "normal",
                status="pending",
                created_at=datetime.now(timezone.utc) + timedelta(seconds=index),
            ))

        db.session.add_all(records)
        db.session.commit()
        print(f"MINI_DATA_CREATED={len(records)}")


if __name__ == "__main__":
    add_mini_data()
