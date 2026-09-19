"""Admin Panel API tests: overview, RBAC, audit trail, federation and service management."""

import unittest

from app import create_app
from app.models.notification import AuditLog


class AdminTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()
        with self.app.app_context():
            from app.models.user import User
            if not User.query.filter_by(email="admin@demo.com").first():
                admin = User(email="admin@demo.com", phone="9000000999",
                             name="Platform Admin", role="platform_admin",
                             is_active=True, is_verified=True)
                admin.set_password("CoLab!Demo2026")
                from app import db
                db.session.add(admin)
                db.session.commit()

    def call(self, method, path, payload=None, token=None):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        return self.client.open(path, method=method, json=payload, headers=headers)

    def login(self, email):
        res = self.call("POST", "/api/auth/login",
                        {"email": email, "password": "CoLab!Demo2026"})
        self.assertEqual(res.status_code, 200, res.get_json())
        return res.get_json()["token"]

    def test_overview_and_rbac(self):
        admin = self.login("admin@demo.com")
        res = self.call("GET", "/api/admin/overview", token=admin)
        self.assertEqual(res.status_code, 200, res.get_json())
        data = res.get_json()["data"]
        for key in ("federations_total", "societies_total", "workers_total",
                    "customers_total", "active_jobs", "workforce_requirements",
                    "completed_jobs", "welfare_fund", "open_disputes"):
            self.assertIn(key, data)

        # Non-platform roles are refused
        for email in ("customer@demo.com", "worker@demo.com", "coop@demo.com"):
            token = self.login(email)
            denied = self.call("GET", "/api/admin/overview", token=token)
            self.assertEqual(denied.status_code, 403)
        # Anonymous is refused
        self.assertEqual(self.call("GET", "/api/admin/overview").status_code, 401)

    def test_federation_toggle_and_audit_trail(self):
        admin = self.login("admin@demo.com")
        feds = self.call("GET", "/api/admin/federations", token=admin)
        self.assertEqual(feds.status_code, 200)
        fed = feds.get_json()["data"][0]
        with self.app.app_context():
            before = AuditLog.query.count()
        toggle = self.call("PATCH", f"/api/admin/federations/{fed['id']}",
                           {"is_active": not fed["is_active"]}, admin)
        self.assertEqual(toggle.status_code, 200, toggle.get_json())
        # Flip back to leave fixtures unchanged
        self.call("PATCH", f"/api/admin/federations/{fed['id']}",
                  {"is_active": fed["is_active"]}, admin)
        with self.app.app_context():
            self.assertGreater(AuditLog.query.count(), before)
            entry = AuditLog.query.order_by(AuditLog.id.desc()).first()
            self.assertEqual(entry.entity_type, "federation")
            self.assertEqual(entry.entity_id, fed["id"])

        logs = self.call("GET", "/api/admin/audit-logs", token=admin)
        self.assertEqual(logs.status_code, 200)
        self.assertTrue(len(logs.get_json()["data"]) > 0)

    def test_platform_admin_can_allocate_worker(self):
        from app.models.service import Service
        from app.models.worker import Worker
        customer = self.login("customer@demo.com")
        admin = self.login("admin@demo.com")
        with self.app.app_context():
            service_id = Service.query.filter_by(slug="electrician").one().id
            worker_id = Worker.query.filter_by(email="worker@demo.com").one().id
        req = self.call("POST", "/api/requests", {
            "service_id": service_id, "amount": 500.0,
            "description": "Platform allocation test",
            "location_address": "Pune",
        }, customer)
        self.assertEqual(req.status_code, 201, req.get_json())
        request_id = req.get_json()["data"]["id"]
        alloc = self.call("POST", "/api/allocations", {
            "request_id": request_id, "worker_id": worker_id,
        }, admin)
        self.assertEqual(alloc.status_code, 201, alloc.get_json())
        self.assertEqual(alloc.get_json()["data"]["worker_id"], worker_id)
        booking_id = alloc.get_json()["data"]["booking_id"]
        detail = self.call("GET", f"/api/bookings/{booking_id}", token=admin)
        self.assertEqual(detail.get_json()["data"]["worker_id"], worker_id)
        self.assertEqual(detail.get_json()["data"]["status"], "confirmed")

    def test_ai_assist_requires_key_and_platform_role(self):
        admin = self.login("admin@demo.com")
        # No key in testing env -> 503 with graceful message, never a crash.
        res = self.call("POST", "/api/admin/ai-assist", {"question": "Where is demand highest?"}, admin)
        self.assertEqual(res.status_code, 503, res.get_json())
        status = self.call("GET", "/api/admin/ai-assist", token=admin)
        self.assertEqual(status.status_code, 200)
        self.assertFalse(status.get_json()["data"]["configured"])
        # Non-platform roles are refused.
        coop = self.login("coop@demo.com")
        denied = self.call("POST", "/api/admin/ai-assist", {"question": "Hi"}, coop)
        self.assertEqual(denied.status_code, 403)
        # Empty question rejected.
        empty = self.call("POST", "/api/admin/ai-assist", {"question": "  "}, admin)
        self.assertEqual(empty.status_code, 400)

    def test_service_category_create_and_users_stats(self):
        admin = self.login("admin@demo.com")
        created = self.call("POST", "/api/admin/services/categories", {
            "name": "Test Category", "slug": "test-category-admin",
            "description": "Created by admin test",
        }, admin)
        self.assertEqual(created.status_code, 201, created.get_json())
        cat_id = created.get_json()["data"]["id"]
        # duplicate slug rejected
        dup = self.call("POST", "/api/admin/services/categories", {
            "name": "Test Category", "slug": "test-category-admin",
        }, admin)
        self.assertEqual(dup.status_code, 409)
        # deactivate
        off = self.call("PATCH", f"/api/admin/services/categories/{cat_id}",
                        {"is_active": False}, admin)
        self.assertEqual(off.status_code, 200)

        stats = self.call("GET", "/api/admin/users/stats", token=admin)
        self.assertEqual(stats.status_code, 200)
        self.assertIn("customer", stats.get_json()["data"]["by_role"])

        # Society admin cannot use platform endpoints
        coop = self.login("coop@demo.com")
        denied = self.call("GET", "/api/admin/users/stats", token=coop)
        self.assertEqual(denied.status_code, 403)


if __name__ == "__main__":
    unittest.main()
