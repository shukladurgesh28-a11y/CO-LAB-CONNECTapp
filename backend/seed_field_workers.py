"""Ensure 3 verified workers per service field in the demo cooperative.

Idempotent: for each active service, counts verified+available workers in
cooperative #1 holding at least one of the service's required skills and
tops up to 3 by creating new verified workers. Safe to re-run (no dupes).

Run:  python seed_field_workers.py
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.cooperative import Cooperative
from app.models.service import Service, Skill
from app.models.user import User
from app.models.worker import Worker, WorkerSkill

TARGET_PER_SERVICE = 3
COOP_ID = 1

FIRST = ["Aarav", "Vivaan", "Aditya", "Arjun", "Sai", "Reyansh", "Krishna",
         "Ishaan", "Rohan", "Kabir", "Ananya", "Diya", "Aadhya", "Myra",
         "Sara", "Ira", "Priya", "Neha", "Kavya", "Anika", "Divya", "Pooja",
         "Rahul", "Amit", "Suresh", "Manoj", "Rajesh", "Vikram", "Sanjay",
         "Deepak", "Anita", "Sunita", "Meena", "Kavita", "Ravi", "Ajay"]
LAST = ["Sharma", "Verma", "Patel", "Iyer", "Reddy", "Nair", "Gupta",
        "Mehta", "Joshi", "Desai", "Kulkarni", "Pawar", "Singh", "Yadav"]


def norm(value):
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def skill_names(entry):
    if isinstance(entry, dict):
        return [entry.get("name", ""), entry.get("slug", "")]
    return [entry]


def seed():
    app = create_app()
    with app.app_context():
        coop = Cooperative.query.get(COOP_ID)
        if not coop:
            print("Cooperative #1 not found.")
            return
        used_phones = {u.phone for u in User.query.all()}
        used_emails = {u.email for u in User.query.all()}
        phone_seq = [9820000001]
        name_idx = [0]

        def fresh_phone():
            while str(phone_seq[0]) in used_phones:
                phone_seq[0] += 1
            phone = str(phone_seq[0])
            phone_seq[0] += 1
            used_phones.add(phone)
            return phone

        def fresh_email(first, last):
            base = f"{first.lower()}.{last.lower()}"
            email, n = f"{base}@collabconnect.local", 2
            while email in used_emails:
                email = f"{base}{n}@collabconnect.local"
                n += 1
            used_emails.add(email)
            return email

        def fresh_name():
            first = FIRST[name_idx[0] % len(FIRST)]
            last = LAST[(name_idx[0] // len(FIRST)) % len(LAST)]
            name_idx[0] += 1
            return first, last

        services = Service.query.filter_by(is_active=True).order_by(Service.id).all()
        for service in services:
            required = []
            for entry in service.required_skills or []:
                required.extend(skill_names(entry))
            required = [r for r in required if r]
            wanted = {norm(r) for r in required} | {norm(service.name), norm(service.slug)}

            # Ensure Skill rows exist for matching.
            skill_rows = []
            for raw in required:
                slug = norm(raw) or re.sub(r"\s+", "-", str(raw).strip().lower())
                skill = Skill.query.filter_by(slug=slug).first()
                if not skill:
                    skill = Skill(name=str(raw).strip(), slug=slug,
                                  category_id=service.category_id, is_active=True)
                    db.session.add(skill)
                    db.session.flush()
                skill_rows.append(skill)

            covered = 0
            for worker in Worker.query.filter_by(
                    cooperative_id=coop.id, verification_status="verified",
                    is_available=True).all():
                have = {norm(ws.skill.name) for ws in worker.skills if ws.skill}
                have |= {norm(ws.skill.slug) for ws in worker.skills if ws.skill}
                if have & wanted:
                    covered += 1

            need = max(0, TARGET_PER_SERVICE - covered)
            for _ in range(need):
                first, last = fresh_name()
                name = f"{first} {last}"
                phone = fresh_phone()
                user = User(email=fresh_email(first, last), phone=phone,
                            name=name, role="worker",
                            is_active=True, is_verified=True)
                user.set_password("CoLab!Demo2026")
                db.session.add(user)
                db.session.flush()
                worker = Worker(
                    user_id=user.id, cooperative_id=coop.id, name=name,
                    phone=phone, email=user.email,
                    latitude=18.5204, longitude=73.8567, service_area_km=25.0,
                    verification_status="verified", is_available=True,
                    experience_years=2 + (name_idx[0] % 4),
                )
                db.session.add(worker)
                db.session.flush()
                for skill in skill_rows:
                    if not WorkerSkill.query.filter_by(
                            worker_id=worker.id, skill_id=skill.id).first():
                        db.session.add(WorkerSkill(
                            worker_id=worker.id, skill_id=skill.id,
                            proficiency="intermediate", years_experience=2,
                            is_verified=True))
            db.session.commit()
            print(f"{service.slug}: had {covered}, added {need} (now {covered + need})")
        print("Field coverage seed complete.")


if __name__ == "__main__":
    seed()
