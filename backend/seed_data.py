"""CO-LAB CONNECT Demo/Seed Data Generator.

Creates 25 workers, 15 customers, 3 federations, 5 coops,
14 services, 18 service requests in various states, 20+ bookings,
payments, invoices, ratings, notifications, and welfare records.

Idempotent: safe to run multiple times.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone, date, time, timedelta
from collections import Counter
from sqlalchemy import text
from app import create_app, db
from app.models.user import User
from app.models.worker import Worker, WorkerSkill, WorkerCertification, WorkerAvailability
from app.models.cooperative import Cooperative, Federation
from app.models.service import ServiceCategory, Service, Skill
from app.models.booking import ServiceRequest, Allocation, Booking, Payment, Invoice, Rating, ServiceHistory
from app.models.notification import Notification
from app.models.welfare import WorkerWelfare
from app.models.demand import DemandRecord
from app.services.pricing import compute_invoice


def _hash_pw(password):
    import bcrypt
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def seed():
    import gc, os, sys, warnings
    warnings.filterwarnings("ignore")
    
    # Delete database file from instance/ directory for clean seed
    # The SQLite DB is at instance/collabconnect.db per config.py
    deleted_files = []
    possible_db_paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'collabconnect.db'),
        os.path.join(os.getcwd(), 'instance', 'collabconnect.db'),
    ]
    for db_path in possible_db_paths:
        if os.path.exists(db_path):
            try: 
                os.remove(db_path)
                deleted_files.append(db_path)
            except: pass
        # Also delete WAL and SHM files
        for suffix in ['-wal', '-shm']:
            fp = db_path + suffix
            if os.path.exists(fp):
                try: os.remove(fp)
                except: pass
    
    if deleted_files:
        print(f"Deleted DB files: {deleted_files}")
    
    app = create_app()
    with app.app_context():
        # create_app() above seeds the demo federation/cooperative/demo accounts,
        # so drop everything first, then build a clean, consistent dataset.
        db.session.remove()
        gc.collect()
        # Handle Postgres circular FK (allocations <-> service_requests) vs SQLite
        from config import get_database_uri as _gdu
        _uri = _gdu()
        is_pg = 'postgres' in _uri and 'hpvnqvnhoigcepgrcdek' in _uri
        if is_pg:
            try:
                db.session.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
                db.session.commit()
            except Exception as e:
                print("drop schema failed", e)
                db.session.rollback()
        else:
            try:
                db.session.execute(text("PRAGMA foreign_keys=OFF"))
            except Exception:
                pass
            db.drop_all()
        db.create_all()
        demo_password = app.config.get("DEMO_PASSWORD", "CoLab!Demo2026")

        # Demo accounts are created by create_app() on a fresh DB; recreate them
        # here so the seeded demo cooperative/worker belong to the same users the
        # API factory also lines up on every startup.
        for email, role, name, phone in [
            ("customer@demo.com", "customer", "Customer Demo", "9000000101"),
            ("worker@demo.com", "worker", "Worker Demo", "9000000102"),
            ("coop@demo.com", "cooperative_admin", "Coop Demo", "9000000103"),
            ("federation@demo.com", "federation_admin", "Federation Demo", "9000000104"),
        ]:
            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(email=email, phone=phone, name=name,
                            role=role, is_active=True, is_verified=True)
                db.session.add(user)
            user.role = role
            user.name = name
            user.phone = phone
            user.is_active = True
            user.is_verified = True
            user.set_password(demo_password)
        db.session.flush()
        demo_customer = User.query.filter_by(email="customer@demo.com").first()
        demo_worker_user = User.query.filter_by(email="worker@demo.com").first()
        demo_coop_admin = User.query.filter_by(email="coop@demo.com").first()
        demo_federation_admin = User.query.filter_by(email="federation@demo.com").first()

        # --- Federations (3) ---
        feds = []
        for name, desc, email, phone in [
            ("Co-LAB Workers Federation", "A federation of coops dedicated to fair employment.", "fed1@collabconnect.local", "9000000099"),
            ("MahaSeva Federation", "Maharashtra state federation.", "fed2@collabconnect.local", "9000000098"),
            ("KarnatakaSeva Federation", "Karnataka state federation.", "fed3@collabconnect.local", "9000000097"),
        ]:
            f = Federation(name=name, description=desc, contact_email=email, contact_phone=phone, is_active=True)
            db.session.add(f)
            feds.append(f)
        db.session.flush()

        # --- Cooperatives (6; the demo coop is FIRST so it is the first active
        # cooperative that new service requests land in) ---
        coops = []
        for name, reg, email, phone, addr, lat, lng, area, fed_id in [
            ("CO-LAB Demo Cooperative", "COLAB-DEMO-001", "coop@demo.com", "9000000103",
             "Local Demo Service Area", 18.5204, 73.8567, 25.0, feds[0].id),
            ("Sahayak Seva Cooperative", "COOP-2024-MH-001", "sahayak@collabconnect.local", "9100000001",
             "42 MG Road, Pune", 18.5204, 73.8567, 25.0, feds[0].id),
            ("Sahyog Service Cooperative", "COOP-2024-KA-002", "sahyog@collabconnect.local", "9100000002",
             "15 Brigade Road, Bangalore", 12.9716, 77.5946, 30.0, feds[0].id),
            ("Udyam Seva Cooperative", "COOP-2024-DL-003", "udyam@collabconnect.local", "9100000003",
             "45 Connaught Place, New Delhi", 28.6139, 77.2090, 25.0, feds[1].id),
            ("Samarth Worker Cooperative", "COOP-2024-TN-004", "samarth@collabconnect.local", "9100000004",
             "22 T Nagar, Chennai", 13.0827, 80.2707, 20.0, feds[0].id),
            ("Shiksha Seva Cooperative", "COOP-2024-GJ-005", "shiksha@collabconnect.local", "9100000005",
             "8 Ashram Road, Ahmedabad", 23.0225, 72.5714, 25.0, feds[1].id),
        ]:
            c = Cooperative(name=name, registration_number=reg, contact_email=email,
                          contact_phone=phone, address=addr, latitude=lat, longitude=lng,
                          service_area_km=area, federation_id=fed_id, is_active=True)
            db.session.add(c)
            coops.append(c)
        db.session.flush()

        # --- Admin Users ---
        admin_data = [
            ("admin@collabconnect.local", "9000000000", "Platform Admin", "platform_admin"),
            ("fed1@collabconnect.local", "9000000099", "Federation 1 Admin", "federation_admin"),
            ("fed2@collabconnect.local", "9000000098", "Federation 2 Admin", "federation_admin"),
            ("fed3@collabconnect.local", "9000000097", "Federation 3 Admin", "federation_admin"),
            ("coop1@collabconnect.local", "9100000001", "Coop1 Admin", "cooperative_admin"),
            ("coop2@collabconnect.local", "9100000002", "Coop2 Admin", "cooperative_admin"),
            ("coop3@collabconnect.local", "9100000003", "Coop3 Admin", "cooperative_admin"),
            ("coop4@collabconnect.local", "9100000004", "Coop4 Admin", "cooperative_admin"),
            ("coop5@collabconnect.local", "9100000005", "Coop5 Admin", "cooperative_admin"),
        ]
        admins = []
        for email, phone, name, role in admin_data:
            u = User(email=email, phone=phone, name=name, role=role, is_active=True, is_verified=True)
            u.set_password(demo_password)
            db.session.add(u)
            admins.append(u)
        db.session.flush()

        # Assign admin_user_id: admins[0] is the platform admin, admins[1:4] are
        # federation admins, admins[4:] are the cooperative admins. The demo
        # cooperative (index 0) is administered by coop@demo.com; coops[1:] map
        # to coop1..coop5 admins at admins[4..8].
        for i, coop in enumerate(coops):
            coop.admin_user_id = admins[min(i + 3, len(admins) - 1)].id
        if demo_coop_admin:
            coops[0].admin_user_id = demo_coop_admin.id
        coop_by_id = {c.id: c for c in coops}

        # --- Service Categories (5) ---
        categories = []
        for name, slug, desc, icon, order in [
            ("Home & Repair", "home-repair", "Electrical, plumbing, carpentry, painting.", "home-repair", 1),
            ("Cleaning & Household", "cleaning-household", "Deep cleaning, maintenance, gardening.", "cleaning", 2),
            ("Childcare & Care", "childcare-care", "Childcare, elder care, pet care.", "care", 3),
            ("Transport & Logistics", "transport-logistics", "Driver, delivery, transportation.", "transport", 4),
            ("Technical Services", "technical-services", "AC, electronics, appliance servicing.", "technical", 5),
        ]:
            c = ServiceCategory(name=name, slug=slug, description=desc, icon=icon, is_active=True, display_order=order)
            db.session.add(c)
            categories.append(c)
        db.session.flush()

        # --- Services (14) ---
        services = []
        for name, slug, cat_id, desc, req_skills, opt_quals, verify, avail, price, emergency in [
            ("Electrician", "electrician", categories[0].id, "Professional electrical installation, repair.", ["electrical_wiring", "circuit_repair", "power_tools"], ["government_electrical_license"], True, "at_customer", 800.0, True),
            ("Plumber", "plumber", categories[0].id, "Expert plumbing, leak detection.", ["pipe_repair", "fixture_installation"], ["plumbing_certification"], True, "at_customer", 750.0, True),
            ("Carpenter", "carpenter", categories[0].id, "Custom furniture, woodwork.", ["furniture_making", "woodwork"], ["carpentry_diploma"], False, "at_customer", 900.0, False),
            ("Painter", "painter", categories[0].id, "Interior and exterior painting.", ["wall_painting", "texture_work"], None, False, "at_customer", 650.0, False),
            ("Cleaner", "cleaner", categories[1].id, "Professional deep cleaning.", ["deep_cleaning", "organizing"], None, False, "both", 500.0, False),
            ("Domestic Helper", "domestic-helper", categories[1].id, "Household management, cooking.", ["cooking", "laundry"], None, False, "at_customer", 400.0, False),
            ("Gardener", "gardener", categories[1].id, "Garden maintenance, landscaping.", ["landscaping", "plant_care"], None, False, "at_customer", 450.0, False),
            ("Nanny", "nanny", categories[2].id, "Professional childcare support.", ["childcare", "first_aid"], ["childcare_certificate"], True, "at_customer", 700.0, False),
            ("Elder Caregiver", "elder-caregiver", categories[2].id, "Elder care and health monitoring.", ["elder_care", "medication_management"], ["healthcare_aide_cert"], True, "at_customer", 850.0, True),
            ("Pet Caretaker", "pet-caretaker", categories[2].id, "Pet sitting, walking, grooming.", ["pet_sitting", "pet_grooming"], None, False, "at_customer", 550.0, False),
            ("Dog Walker", "dog-walker", categories[2].id, "Dog walking and exercise.", ["pet_walking", "dog_training"], None, False, "at_customer", 400.0, False),
            ("Driver", "driver", categories[3].id, "Local transport and delivery.", ["driving_license", "navigation"], ["commercial_driving_license"], True, "at_customer", 600.0, True),
            ("AC Technician", "ac-technician", categories[4].id, "AC repair and maintenance.", ["ac_repair", "refrigeration"], ["technician_certification"], True, "at_customer", 700.0, True),
            ("Electronics Repair", "electronics-repair", categories[4].id, "Phone, laptop electronics repair.", ["circuit_repair", "soldering"], None, False, "at_customer", 500.0, False),
        ]:
            s = Service(name=name, slug=slug, category_id=cat_id, description=desc,
                       required_skills=req_skills, optional_qualifications=opt_quals,
                       verification_required=verify, availability_type=avail,
                       location_rule="at_customer", emergency_support=emergency,
                       base_price=price, is_active=True)
            db.session.add(s)
            services.append(s)
        db.session.flush()

        # --- Skills (22) ---
        skill_objects = []
        for name, slug, cat_id, desc in [
            ("Electrical Wiring", "electrical-wiring", categories[0].id, "Installation and repair of electrical wiring"),
            ("Circuit Repair", "circuit-repair", categories[0].id, "Diagnosis and repair of electrical circuits"),
            ("Power Tools", "power-tools", categories[0].id, "Proficiency with power tools"),
            ("Pipe Repair", "pipe-repair", categories[0].id, "Repair and replacement of plumbing pipes"),
            ("Fixture Installation", "fixture-installation", categories[0].id, "Installation of faucets and fixtures"),
            ("Furniture Making", "furniture-making", categories[0].id, "Custom furniture design and construction"),
            ("Woodwork", "woodwork", categories[0].id, "General woodwork and joinery"),
            ("Wall Painting", "wall-painting", categories[0].id, "Interior and exterior wall painting"),
            ("Deep Cleaning", "deep-cleaning", categories[1].id, "Thorough cleaning of all surfaces"),
            ("Cooking", "cooking", categories[1].id, "Home-style and professional cooking"),
            ("Landscaping", "landscaping", categories[1].id, "Garden design and maintenance"),
            ("Childcare", "childcare", categories[2].id, "Professional care for children"),
            ("Elder Care", "elder-care", categories[2].id, "Specialized care for elderly individuals"),
            ("First Aid", "first-aid", categories[2].id, "Emergency first aid"),
            ("Pet Grooming", "pet-grooming", categories[2].id, "Professional pet grooming"),
            ("Pet Walking", "pet-walking", categories[2].id, "Professional dog walking"),
            ("Driving", "driving", categories[3].id, "Professional driving"),
            ("Navigation", "navigation", categories[3].id, "Route planning and GPS navigation"),
            ("AC Repair", "ac-repair", categories[4].id, "Air conditioner repair"),
            ("Refrigeration", "refrigeration", categories[4].id, "Refrigerator repair"),
            ("Electronics Diagnostics", "electronics-diagnostics", categories[4].id, "Diagnosis and repair of electronics"),
            ("Soldering", "soldering", categories[4].id, "Electronic soldering"),
        ]:
            s = Skill(name=name, slug=slug, category_id=cat_id, description=desc, is_active=True)
            db.session.add(s)
            skill_objects.append(s)
        db.session.flush()
        skill_map = {s.name: s for s in skill_objects}

        # --- Workers (25) ---
        worker_defs = [
            ("Amit Patel", "9800000001", "amit.patel@collabconnect.local", 18.5300, 73.8600, 20, 8, coops[0].id,
             [("Electrical Wiring", "expert", 8), ("Circuit Repair", "expert", 7), ("Power Tools", "intermediate", 5)],
             "Experienced electrician with 8 years of residential and commercial electrical work.", 4.7, 32, True),
            ("Rahul Sharma", "9800000021", "rahul.sharma@collabconnect.local", 18.5100, 73.8700, 18, 5, coops[0].id,
             [("Electrical Wiring", "intermediate", 5), ("Circuit Repair", "intermediate", 4)],
             "Reliable electrician specializing in fan and light repairs.", 4.3, 18, True),
            ("Sanjay Mehta", "9800000022", "sanjay.mehta@collabconnect.local", 18.5400, 73.8500, 25, 12, coops[0].id,
             [("Electrical Wiring", "expert", 12), ("Power Tools", "expert", 10), ("Circuit Repair", "intermediate", 8)],
             "Master electrician with 12 years experience and advanced certifications.", 4.9, 56, True),
            ("Suresh Reddy", "9800000002", "suresh.reddy@collabconnect.local", 18.5150, 73.8500, 15, 5, coops[0].id,
             [("Pipe Repair", "expert", 5), ("Fixture Installation", "intermediate", 4)],
             "Licensed plumber specializing in residential plumbing and leak detection.", 4.5, 24, True),
            ("Vikas Joshi", "9800000023", "vikas.joshi@collabconnect.local", 18.5200, 73.8550, 22, 7, coops[0].id,
             [("Pipe Repair", "expert", 7), ("Fixture Installation", "expert", 6)],
             "Professional plumber with expertise in complex pipe systems.", 4.6, 31, True),
            ("Vikram Singh", "9800000003", "vikram.singh@collabconnect.local", 18.5250, 73.8650, 25, 12, coops[0].id,
             [("Furniture Making", "expert", 12), ("Woodwork", "expert", 10)],
             "Master carpenter with expertise in custom furniture and traditional woodwork.", 4.8, 42, True),
            ("Ramesh Gupta", "9800000024", "ramesh.gupta@collabconnect.local", 18.5350, 73.8400, 18, 6, coops[0].id,
             [("Furniture Making", "intermediate", 6), ("Woodwork", "intermediate", 5)],
             "Skilled carpenter specializing in furniture repair and custom shelving.", 4.2, 20, True),
            ("Priya Verma", "9800000025", "priya.verma@collabconnect.local", 18.5280, 73.8580, 20, 9, coops[0].id,
             [("Wall Painting", "expert", 9), ("Texture Work", "intermediate", 4)],
             "Professional painter with excellent interior and exterior finishing skills.", 4.7, 28, True),
            ("Deepak Nair", "9800000004", "deepak.nair@collabconnect.local", 12.9700, 77.5900, 18, 3, coops[2].id,
             [("Deep Cleaning", "intermediate", 3), ("Organizing", "beginner", 2)],
             "Professional cleaner committed to delivering spotless results.", 4.0, 15, True),
            ("Anita Desai", "9800000026", "anita.desai@collabconnect.local", 12.9750, 77.6000, 22, 6, coops[2].id,
             [("Deep Cleaning", "expert", 6), ("Organizing", "intermediate", 4)],
             "Efficient home organizer and deep cleaning specialist.", 4.5, 30, True),
            ("Manoj Tiwari", "9800000027", "manoj.tiwari@collabconnect.local", 12.9680, 77.5950, 25, 7, coops[2].id,
             [("Landscaping", "expert", 7), ("Plant Care", "intermediate", 5)],
             "Professional gardener with expertise in garden design and maintenance.", 4.4, 22, True),
            ("Meena Devi", "9800000005", "meena.devi@collabconnect.local", 12.9750, 77.6000, 22, 7, coops[2].id,
             [("Childcare", "expert", 7), ("First Aid", "intermediate", 4), ("Elder Care", "expert", 6)],
             "Compassionate caregiver with 7 years experience in childcare and elder care.", 4.8, 38, True),
            ("Sunita Rao", "9800000028", "sunita.rao@collabconnect.local", 12.9720, 77.5980, 20, 10, coops[2].id,
             [("Elder Care", "expert", 10), ("Medication Management", "intermediate", 5), ("First Aid", "expert", 6)],
             "Dedicated elder caregiver with specialized healthcare training.", 4.9, 45, True),
            ("Ravi Kumar", "9800000029", "ravi.kumar@collabconnect.local", 12.9710, 77.6050, 18, 4, coops[2].id,
             [("Pet Grooming", "intermediate", 4), ("Pet Walking", "intermediate", 3)],
             "Loveable pet caretaker with experience in dogs and cats.", 4.3, 20, True),
            ("Kavita Singh", "9800000030", "kavita.singh@collabconnect.local", 12.9730, 77.6020, 20, 5, coops[2].id,
             [("Pet Grooming", "expert", 5), ("Pet Walking", "expert", 4)],
             "Professional pet groomer and walker with 5 years experience.", 4.6, 25, True),
            ("Prakash Yadav", "9800000031", "prakash.yadav@collabconnect.local", 12.9690, 77.5930, 15, 3, coops[2].id,
             [("Pet Walking", "expert", 3), ("Dog Training", "intermediate", 2)],
             "Energetic dog walker with training expertise.", 4.1, 14, True),
            ("Ajay Sharma", "9800000032", "ajay.sharma@collabconnect.local", 28.6139, 77.2090, 25, 6, coops[3].id,
             [("Driving", "expert", 6), ("Navigation", "intermediate", 4)],
             "Professional driver with 6 years of safe driving experience.", 4.5, 35, True),
            ("Rajesh Kumar", "9800000033", "rajesh.kumar@collabconnect.local", 18.5300, 73.8600, 20, 8, coops[0].id,
             [("AC Repair", "expert", 8), ("Refrigeration", "intermediate", 5)],
             "Certified AC technician with 8 years experience.", 4.7, 40, True),
            ("Sachin Patil", "9800000034", "sachin.patel@collabconnect.local", 18.5250, 73.8550, 22, 5, coops[0].id,
             [("AC Repair", "intermediate", 5), ("Electronics Diagnostics", "intermediate", 3)],
             "Reliable AC and electronics repair technician.", 4.2, 22, True),
            ("Mahesh Joshi", "9800000035", "mahesh.joshi@collabconnect.local", 18.5350, 73.8450, 18, 4, coops[0].id,
             [("Electronics Diagnostics", "expert", 4), ("Soldering", "intermediate", 3)],
             "Skilled electronics repair technician.", 4.4, 18, True),
            ("Kavya Nair", "9800000036", "kavya.nair@collabconnect.local", 13.0827, 80.2707, 15, 5, coops[4].id,
             [("Cooking", "intermediate", 5), ("Deep Cleaning", "intermediate", 4)],
             "Reliable domestic helper with cooking and cleaning skills.", 4.3, 26, True),
            ("Dinesh Babu", "9800000037", "dinesh.babu@collabconnect.local", 23.0225, 72.5714, 25, 10, coops[5].id,
             [("Driving", "expert", 10), ("Navigation", "expert", 8)],
             "Experienced driver with commercial license and 10 years experience.", 4.8, 50, True),
            ("Rohit Verma", "9800000038", "rohit.verma@collabconnect.local", 18.5200, 73.8500, 20, 4, coops[0].id,
             [("Electrical Wiring", "intermediate", 4), ("AC Repair", "intermediate", 3)],
             "Multi-skilled technician handling electrical and AC repairs.", 4.1, 16, True),
            ("Pooja Sharma", "9800000039", "pooja.sharma@collabconnect.local", 12.9740, 77.5980, 22, 6, coops[2].id,
             [("Childcare", "intermediate", 6), ("Elder Care", "intermediate", 4)],
             "Versatile caregiver for both children and elderly.", 4.5, 22, True),
            ("Chetan Patel", "9800000040", "chetan.patel@collabconnect.local", 28.6140, 77.2100, 25, 7, coops[3].id,
             [("Driving", "expert", 7), ("Navigation", "intermediate", 5)],
             "Delivery driver with excellent route knowledge.", 4.3, 28, True),
        ]

        workers = []
        for wd in worker_defs:
            name, phone, email, lat, lng, area, exp, coop_id, skills, bio, rating, completed, verified = wd
            u = User(email=email, phone=phone, name=name, role="worker", is_active=True, is_verified=True)
            u.set_password(demo_password)
            db.session.add(u)
            db.session.flush()

            worker = Worker(
                user_id=u.id, cooperative_id=coop_id, name=name, phone=phone, email=email,
                latitude=lat, longitude=lng, service_area_km=area,
                verification_status="verified" if verified else "pending",
                verification_date=datetime.now(timezone.utc) if verified else None,
                verification_notes="Verified during demo seeding",
                experience_years=exp, current_workload=0, max_workload=5,
                is_available=True, total_completed_services=completed,
                average_rating=rating, bio=bio
            )
            db.session.add(worker)
            workers.append(worker)
            db.session.flush()

            for skill_name, prof, years in skills:
                skill_obj = skill_map.get(skill_name)
                if skill_obj:
                    ws = WorkerSkill(worker_id=worker.id, skill_id=skill_obj.id, proficiency=prof, years_experience=years, is_verified=True)
                    db.session.add(ws)

            for day in range(7):
                avail = WorkerAvailability(worker_id=worker.id, day_of_week=day,
                                          start_time=time(8, 0), end_time=time(18, 0),
                                          is_available=day < 6,
                                          effective_from=date.today(),
                                          effective_until=date.today() + timedelta(days=30))
                db.session.add(avail)

        db.session.flush()

        # Give the worker@demo.com user a Worker record in the demo cooperative with
        # electrical skills so the matching engine can rank them for electrician jobs.
        if demo_worker_user:
            demo_worker = Worker.query.filter_by(user_id=demo_worker_user.id).first()
            if not demo_worker:
                demo_worker = Worker(
                    user_id=demo_worker_user.id,
                    cooperative_id=coops[0].id,
                    name=demo_worker_user.name,
                    phone=demo_worker_user.phone,
                    email=demo_worker_user.email,
                    latitude=18.5204,
                    longitude=73.8567,
                    service_area_km=25.0,
                    verification_status="verified",
                    verification_date=datetime.now(timezone.utc),
                    verification_notes="Demo worker seeded for the demo cooperative",
                    experience_years=3,
                    current_workload=0,
                    max_workload=5,
                    is_available=True,
                    total_completed_services=18,
                    average_rating=4.6,
                    bio="Demo electrician in the CO-LAB Demo Cooperative.",
                )
                db.session.add(demo_worker)
                db.session.flush()
            else:
                demo_worker.cooperative_id = coops[0].id
                demo_worker.verification_status = "verified"
                demo_worker.is_available = True
            for skill_name in ("Electrical Wiring", "Circuit Repair", "Power Tools"):
                skill_obj = skill_map.get(skill_name)
                if skill_obj and not WorkerSkill.query.filter_by(
                    worker_id=demo_worker.id, skill_id=skill_obj.id
                ).first():
                    db.session.add(WorkerSkill(
                        worker_id=demo_worker.id, skill_id=skill_obj.id,
                        proficiency="expert", years_experience=5, is_verified=True,
                    ))
            for day in range(7):
                if not WorkerAvailability.query.filter_by(
                    worker_id=demo_worker.id, day_of_week=day
                ).first():
                    db.session.add(WorkerAvailability(
                        worker_id=demo_worker.id, day_of_week=day,
                        start_time=time(8, 0), end_time=time(18, 0),
                        is_available=day < 6,
                        effective_from=date.today(),
                        effective_until=date.today() + timedelta(days=30),
                    ))
        db.session.flush()

        # --- Customers (15) ---
        customers = []
        customer_coords = {}
        for name, phone, email, lat, lng in [
            ("Anjali Mehta", "9700000001", "anjali.mehta@collabconnect.local", 18.5250, 73.8580),
            ("Rahul Joshi", "9700000002", "rahul.joshi@collabconnect.local", 18.5350, 73.8450),
            ("Sanjay Gupta", "9700000003", "sanjay.gupta@collabconnect.local", 12.9710, 77.6050),
            ("Priya Sharma", "9700000004", "priya.sharma@collabconnect.local", 12.9750, 77.6000),
            ("Vikram Singh", "9700000005", "vikram.cust@collabconnect.local", 28.6139, 77.2090),
            ("Kavita Joshi", "9700000006", "kavita.joshi@collabconnect.local", 18.5200, 73.8500),
            ("Amit Kumar", "9700000007", "amit.kumar@collabconnect.local", 18.5300, 73.8550),
            ("Neha Patel", "9700000008", "neha.patel@collabconnect.local", 13.0827, 80.2707),
            ("Rakesh Tiwari", "9700000009", "rakesh.tiwari@collabconnect.local", 23.0225, 72.5714),
            ("Sunita Verma", "9700000010", "sunita.verma@collabconnect.local", 18.5280, 73.8580),
            ("Chetan Desai", "9700000011", "chetan.desai@collabconnect.local", 12.9700, 77.5900),
            ("Divya Shah", "9700000012", "divya.shah@collabconnect.local", 18.5350, 73.8450),
            ("Manoj Tiwari", "9700000013", "manoj.cust@collabconnect.local", 12.9680, 77.5950),
            ("Pooja Nair", "9700000014", "pooja.nair@collabconnect.local", 13.0827, 80.2707),
            ("Suresh Kulkarni", "9700000015", "suresh.kulkarni@collabconnect.local", 18.5150, 73.8500),
        ]:
            c = User(email=email, phone=phone, name=name, role="customer", is_active=True, is_verified=True)
            c.set_password(demo_password)
            db.session.add(c)
            customers.append(c)
            customer_coords[email] = (lat, lng)
        db.session.flush()

        # --- Service Requests (18) ---
        sr_defs = [
            # 3 PENDING
            (customers[0], services[0], coops[0], "Fan making noise in bedroom, needs repair", date.today() + timedelta(days=2), time(10, 0), "normal", "pending"),
            (customers[1], services[1], coops[0], "Kitchen sink leaking badly", date.today() + timedelta(days=1), time(9, 0), "urgent", "pending"),
            (customers[2], services[7], coops[1], "Need nanny for 2-year-old twins", date.today() + timedelta(days=5), time(14, 0), "normal", "pending"),
            # 3 ALLOCATED
            (customers[3], services[0], coops[0], "New power socket installation", date.today() + timedelta(days=3), time(11, 0), "normal", "allocated"),
            (customers[4], services[1], coops[1], "Bathroom pipe replacement", date.today() + timedelta(days=2), time(10, 0), "normal", "allocated"),
            (customers[5], services[9], coops[1], "Pet sitting needed for 2 weeks", date.today() + timedelta(days=4), time(9, 0), "normal", "allocated"),
            # 3 ACCEPTED
            (customers[6], services[2], coops[0], "Custom wooden bookshelf", date.today(), time(10, 0), "normal", "accepted"),
            (customers[7], services[4], coops[1], "Deep cleaning of 3-bedroom house", date.today(), time(9, 0), "normal", "accepted"),
            (customers[8], services[11], coops[2], "Local delivery from Pune to Mumbai", date.today(), time(8, 0), "urgent", "accepted"),
            # 2 EN_ROUTE
            (customers[9], services[0], coops[0], "LED light installation", date.today(), time(14, 0), "normal", "en_route"),
            (customers[10], services[12], coops[0], "AC not cooling properly", date.today(), time(15, 0), "urgent", "en_route"),
            # 2 IN_PROGRESS
            (customers[11], services[4], coops[1], "Office deep cleaning", date.today(), time(10, 0), "normal", "in_progress"),
            (customers[12], services[8], coops[1], "Elder care for my grandmother", date.today(), time(9, 0), "normal", "in_progress"),
            # 4 COMPLETED
            (customers[0], services[0], coops[0], "Full house wiring repair", date.today() - timedelta(days=5), time(10, 0), "normal", "completed"),
            (customers[1], services[1], coops[0], "Kitchen pipe replacement", date.today() - timedelta(days=3), time(9, 0), "urgent", "completed"),
            (customers[3], services[7], coops[1], "Nanny for 2 weeks", date.today() - timedelta(days=7), time(8, 0), "normal", "completed"),
            (customers[4], services[2], coops[0], "Carpentry repair", date.today() - timedelta(days=2), time(11, 0), "normal", "completed"),
            # 2 CANCELLED
            (customers[5], services[3], coops[0], "Bedroom painting cancelled", date.today() - timedelta(days=1), time(10, 0), "normal", "cancelled"),
            (customers[6], services[11], coops[2], "Driver booking cancelled", date.today() - timedelta(days=4), time(9, 0), "normal", "cancelled"),
        ]

        requests = []
        for i, (cust, svc, coop, desc, pref_date, pref_time, urgency, status) in enumerate(sr_defs):
            cust_lat, cust_lng = customer_coords.get(cust.email, (18.5204, 73.8567))
            sr = ServiceRequest(
                customer_id=cust.id, service_id=svc.id, cooperative_id=coop.id,
                description=desc, location_address=f"Customer address {i+1}",
                location_lat=cust_lat, location_lng=cust_lng,
                preferred_date=pref_date, preferred_time_start=pref_time,
                urgency=urgency, status=status,
                created_at=datetime.now(timezone.utc) - timedelta(days=i)
            )
            db.session.add(sr)
            requests.append(sr)
        db.session.flush()

        # --- Allocations ---
        for i, sr in enumerate(requests):
            if sr.status in ("allocated", "accepted", "en_route", "in_progress", "completed"):
                available = [w for w in workers if w.cooperative_id == sr.cooperative_id and w.verification_status == "verified" and w.is_available]
                if available:
                    worker = available[i % len(available)]
                    alloc = Allocation(
                        request_id=sr.id, worker_id=worker.id, cooperative_id=sr.cooperative_id,
                        admin_user_id=(coop_by_id.get(sr.cooperative_id).admin_user_id
                                       if coop_by_id.get(sr.cooperative_id) else 1),
                        recommendation_score=round(0.7 + (i * 0.05), 4),
                        allocation_reason=f"AI recommended worker for {sr.service.name}",
                        status="accepted",
                        allocated_at=datetime.now(timezone.utc) - timedelta(days=i),
                        created_at=datetime.now(timezone.utc) - timedelta(days=i)
                    )
                    db.session.add(alloc)
                    sr.allocated_worker_id = worker.id
                    sr.allocation_id = alloc.id
                    if sr.status == "allocated":
                        sr.status = "accepted"
                    worker.current_workload += 1
                    db.session.flush()
        db.session.flush()

        # --- Bookings ---
        bookings = []
        completed_count = 0
        for i, sr in enumerate(requests):
            if sr.status in ("accepted", "en_route", "in_progress", "completed", "cancelled"):
                alloc = Allocation.query.filter_by(request_id=sr.id).first()
                status_map = {"accepted": "accepted", "en_route": "en_route", "in_progress": "in_progress", "completed": "completed", "cancelled": "cancelled"}
                booking_status = status_map.get(sr.status, "accepted")
                alloc_worker_id = sr.allocated_worker_id or workers[i % len(workers)].id

                total_price = sr.service.base_price or 500
                material_charges = float(i % 3 == 0) * 150.0
                final_amount = total_price + material_charges

                booking = Booking(
                    request_id=sr.id, allocation_id=alloc.id if alloc else None,
                    worker_id=alloc_worker_id,
                    customer_id=sr.customer_id, cooperative_id=sr.cooperative_id,
                    service_date=sr.preferred_date, time_start=sr.preferred_time_start,
                    time_end=sr.preferred_time_end or time(12, 0),
                    status=booking_status, total_amount=total_price,
                    material_charges=material_charges, final_amount=final_amount,
                    created_at=datetime.now(timezone.utc) - timedelta(days=i)
                )
                db.session.add(booking)
                bookings.append(booking)
                db.session.flush()

                if booking_status == "completed":
                    completed_count += 1
                    parts = compute_invoice(
                        service_amount=total_price,
                        material_charges=material_charges,
                        commission_rate=app.config.get("COMMISSION_RATE", 0.10),
                        welfare_rate=app.config.get("WELFARE_RATE", 0.02),
                        tax_rate=app.config.get("TAX_RATE", 0.0),
                        commission_applies_to_material=False,
                    )
                    payment = Payment(booking_id=booking.id, amount=parts["net_amount"],
                                     payment_method="upi", transaction_reference=f"TXN-{i:05d}",
                                     status="completed", paid_at=datetime.now(timezone.utc) - timedelta(days=max(i-1, 1)))
                    db.session.add(payment)
                    db.session.flush()

                    invoice = Invoice(booking_id=booking.id, invoice_number=f"INV-202609-{i:05d}",
                                     service_charges=float(parts["service_amount"]), material_charges=float(parts["material_charges"]),
                                     commission_amount=float(parts["commission_amount"]), welfare_amount=float(parts["welfare_amount"]),
                                     worker_payout=float(parts["worker_payout"]), total_amount=float(parts["net_amount"]),
                                     tax_amount=float(parts["tax_amount"]), net_amount=float(parts["net_amount"]),
                                     payment_status="paid", issued_at=datetime.now(timezone.utc) - timedelta(days=i))
                    db.session.add(invoice)
                    db.session.flush()

                    rating_vals = [5, 4, 5, 4, 3, 5, 4, 5]
                    feedback_opts = [
                        "Excellent service and completed on time.", "Good service and communication.",
                        "Very professional.", "Done well, would recommend.", "Average, could improve.",
                        "Outstanding work!", "Reliable and fast.", "Highly satisfied.",
                    ]
                    rv_index = (completed_count - 1) % len(rating_vals)
                    rating = Rating(booking_id=booking.id, customer_id=sr.customer_id,
                                   worker_id=alloc_worker_id,
                                   rating=rating_vals[rv_index], feedback=feedback_opts[rv_index],
                                   service_quality=rating_vals[rv_index],
                                   punctuality=rating_vals[rv_index] if rv_index < 6 else 4,
                                   professionalism=rating_vals[rv_index] if rv_index < 7 else 3,
                                   created_at=datetime.now(timezone.utc) - timedelta(days=i))
                    db.session.add(rating)
                    db.session.flush()
                    all_r = Rating.query.filter_by(worker_id=rating.worker_id).all()
                    if all_r:
                        w = Worker.query.get(rating.worker_id)
                        if w:
                            w.average_rating = round(sum(r.rating for r in all_r) / len(all_r), 2)

                    history = ServiceHistory(customer_id=sr.customer_id, worker_id=alloc_worker_id,
                                            cooperative_id=sr.cooperative_id, booking_id=booking.id,
                                            service_name=sr.service.name, service_date=booking.service_date,
                                            amount=final_amount, rating=rating_vals[rv_index],
                                            created_at=datetime.now(timezone.utc) - timedelta(days=i))
                    db.session.add(history)

                    notif1 = Notification(user_id=sr.customer_id, title="Service Completed",
                                         message=f"Your {sr.service.name} booking completed.",
                                         type="booking_update", reference_type="booking", reference_id=booking.id,
                                         created_at=datetime.now(timezone.utc) - timedelta(days=i))
                    notif2 = Notification(user_id=alloc_worker_id,
                                         title="Booking Completed",
                                         message=f"Your {sr.service.name} booking is completed.",
                                         type="booking_update", reference_type="booking", reference_id=booking.id,
                                         created_at=datetime.now(timezone.utc) - timedelta(days=i))
                    db.session.add_all([notif1, notif2])

                elif booking_status in ("accepted", "en_route", "in_progress") and i < 12:
                    title = {"accepted": "Worker Accepted", "en_route": "Worker En Route", "in_progress": "Service Started"}[booking_status]
                    msg = f"The worker has {booking_status} your {sr.service.name} booking."
                    notif = Notification(user_id=sr.customer_id, title=title, message=msg,
                                        type="booking_update", reference_type="booking", reference_id=booking.id,
                                        created_at=datetime.now(timezone.utc) - timedelta(days=i))
                    db.session.add(notif)

                elif booking_status == "cancelled":
                    notif = Notification(user_id=sr.customer_id, title="Booking Cancelled",
                                        message=f"Your {sr.service.name} booking has been cancelled.",
                                        type="booking_update", reference_type="booking", reference_id=booking.id,
                                        created_at=datetime.now(timezone.utc) - timedelta(days=i))
                    db.session.add(notif)

        db.session.flush()

        # --- Welfare records ---
        for worker in workers[:10]:
            welfare = WorkerWelfare(worker_id=worker.id, scheme_name="General Worker Welfare",
                                   provider="CO-LAB Federation", enrollment_status="active",
                                   coverage_details="Basic healthcare and accident insurance",
                                   start_date=date.today() - timedelta(days=30),
                                   emergency_contact="9100000000",
                                   created_at=datetime.now(timezone.utc) - timedelta(days=60))
            db.session.add(welfare)
        db.session.flush()

        # --- Demand records ---
        for svc in services[:6]:
            for coop in coops[:3]:
                dr = DemandRecord(service_id=svc.id, cooperative_id=coop.id, region=coop.name,
                                 request_count=10 + (svc.id % 5) * 3, fulfilled_count=8 + (svc.id % 5) * 2,
                                 unmet_count=2 + (svc.id % 5), created_at=datetime.now(timezone.utc) - timedelta(days=30))
                db.session.add(dr)
        db.session.flush()

        # Cooperative admins were assigned right after coops were created.
        db.session.commit()

        print("="*60)
        print("CO-LAB CONNECT DEMO SEED COMPLETE")
        print("="*60)
        print(f"  Federations: {len(feds)}")
        print(f"  Cooperatives: {len(coops)}")
        print(f"  Service Categories: {len(categories)}")
        print(f"  Services: {len(services)}")
        print(f"  Skills: {len(skill_objects)}")
        print(f"  Workers: {len(workers)}")
        print(f"  Customers: {len(customers)}")
        print(f"  Service Requests: {len(requests)}")
        print(f"  Bookings: {len(bookings)}")
        print()
        print("WORKERS BY CATEGORY:")
        cats = {}
        cat_name_by_id = {c.id: c.name for c in categories}
        for w in workers:
            for s in w.skills:
                c = cat_name_by_id.get(s.skill.category_id, "Unknown")
                cats.setdefault(c, []).append(w.name)
        for cat, names in sorted(cats.items()):
            print(f"  {cat}: {len(names)}")
        print()
        print("DEMO LOGIN CREDENTIALS:")
        print(f"  Password: {demo_password}")
        print(f"  Platform Admin: {admins[0].email}")
        demo_emails = [
            f"  {role:<18} {email}" for email, role, name, phone in [
                ("customer@demo.com", "Customer", "Customer Demo", "9000000101"),
                ("worker@demo.com", "Worker", "Worker Demo", "9000000102"),
                ("coop@demo.com", "Coop Admin", "Coop Demo", "9000000103"),
                ("federation@demo.com", "Fed Admin", "Federation Demo", "9000000104"),
            ]
        ]
        print("\n".join(demo_emails))
        print(f"  Coop Admins: {admins[4].email}, {admins[5].email}")
        print(f"  Fed Admins: {admins[1].email}, {admins[2].email}")
        print()
        print("BOOKING STATUS BREAKDOWN:")
        statuses = Counter(b.status for b in bookings)
        for status, count in sorted(statuses.items()):
            print(f"  {status}: {count}")
        print("="*60)


if __name__ == "__main__":
    seed()
