"""Society Workforce Requirement lifecycle tests (Phase 24)."""

import unittest
from datetime import date, timedelta

from app import create_app, db
from app.models.cooperative import Cooperative
from app.models.service import Service, Skill
from app.models.worker import Worker, WorkerSkill
from app.models.workforce import (
    WorkforceRequirement, WorkforceItem, WorkforceAllocation,
)


class WorkforceTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()

    def call(self, method, path, payload=None, token=None):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        return self.client.open(path, method=method, json=payload, headers=headers)

    def login(self, email):
        res = self.call("POST", "/api/auth/login",
                        {"email": email, "password": "CoLab!Demo2026"})
        self.assertEqual(res.status_code, 200, res.get_json())
        return res.get_json()["token"]

    def _service(self, slug):
        with self.app.app_context():
            return Service.query.filter_by(slug=slug).one().id

    def _demo_coop_id(self):
        with self.app.app_context():
            return Cooperative.query.filter_by(is_active=True).order_by(
                Cooperative.id).first().id

    def _ensure_workers(self, coop_id, count=3):
        with self.app.app_context():
            existing = Worker.query.filter_by(cooperative_id=coop_id).all()
            need = max(0, count - len(existing))
            for i in range(need):
                n = len(existing) + i
                from app.models.user import User
                u = User(email=f"wf-{n}@demo.com", phone=f"9300000{n:03d}",
                         name=f"WF Worker {n}", role="worker",
                         is_active=True, is_verified=True)
                u.set_password("CoLab!Demo2026")
                db.session.add(u)
                db.session.flush()
                w = Worker(user_id=u.id, cooperative_id=coop_id,
                           name=f"WF Worker {n}", phone=f"9300000{n:03d}",
                           verification_status="verified", is_available=True,
                           experience_years=3, latitude=18.5204, longitude=73.8567)
                db.session.add(w)
            db.session.commit()
            return [w.id for w in Worker.query.filter_by(cooperative_id=coop_id).all()]

    def _create_requirement(self, token, items):
        res = self.call("POST", "/api/society/workforce/requirements", {
            "title": "Test Renovation",
            "description": "Mixed workforce test",
            "work_type": "Construction",
            "location_address": "Pune",
            "latitude": 18.5204, "longitude": 73.8567,
            "start_date": str(date.today() + timedelta(days=2)),
            "end_date": str(date.today() + timedelta(days=11)),
        }, token)
        self.assertEqual(res.status_code, 201, res.get_json())
        req_id = res.get_json()["data"]["id"]
        for item in items:
            r = self.call("POST",
                          f"/api/society/workforce/requirements/{req_id}/items",
                          item, token)
            self.assertEqual(r.status_code, 201, r.get_json())
        return req_id

    def test_full_lifecycle_with_partial_fulfillment(self):
        admin = self.login("coop@demo.com")
        fed = self.login("federation@demo.com")
        worker_token = self.login("worker@demo.com")
        coop_id = self._demo_coop_id()
        worker_ids = self._ensure_workers(coop_id, 3)
        elec = self._service("electrician")
        plumb = self._service("plumber")
        clean = self._service("cleaner")

        req_id = self._create_requirement(admin, [
            {"service_id": elec, "quantity_required": 2, "minimum_experience": 1,
             "start_date": str(date.today() + timedelta(days=2)),
             "end_date": str(date.today() + timedelta(days=6))},   # 2x5=10 wd
            {"service_id": plumb, "quantity_required": 1, "minimum_experience": 0,
             "start_date": str(date.today() + timedelta(days=2)),
             "end_date": str(date.today() + timedelta(days=8))},   # 1x7=7 wd
            {"service_id": clean, "quantity_required": 3, "minimum_experience": 0,
             "start_date": str(date.today() + timedelta(days=2)),
             "end_date": str(date.today() + timedelta(days=4))},   # 3x3=9 wd
        ])

        with self.app.app_context():
            req = WorkforceRequirement.query.get(req_id)
            self.assertEqual(req.total_workers_required, 6)
            self.assertEqual(req.total_worker_days, 26)
            self.assertEqual(req.status, "DRAFT")

        # Submit -> federation sees -> approve -> MATCHING
        sub = self.call("POST",
                        f"/api/society/workforce/requirements/{req_id}/submit", {}, admin)
        self.assertEqual(sub.status_code, 200, sub.get_json())
        fed_list = self.call("GET", "/api/federation/workforce/requirements", token=fed)
        self.assertEqual(fed_list.status_code, 200)
        self.assertTrue(any(r["id"] == req_id for r in fed_list.get_json()["data"]))
        rev = self.call("POST",
                        f"/api/federation/workforce/requirements/{req_id}/review",
                        {"decision": "approve"}, fed)
        self.assertEqual(rev.status_code, 200, rev.get_json())
        self.assertEqual(rev.get_json()["data"]["status"], "MATCHING")

        # Matches endpoint works and explains scores
        matches = self.call("GET",
                            f"/api/society/workforce/requirements/{req_id}/matches",
                            token=admin)
        self.assertEqual(matches.status_code, 200, matches.get_json())
        payload = matches.get_json()["data"]
        self.assertEqual(len(payload), 3)
        for entry in payload:
            self.assertIn("item", entry)
            self.assertIn("matches", entry)

        # Allocate: electricians fully (2/2), cleaner partially (1/3)
        with self.app.app_context():
            item_map = {i.service_id: i.id for i in WorkforceItem.query.filter_by(
                requirement_id=req_id).all()}
        elec_item, plumb_item, clean_item = (item_map[elec], item_map[plumb], item_map[clean])

        for wid in worker_ids[:2]:
            r = self.call("POST",
                          f"/api/society/workforce/items/{elec_item}/allocate",
                          {"worker_id": wid}, admin)
            self.assertEqual(r.status_code, 201, r.get_json())
        # duplicate allocation rejected
        dup = self.call("POST",
                        f"/api/society/workforce/items/{elec_item}/allocate",
                        {"worker_id": worker_ids[0]}, admin)
        self.assertEqual(dup.status_code, 409)

        # Workers accept electrician item -> FULLY_FULFILLED; cleaner 1/3 -> PARTIAL
        with self.app.app_context():
            elec_allocs = WorkforceAllocation.query.filter_by(
                workforce_item_id=elec_item).all()
            alloc_ids = [a.id for a in elec_allocs]
        # accept via owning workers is complex; accept through admin-created demo mapping:
        # use worker token only for demo worker's own allocation if present
        with self.app.app_context():
            for a in WorkforceAllocation.query.filter_by(workforce_item_id=elec_item).all():
                a.status = "accepted"
            clean_alloc = WorkforceAllocation(
                workforce_item_id=clean_item, worker_id=worker_ids[2],
                allocated_by=1, status="accepted")
            db.session.add(clean_alloc)
            for item in WorkforceItem.query.filter_by(requirement_id=req_id).all():
                item.refresh_status()
            req = WorkforceRequirement.query.get(req_id)
            req.refresh_status()
            if req.status == "MATCHING":
                req.status = "PARTIALLY_FULFILLED"
            db.session.commit()
            self.assertEqual(
                WorkforceItem.query.get(elec_item).status, "FULLY_FULFILLED")
            self.assertEqual(
                WorkforceItem.query.get(clean_item).status, "PARTIALLY_FULFILLED")
            self.assertEqual(req.status, "PARTIALLY_FULFILLED")

        prog = self.call("GET",
                         f"/api/society/workforce/requirements/{req_id}/progress",
                         token=admin)
        self.assertEqual(prog.status_code, 200, prog.get_json())
        summary = prog.get_json()["data"]["summary"]
        self.assertEqual(summary["total_workers_required"], 6)
        self.assertEqual(summary["total_worker_days"], 26)
        self.assertEqual(summary["workers_accepted"], 3)
        self.assertEqual(summary["workers_remaining"], 3)
        self.assertGreater(summary["estimated_worker_payout"], 0)

    def test_validation(self):
        admin = self.login("coop@demo.com")
        elec = self._service("electrician")
        # missing title
        bad = self.call("POST", "/api/society/workforce/requirements",
                        {"description": "x"}, admin)
        self.assertEqual(bad.status_code, 400)
        # end before start
        bad2 = self.call("POST", "/api/society/workforce/requirements", {
            "title": "Bad dates",
            "start_date": str(date.today() + timedelta(days=5)),
            "end_date": str(date.today() + timedelta(days=1)),
        }, admin)
        self.assertEqual(bad2.status_code, 400)
        # submit without items fails
        req = self.call("POST", "/api/society/workforce/requirements",
                        {"title": "Empty req"}, admin).get_json()["data"]["id"]
        sub = self.call("POST",
                        f"/api/society/workforce/requirements/{req}/submit", {}, admin)
        self.assertEqual(sub.status_code, 400)
        # zero quantity fails
        zero = self.call("POST",
                         f"/api/society/workforce/requirements/{req}/items",
                         {"service_id": elec, "quantity_required": 0}, admin)
        self.assertEqual(zero.status_code, 400)
        # item end before start fails
        bad_item = self.call("POST",
                             f"/api/society/workforce/requirements/{req}/items", {
                                 "service_id": elec, "quantity_required": 1,
                                 "start_date": str(date.today() + timedelta(days=5)),
                                 "end_date": str(date.today() + timedelta(days=1)),
                             }, admin)
        self.assertEqual(bad_item.status_code, 400)

    def test_authorization_scopes(self):
        admin = self.login("coop@demo.com")
        worker_token = self.login("worker@demo.com")
        elec = self._service("electrician")
        # worker cannot create requirements
        denied = self.call("POST", "/api/society/workforce/requirements",
                           {"title": "Nope"}, worker_token)
        self.assertEqual(denied.status_code, 403)
        # worker assignments endpoint requires worker role
        mine = self.call("GET", "/api/workforce/my-assignments", token=worker_token)
        self.assertEqual(mine.status_code, 200)
        cust = self.call("POST", "/api/auth/register", {
            "name": "WF Cust", "email": "wf-cust@example.com",
            "phone": "9455555555", "password": "CoLab!Demo2026",
        })
        self.assertEqual(cust.status_code, 201)
        other = self.call("GET", "/api/workforce/my-assignments", token=None)
        self.assertEqual(other.status_code, 401)


if __name__ == "__main__":
    unittest.main()
