import os
import sys
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import create_app, db
from app.models.booking import Allocation, Booking, ServiceRequest
from app.models.cooperative import Cooperative
from app.models.service import Service, Skill
from app.models.user import User
from app.models.worker import Worker, WorkerAvailability, WorkerCertification, WorkerSkill

MARKER = "Judge showcase"
PASSWORD = os.getenv("DEMO_PASSWORD", "")

WORKERS = [
    ("Aarav Patil", "aarav.worker@demo.com", "9100001001", "Electrician", 18.5204, 73.8567, 8),
    ("Meera Joshi", "meera.worker@demo.com", "9100001002", "Plumber", 18.5314, 73.8446, 7),
    ("Rohan Kulkarni", "rohan.worker@demo.com", "9100001003", "Carpenter", 18.5074, 73.8077, 10),
    ("Ananya Deshmukh", "ananya.worker@demo.com", "9100001004", "Cleaner", 18.5642, 73.7769, 5),
    ("Vikram Shah", "vikram.worker@demo.com", "9100001005", "Gardener", 18.4983, 73.8258, 6),
    ("Kavya Nair", "kavya.worker@demo.com", "9100001006", "Nanny", 18.5362, 73.8958, 6),
    ("Imran Shaikh", "imran.worker@demo.com", "9100001007", "Elder Caregiver", 18.4895, 73.8213, 9),
]

CUSTOMERS = [
    ("Neha Sharma", "neha.customer@demo.com", "9200002001"),
    ("Aditya Rao", "aditya.customer@demo.com", "9200002002"),
    ("Pooja Menon", "pooja.customer@demo.com", "9200002003"),
]


def get_or_create_user(name, email, phone, role):
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(email=email, phone=phone, name=name, role=role, is_active=True, is_verified=True)
        user.set_password(PASSWORD)
        db.session.add(user)
        db.session.flush()
    return user


def create_showcase():
    if not PASSWORD:
        raise RuntimeError("Set DEMO_PASSWORD in backend/.env before creating showcase data.")
    app = create_app()
    with app.app_context():
        cooperative = Cooperative.query.filter_by(name="CO-LAB Demo Cooperative").first()
        admin = User.query.filter_by(email="coop@demo.com").first()
        services = {service.name: service for service in Service.query.filter_by(is_active=True).all()}
        if not cooperative or not admin or not services:
            raise RuntimeError("Demo cooperative, admin, or services are missing")

        worker_rows = []
        for name, email, phone, service_name, lat, lng, experience in WORKERS:
            user = get_or_create_user(name, email, phone, "worker")
            worker = Worker.query.filter_by(user_id=user.id).first()
            if not worker:
                worker = Worker(
                    user_id=user.id,
                    cooperative_id=cooperative.id,
                    name=name,
                    phone=phone,
                    email=email,
                    latitude=lat,
                    longitude=lng,
                    service_area_km=25.0,
                    verification_status="verified",
                    verification_date=datetime.now(timezone.utc),
                    verification_notes="Verified showcase worker for judge demonstration",
                    experience_years=experience,
                    is_available=True,
                    average_rating=4.2 + (experience % 7) / 10,
                    bio=f"Verified {service_name.lower()} serving Pune communities through CO-LAB CONNECT.",
                )
                db.session.add(worker)
                db.session.flush()
            else:
                worker.cooperative_id = cooperative.id
                worker.is_available = True
                worker.verification_status = "verified"

            service = services.get(service_name)
            skill = Skill.query.filter_by(slug=service_name.lower().replace(" ", "-")).first()
            if not skill:
                skill = Skill(name=service_name, slug=service_name.lower().replace(" ", "-"), is_active=True)
                db.session.add(skill)
                db.session.flush()
            if not WorkerSkill.query.filter_by(worker_id=worker.id, skill_id=skill.id).first():
                db.session.add(WorkerSkill(worker_id=worker.id, skill_id=skill.id, proficiency="expert", years_experience=experience, is_verified=True))
            if not WorkerCertification.query.filter_by(worker_id=worker.id, certification_name=f"{service_name} Professional Certificate").first():
                db.session.add(WorkerCertification(
                    worker_id=worker.id,
                    skill_id=skill.id,
                    certification_name=f"{service_name} Professional Certificate",
                    issuing_authority="CO-LAB Skills Council",
                    issue_date=date(2023, 1, 1),
                    expiry_date=date(2028, 12, 31),
                    verification_status="verified",
                    verified_by=admin.id,
                ))
            if not WorkerAvailability.query.filter_by(worker_id=worker.id).first():
                for day in range(7):
                    db.session.add(WorkerAvailability(worker_id=worker.id, day_of_week=day, start_time=time(9, 0), end_time=time(18, 0), is_available=True))
            worker_rows.append((worker, service))

        customer_rows = [get_or_create_user(*customer, "customer") for customer in CUSTOMERS]
        db.session.commit()

        existing = ServiceRequest.query.filter(ServiceRequest.description.like(f"{MARKER}%")).count()
        if not existing:
            today = date.today()
            for index, (worker, service) in enumerate(worker_rows):
                customer = customer_rows[index % len(customer_rows)]
                request = ServiceRequest(
                    customer_id=customer.id,
                    service_id=service.id,
                    cooperative_id=cooperative.id,
                    description=f"{MARKER}: {service.name} service requested by {customer.name}",
                    location_address=f"Pune Service Area {index + 1}",
                    location_lat=worker.latitude,
                    location_lng=worker.longitude,
                    preferred_date=today + timedelta(days=index + 1),
                    preferred_time_start=time(10, 0),
                    preferred_time_end=time(13, 0),
                    urgency="urgent" if index == 1 else "normal",
                    status="allocated" if index < 5 else "pending",
                    allocated_worker_id=worker.id if index < 5 else None,
                    created_at=datetime.now(timezone.utc) - timedelta(days=10 - index),
                )
                db.session.add(request)
                db.session.flush()
                if index < 5:
                    allocation = Allocation(
                        request_id=request.id,
                        worker_id=worker.id,
                        cooperative_id=cooperative.id,
                        admin_user_id=admin.id,
                        recommendation_score=0.88 - index * 0.03,
                        allocation_reason="Showcase match by verified skill, location, and availability",
                        status="accepted",
                    )
                    db.session.add(allocation)
                    db.session.flush()
                    request.allocation_id = allocation.id
                    db.session.add(Booking(
                        request_id=request.id,
                        allocation_id=allocation.id,
                        worker_id=worker.id,
                        customer_id=customer.id,
                        cooperative_id=cooperative.id,
                        service_date=request.preferred_date,
                        time_start=request.preferred_time_start,
                        time_end=request.preferred_time_end,
                        status="confirmed" if index < 3 else "completed",
                        total_amount=service.base_price,
                        final_amount=service.base_price,
                    ))
            db.session.commit()
        else:
            showcase_requests = ServiceRequest.query.filter(ServiceRequest.description.like(f"{MARKER}%")).all()
            now = datetime.now(timezone.utc)
            for index, request in enumerate(showcase_requests):
                request.created_at = now + timedelta(seconds=index)
            db.session.commit()

        print(f"SHOWCASE_WORKERS={len(worker_rows)}")
        print(f"SHOWCASE_CUSTOMERS={len(customer_rows)}")
        print(f"SHOWCASE_REQUESTS={ServiceRequest.query.filter(ServiceRequest.description.like(f'{MARKER}%')).count()}")
        print(f"SHOWCASE_BOOKINGS={Booking.query.join(ServiceRequest).filter(ServiceRequest.description.like(f'{MARKER}%')).count()}")
        print(f"DEMO_PASSWORD={PASSWORD}")


if __name__ == "__main__":
    create_showcase()
