import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone, date, time, timedelta
from app import create_app, db
from app.models.user import User
from app.models.worker import Worker, WorkerSkill, WorkerCertification, WorkerAvailability
from app.models.cooperative import Cooperative, Federation
from app.models.service import ServiceCategory, Service, Skill
from app.models.booking import ServiceRequest, Allocation, Booking, Payment, Invoice, Rating, ServiceHistory
from app.models.notification import Notification
from app.models.welfare import WorkerWelfare
from app.models.demand import DemandRecord
from app.models.material import MaterialRequirement


def seed():
    app = create_app()
    with app.app_context():
        if User.query.first():
            print("Database already contains data. Skipping seed.")
            return

        print("Seeding database...")

        admin_user = User(
            email="admin@collabconnect.com",
            phone="9000000000",
            name="Platform Admin",
            role="platform_admin",
            is_active=True,
            is_verified=True,
        )
        admin_user.set_password("admin123")
        db.session.add(admin_user)
        db.session.flush()

        fed_admin = User(
            email="fedadmin@collabconnect.com",
            phone="9000000001",
            name="Federation Admin",
            role="federation_admin",
            is_active=True,
            is_verified=True,
        )
        fed_admin.set_password("fedadmin123")
        db.session.add(fed_admin)
        db.session.flush()

        coop_admin1_user = User(
            email="coop1admin@collabconnect.com",
            phone="9000000010",
            name="Rajesh Kumar",
            role="cooperative_admin",
            is_active=True,
            is_verified=True,
        )
        coop_admin1_user.set_password("coopadmin123")
        db.session.add(coop_admin1_user)
        db.session.flush()

        coop_admin2_user = User(
            email="coop2admin@collabconnect.com",
            phone="9000000020",
            name="Priya Sharma",
            role="cooperative_admin",
            is_active=True,
            is_verified=True,
        )
        coop_admin2_user.set_password("coopadmin123")
        db.session.add(coop_admin2_user)
        db.session.flush()

        federation = Federation(
            name="Co-Lab Workers Federation",
            description="A federation of cooperatives dedicated to fair employment and quality service delivery across India.",
            contact_email="info@colabfederation.org",
            contact_phone="9000000099",
            admin_user_id=fed_admin.id,
            is_active=True,
        )
        db.session.add(federation)
        db.session.flush()

        coop1 = Cooperative(
            name="Sahayak Seva Cooperative",
            registration_number="COOP-2024-MH-001",
            contact_email="sahayak@collabconnect.com",
            contact_phone="9100000001",
            address="42 MG Road, Pune, Maharashtra 411001",
            latitude=18.5204,
            longitude=73.8567,
            service_area_km=25.0,
            admin_user_id=coop_admin1_user.id,
            federation_id=federation.id,
            is_active=True,
        )
        db.session.add(coop1)

        coop2 = Cooperative(
            name="Sahyog Service Cooperative",
            registration_number="COOP-2024-KA-002",
            contact_email="sahyog@collabconnect.com",
            contact_phone="9100000002",
            address="15 Brigade Road, Bangalore, Karnataka 560001",
            latitude=12.9716,
            longitude=77.5946,
            service_area_km=30.0,
            admin_user_id=coop_admin2_user.id,
            federation_id=federation.id,
            is_active=True,
        )
        db.session.add(coop2)
        db.session.flush()

        cat1 = ServiceCategory(
            name="Home & Repair",
            slug="home-repair",
            description="Electrical, plumbing, carpentry, painting and general home repair services.",
            icon="home-repair",
            is_active=True,
            display_order=1,
        )
        db.session.add(cat1)

        cat2 = ServiceCategory(
            name="Cleaning & Household",
            slug="cleaning-household",
            description="Deep cleaning, regular maintenance, domestic help and gardening services.",
            icon="cleaning",
            is_active=True,
            display_order=2,
        )
        db.session.add(cat2)

        cat3 = ServiceCategory(
            name="Childcare & Care",
            slug="childcare-care",
            description="Childcare, elder care, pet care and specialized care services.",
            icon="care",
            is_active=True,
            display_order=3,
        )
        db.session.add(cat3)
        db.session.flush()

        services_data = [
            ("Electrician", "electrician", cat1.id, "Professional electrical installation, repair and maintenance services.", ["electrical_wiring", "circuit_repair", "power_tools"], ["government_electrical_license"], True, "at_customer", 800.0, True),
            ("Plumber", "plumber", cat1.id, "Expert plumbing installation, repair and leak detection services.", ["pipe_repair", "fixture_installation", "leak_detection"], ["plumbing_certification"], True, "at_customer", 750.0, True),
            ("Carpenter", "carpenter", cat1.id, "Custom furniture making, repair and woodwork services.", ["furniture_making", "woodwork", "repair"], ["carpentry_diploma"], False, "at_customer", 900.0, False),
            ("Painter", "painter", cat1.id, "Interior and exterior painting, wall treatment and finishing.", ["wall_painting", "texture_work", "surface_prep"], None, False, "at_customer", 650.0, False),
            ("Cleaner", "cleaner", cat2.id, "Professional home and office deep cleaning services.", ["deep_cleaning", "surface_sanitization", "organizing"], None, False, "both", 500.0, False),
            ("Domestic Helper", "domestic-helper", cat2.id, "Daily household management, cooking and maintenance assistance.", ["cooking", "laundry", "housekeeping"], None, False, "at_customer", 400.0, False),
            ("Gardener", "gardener", cat2.id, "Garden maintenance, landscaping and plant care services.", ["landscaping", "plant_care", "lawn_maintenance"], None, False, "at_customer", 450.0, False),
            ("Nanny", "nanny", cat3.id, "Professional childcare, early education and child development support.", ["childcare", "first_aid", "early_education"], ["childcare_certificate"], True, "at_customer", 700.0, False),
            ("Elder Caregiver", "elder-caregiver", cat3.id, "Compassionate elder care, assistance and health monitoring.", ["elder_care", "medication_management", "mobility_assistance"], ["healthcare_aide_cert"], True, "at_customer", 850.0, True),
            ("Pet Caretaker", "pet-caretaker", cat3.id, "Pet sitting, walking, grooming and basic care services.", ["pet_sitting", "pet_grooming", "pet_walking"], None, False, "at_customer", 550.0, False),
        ]

        for name, slug, cat_id, desc, req_skills, opt_quals, verify, avail, price, emergency in services_data:
            svc = Service(
                category_id=cat_id,
                name=name,
                slug=slug,
                description=desc,
                required_skills=req_skills,
                optional_qualifications=opt_quals,
                verification_required=verify,
                availability_type=avail,
                location_rule="at_customer",
                emergency_support=emergency,
                base_price=price,
                is_active=True,
            )
            db.session.add(svc)
        db.session.flush()

        skills_data = [
            ("Electrical Wiring", "electrical-wiring", cat1.id, "Installation and repair of electrical wiring systems"),
            ("Circuit Repair", "circuit-repair", cat1.id, "Diagnosis and repair of electrical circuits"),
            ("Power Tools", "power-tools", cat1.id, "Proficiency with power tools for electrical work"),
            ("Pipe Repair", "pipe-repair", cat1.id, "Repair and replacement of plumbing pipes"),
            ("Fixture Installation", "fixture-installation", cat1.id, "Installation of faucets, sinks, and bathroom fixtures"),
            ("Furniture Making", "furniture-making", cat1.id, "Custom furniture design and construction"),
            ("Woodwork", "woodwork", cat1.id, "General woodwork and joinery"),
            ("Wall Painting", "wall-painting", cat1.id, "Interior and exterior wall painting techniques"),
            ("Deep Cleaning", "deep-cleaning", cat2.id, "Thorough cleaning of all surfaces and areas"),
            ("Cooking", "cooking", cat2.id, "Home-style and professional cooking"),
            ("Landscaping", "landscaping", cat2.id, "Garden design and landscape maintenance"),
            ("Childcare", "childcare", cat3.id, "Professional care for children of all ages"),
            ("Elder Care", "elder-care", cat3.id, "Specialized care for elderly individuals"),
            ("First Aid", "first-aid", cat3.id, "Emergency first aid and basic medical response"),
            ("Pet Grooming", "pet-grooming", cat3.id, "Professional pet grooming and hygiene"),
        ]

        skill_objects = []
        for name, slug, cat_id, desc in skills_data:
            skill = Skill(name=name, slug=slug, category_id=cat_id, description=desc, is_active=True)
            db.session.add(skill)
            skill_objects.append(skill)
        db.session.flush()

        worker_data = [
            {
                "name": "Amit Patel", "phone": "9800000001", "email": "amit@example.com",
                "lat": 18.5300, "lng": 73.8600, "area": 20, "exp": 8, "coop": coop1.id,
                "skills": [(0, "expert", 8), (1, "expert", 7), (2, "intermediate", 5)],
                "bio": "Experienced electrician with 8 years in residential and commercial electrical work.",
            },
            {
                "name": "Suresh Reddy", "phone": "9800000002", "email": "suresh@example.com",
                "lat": 18.5150, "lng": 73.8500, "area": 15, "exp": 5, "coop": coop1.id,
                "skills": [(3, "expert", 5), (4, "intermediate", 4)],
                "bio": "Licensed plumber specializing in residential plumbing and leak detection.",
            },
            {
                "name": "Vikram Singh", "phone": "9800000003", "email": "vikram@example.com",
                "lat": 18.5250, "lng": 73.8650, "area": 25, "exp": 12, "coop": coop1.id,
                "skills": [(5, "expert", 12), (6, "expert", 10)],
                "bio": "Master carpenter with expertise in custom furniture and traditional woodwork.",
            },
            {
                "name": "Deepak Nair", "phone": "9800000004", "email": "deepak@example.com",
                "lat": 12.9700, "lng": 77.5900, "area": 18, "exp": 3, "coop": coop2.id,
                "skills": [(8, "intermediate", 3), (9, "intermediate", 2)],
                "bio": "Professional cleaner committed to delivering spotless results.",
            },
            {
                "name": "Meena Devi", "phone": "9800000005", "email": "meena@example.com",
                "lat": 12.9750, "lng": 77.6000, "area": 22, "exp": 7, "coop": coop2.id,
                "skills": [(11, "expert", 7), (12, "intermediate", 4), (13, "expert", 6)],
                "bio": "Compassionate caregiver with 7 years experience in childcare and elder care.",
            },
        ]

        worker_objects = []
        for wd in worker_data:
            user = User(
                email=wd["email"],
                phone=wd["phone"],
                name=wd["name"],
                role="worker",
                is_active=True,
                is_verified=True,
            )
            user.set_password("worker123")
            db.session.add(user)
            db.session.flush()

            worker = Worker(
                user_id=user.id,
                cooperative_id=wd["coop"],
                name=wd["name"],
                phone=wd["phone"],
                email=wd["email"],
                latitude=wd["lat"],
                longitude=wd["lng"],
                service_area_km=wd["area"],
                verification_status="verified",
                verification_date=datetime.now(timezone.utc),
                verification_notes="Verified during initial setup",
                experience_years=wd["exp"],
                current_workload=0,
                max_workload=5,
                is_available=True,
                total_completed_services=15 + wd["exp"] * 3,
                average_rating=4.0 + (wd["exp"] % 3) * 0.3,
                bio=wd["bio"],
            )
            db.session.add(worker)
            db.session.flush()
            worker_objects.append(worker)

            for skill_idx, prof, years in wd["skills"]:
                ws = WorkerSkill(
                    worker_id=worker.id,
                    skill_id=skill_objects[skill_idx].id,
                    proficiency=prof,
                    years_experience=years,
                    is_verified=True,
                )
                db.session.add(ws)

            for day in range(0, 7):
                avail = WorkerAvailability(
                    worker_id=worker.id,
                    day_of_week=day,
                    start_time=time(8, 0),
                    end_time=time(18, 0),
                    is_available=day < 6,
                )
                db.session.add(avail)

        db.session.flush()

        cert_data = [
            (worker_objects[0].id, skill_objects[0].id, "Government Electrical License", "Maharashtra State Electrical Board", date(2019, 3, 15), date(2027, 3, 14)),
            (worker_objects[0].id, skill_objects[2].id, "Advanced Power Tools Certification", "National Skill Development Corporation", date(2020, 7, 1), date(2026, 6, 30)),
            (worker_objects[1].id, skill_objects[3].id, "Plumbing Professional Certificate", "Indian Plumbing Association", date(2021, 1, 10), date(2027, 1, 9)),
            (worker_objects[2].id, skill_objects[5].id, "Master Craftsman Certificate", "All India Woodworkers Association", date(2018, 9, 20), date(2028, 9, 19)),
            (worker_objects[4].id, skill_objects[11].id, "Certified Childcare Professional", "National Institute of Home Management", date(2022, 5, 15), date(2026, 5, 14)),
            (worker_objects[4].id, skill_objects[12].id, "Elder Care Specialist Certificate", "Indian Council for Elder Welfare", date(2023, 2, 1), date(2027, 1, 31)),
        ]

        for worker_id, skill_id, cert_name, authority, issue, expiry in cert_data:
            cert = WorkerCertification(
                worker_id=worker_id,
                skill_id=skill_id,
                certification_name=cert_name,
                issuing_authority=authority,
                issue_date=issue,
                expiry_date=expiry,
                verification_status="verified",
                verified_by=admin_user.id,
            )
            db.session.add(cert)

        customer_data = [
            {"name": "Anjali Mehta", "phone": "9700000001", "email": "anjali@example.com"},
            {"name": "Rahul Joshi", "phone": "9700000002", "email": "rahul@example.com"},
            {"name": "Sanjay Gupta", "phone": "9700000003", "email": "sanjay@example.com"},
        ]

        customer_objects = []
        for cd in customer_data:
            cust = User(
                email=cd["email"],
                phone=cd["phone"],
                name=cd["name"],
                role="customer",
                is_active=True,
                is_verified=True,
            )
            cust.set_password("customer123")
            db.session.add(cust)
            customer_objects.append(cust)
        db.session.flush()

        now = datetime.now(timezone.utc)

        sr1 = ServiceRequest(
            customer_id=customer_objects[0].id,
            service_id=1,
            cooperative_id=coop1.id,
            description="Fan in bedroom is making noise and needs repair. Also need a new power socket installed.",
            location_address="123 Saket Nagar, Pune 411027",
            location_lat=18.5250,
            location_lng=73.8580,
            preferred_date=date.today() + timedelta(days=2),
            preferred_time_start=time(10, 0),
            preferred_time_end=time(13, 0),
            urgency="normal",
            status="pending",
        )

        sr2 = ServiceRequest(
            customer_id=customer_objects[1].id,
            service_id=2,
            cooperative_id=coop1.id,
            description="Kitchen sink is leaking badly. Water is pooling under the cabinet.",
            location_address="45 Baner Road, Pune 411045",
            location_lat=18.5350,
            location_lng=73.8450,
            preferred_date=date.today() + timedelta(days=1),
            preferred_time_start=time(9, 0),
            preferred_time_end=time(12, 0),
            urgency="urgent",
            status="pending",
        )

        sr3 = ServiceRequest(
            customer_id=customer_objects[2].id,
            service_id=8,
            cooperative_id=coop2.id,
            description="Need a reliable nanny for 2-year-old twins. Mon-Fri, 8am-5pm.",
            location_address="78 Koramangala 5th Block, Bangalore 560095",
            location_lat=12.9710,
            location_lng=77.6050,
            preferred_date=date.today() + timedelta(days=5),
            preferred_time_start=time(14, 0),
            preferred_time_end=time(17, 0),
            urgency="normal",
            status="pending",
        )

        db.session.add_all([sr1, sr2, sr3])
        db.session.flush()

        allocation1 = Allocation(
            request_id=sr1.id,
            worker_id=worker_objects[0].id,
            cooperative_id=coop1.id,
            admin_user_id=coop_admin1_user.id,
            recommendation_score=0.87,
            allocation_reason="Best match: expert electrician with available schedule",
            status="accepted",
        )
        db.session.add(allocation1)
        db.session.flush()

        sr1.status = "allocated"
        sr1.allocated_worker_id = worker_objects[0].id
        sr1.allocation_id = allocation1.id
        worker_objects[0].current_workload += 1

        booking1 = Booking(
            request_id=sr1.id,
            allocation_id=allocation1.id,
            worker_id=worker_objects[0].id,
            customer_id=customer_objects[0].id,
            cooperative_id=coop1.id,
            service_date=date.today() + timedelta(days=2),
            time_start=time(10, 0),
            time_end=time(13, 0),
            status="confirmed",
            total_amount=800.0,
            material_charges=150.0,
            final_amount=950.0,
        )
        db.session.add(booking1)
        db.session.flush()

        invoice1 = Invoice(
            booking_id=booking1.id,
            invoice_number="INV-202609-00001",
            service_charges=800.0,
            material_charges=150.0,
            total_amount=950.0,
            tax_amount=171.0,
            net_amount=779.0,
            payment_status="pending",
        )
        db.session.add(invoice1)

        notif1 = Notification(
            user_id=coop_admin1_user.id,
            title="New Service Request",
            message="A new electrical service request has been received from Anjali Mehta.",
            type="new_request",
            reference_type="service_request",
            reference_id=sr1.id,
        )

        notif2 = Notification(
            user_id=customer_objects[0].id,
            title="Request Received",
            message="Your service request has been received and is being reviewed.",
            type="request_update",
            reference_type="service_request",
            reference_id=sr1.id,
        )

        db.session.add_all([notif1, notif2])

        db.session.commit()
        print("Seed data created successfully!")
        print(f"  - 1 platform admin, 1 federation admin, 2 cooperative admins")
        print(f"  - 1 federation, 2 cooperatives")
        print(f"  - 3 service categories, 10 services, 15 skills")
        print(f"  - 5 workers with skills, availability, certifications")
        print(f"  - 3 customers")
        print(f"  - 3 service requests, 1 allocation, 1 booking, 1 invoice")
        print(f"  - 2 notifications")
        print()
        print("Login credentials:")
        print("  Admin:         9000000000 / admin123")
        print("  Fed Admin:     9000000001 / fedadmin123")
        print("  Coop1 Admin:   9000000010 / coopadmin123")
        print("  Coop2 Admin:   9000000020 / coopadmin123")
        print("  Worker Amit:   9800000001 / worker123")
        print("  Worker Suresh: 9800000002 / worker123")
        print("  Worker Vikram: 9800000003 / worker123")
        print("  Worker Deepak: 9800000004 / worker123")
        print("  Worker Meena:  9800000005 / worker123")
        print("  Customer Anj:  9700000001 / customer123")
        print("  Customer Rah:  9700000002 / customer123")
        print("  Customer San:  9700000003 / customer123")


if __name__ == "__main__":
    seed()
