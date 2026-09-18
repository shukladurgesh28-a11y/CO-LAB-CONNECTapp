"""Seed 5 demo Society Workforce Requirements (idempotent).

Run:  python seed_workforce_demo.py
Existing requirements with the same titles are skipped, so running twice
creates no duplicates. Uses the same models/APIs as production data.
"""
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.cooperative import Cooperative
from app.models.service import Service
from app.models.worker import Worker
from app.models.workforce import (
    WorkforceRequirement, WorkforceItem, WorkforceAllocation,
)


def _get(model, **kwargs):
    return model.query.filter_by(**kwargs).first()


def _ensure_requirement(coop, title, **kwargs):
    existing = WorkforceRequirement.query.filter_by(
        cooperative_id=coop.id, title=title).first()
    if existing:
        print(f"  skip (exists): {title}")
        return existing, False
    req = WorkforceRequirement(cooperative_id=coop.id,
                               federation_id=coop.federation_id, **kwargs)
    req.title = title
    db.session.add(req)
    db.session.flush()
    print(f"  created: {title}")
    return req, True


def _add_item(req, service_slug, quantity, days, experience=1, priority="normal",
              skill=None, start_offset=2):
    service = _get(Service, slug=service_slug)
    if not service:
        print(f"  ! service missing: {service_slug}")
        return None
    start = date.today() + timedelta(days=start_offset)
    item = WorkforceItem(
        requirement_id=req.id, service_id=service.id,
        quantity_required=quantity,
        skill_requirement=skill or service_slug.replace("-", " "),
        minimum_experience=experience,
        start_date=start, end_date=start + timedelta(days=days - 1),
        working_hours_per_day=8.0, priority=priority,
        special_requirements=f"Demo: {quantity}x {service.name} for {days} days",
    )
    db.session.add(item)
    db.session.flush()
    return item


def _allocate(item, workers, accept=0):
    made = []
    for w in workers[:item.quantity_required]:
        if _get(WorkforceAllocation, workforce_item_id=item.id, worker_id=w.id):
            continue
        a = WorkforceAllocation(
            workforce_item_id=item.id, worker_id=w.id,
            allocated_by=None, status="offered",
            start_date=item.start_date, end_date=item.end_date,
        )
        db.session.add(a)
        made.append(a)
    db.session.flush()
    for a in made[:accept]:
        a.status = "accepted"
    item.refresh_status()
    return made


def seed():
    app = create_app()
    with app.app_context():
        coop = Cooperative.query.filter_by(is_active=True).order_by(Cooperative.id).first()
        if not coop:
            print("No active cooperative found; run seed_data.py first.")
            return
        workers = Worker.query.filter_by(
            cooperative_id=coop.id, verification_status="verified",
            is_available=True).order_by(Worker.id).all()
        if len(workers) < 5:
            print(f"Only {len(workers)} verified workers; run seed_data.py first.")
            return

        # 1. Multi-category renovation (partially fulfilled)
        req1, fresh = _ensure_requirement(
            coop, "Society Building Renovation",
            description="Full renovation: wiring, plumbing, painting and cleanup.",
            work_type="Construction", location_address="Sahayak Heights, Pune",
            latitude=18.5204, longitude=73.8567,
            start_date=date.today() + timedelta(days=2),
            end_date=date.today() + timedelta(days=11),
            daily_start_time=None, daily_end_time=None, status="MATCHING")
        if fresh:
            i1 = _add_item(req1, "electrician", 3, 5, experience=2, priority="high")
            i2 = _add_item(req1, "plumber", 2, 7, experience=1)
            i3 = _add_item(req1, "painter", 4, 10, experience=2)
            i4 = _add_item(req1, "cleaner", 3, 4, experience=0)
            _allocate(i1, workers[0:5], accept=3)   # electricians full
            _allocate(i2, workers[5:8], accept=1)   # plumbers partial
            # painters + cleaners stay pending
            for item in (i1, i2, i3, i4):
                item.refresh_status()
            req1.refresh_status()
            if req1.status == "MATCHING":
                req1.status = "PARTIALLY_FULFILLED"

        # 2. Single-category event (fully fulfilled)
        req2, fresh = _ensure_requirement(
            coop, "Festival Event Setup",
            description="Single-category: venue cleaning crew.",
            work_type="Event", location_address="Community Hall, Pune",
            latitude=18.5210, longitude=73.8570,
            start_date=date.today() + timedelta(days=3),
            end_date=date.today() + timedelta(days=4), status="MATCHING")
        if fresh:
            item = _add_item(req2, "cleaner", 2, 2, experience=0)
            _allocate(item, workers[8:12], accept=2)
            item.refresh_status()
            req2.refresh_status()
            if req2.status == "MATCHING":
                req2.status = "FULLY_FULFILLED"

        # 3. Monsoon maintenance (mixed durations)
        req3, fresh = _ensure_requirement(
            coop, "Monsoon Maintenance Drive",
            description="Pre-monsoon electrical + plumbing checks.",
            work_type="Maintenance", location_address="Block C, Pune",
            latitude=18.5190, longitude=73.8550,
            start_date=date.today() + timedelta(days=5),
            end_date=date.today() + timedelta(days=12), status="MATCHING")
        if fresh:
            i1 = _add_item(req3, "electrician", 2, 6, experience=1)
            i2 = _add_item(req3, "plumber", 3, 8, experience=1, priority="urgent")
            _allocate(i1, workers[12:15], accept=2)
            _allocate(i2, workers[15:19], accept=2)
            for item in (i1, i2):
                item.refresh_status()
            req3.refresh_status()
            if req3.status == "MATCHING":
                req3.status = "PARTIALLY_FULFILLED"

        # 4. Completed school cleaning
        req4, fresh = _ensure_requirement(
            coop, "School Deep Cleaning",
            description="Completed deep-cleaning drive.",
            work_type="Cleaning", location_address="Zilla Parishad School, Pune",
            start_date=date.today() - timedelta(days=10),
            end_date=date.today() - timedelta(days=7), status="WORK_IN_PROGRESS")
        if fresh:
            item = _add_item(req4, "cleaner", 2, 4, experience=0, start_offset=-10)
            made = _allocate(item, workers[19:22] if len(workers) > 21 else workers[0:2], accept=2)
            for a in made:
                a.status = "completed"
            item.refresh_status()
            req4.status = "COMPLETED"

        # 5. Draft repair (not yet submitted)
        req5, fresh = _ensure_requirement(
            coop, "Office Block Repair",
            description="Draft: lift lobby and corridor repairs.",
            work_type="Repair", location_address="Admin Block, Pune",
            start_date=date.today() + timedelta(days=6),
            end_date=date.today() + timedelta(days=9), status="DRAFT")
        if fresh:
            _add_item(req5, "carpenter", 2, 4, experience=2)
            _add_item(req5, "painter", 1, 3, experience=1)

        db.session.commit()
        print("Workforce demo seed complete.")


if __name__ == "__main__":
    seed()
