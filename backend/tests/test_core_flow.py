import unittest

from app import create_app
from app.models.service import Service
from app.models.worker import Worker


class CoreFlowTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()

    def call(self, method, path, payload=None, token=None):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        return self.client.open(path, method=method, json=payload, headers=headers)

    def login(self, email):
        response = self.call(
            "POST",
            "/api/auth/login",
            {"email": email, "password": "CoLab!Demo2026"},
        )
        self.assertEqual(response.status_code, 200, response.get_json())
        return response.get_json()["token"]

    def test_customer_admin_worker_flow(self):
        customer = self.login("customer@demo.com")
        cooperative_admin = self.login("coop@demo.com")
        worker_user = self.login("worker@demo.com")

        self.assertEqual(self.call("GET", "/api/users/me").status_code, 401)
        profile = self.call("GET", "/api/users/me", token=customer)
        self.assertEqual(profile.status_code, 200)
        profile_data = profile.get_json()["data"]
        self.assertEqual(profile_data["role"], "customer")
        self.assertNotIn("password_hash", profile_data)

        with self.app.app_context():
            service_id = Service.query.filter_by(slug="plumber").one().id

        request_response = self.call(
            "POST",
            "/api/requests",
            {
                "service_id": service_id,
                "description": "Pipe Leakage",
                "location_address": "Pune",
                "location_lat": 18.5204,
                "location_lng": 73.8567,
                "preferred_date": "2026-09-11",
                "preferred_time_start": "10:00",
                "urgency": "urgent",
            },
            customer,
        )
        self.assertEqual(request_response.status_code, 201, request_response.get_json())
        request_id = request_response.get_json()["data"]["id"]

        admin_requests = self.call("GET", "/api/requests", token=cooperative_admin)
        self.assertEqual(admin_requests.status_code, 200)
        self.assertTrue(any(item["id"] == request_id for item in admin_requests.get_json()["data"]))

        heatmap = self.call("GET", "/api/analytics/heatmap", token=cooperative_admin)
        self.assertEqual(heatmap.status_code, 200, heatmap.get_json())
        self.assertTrue(any(point["demand"] >= 1 for point in heatmap.get_json()["data"]["points"]))

        recommendations = self.call(
            "POST",
            "/api/matching/recommend",
            {"request_id": request_id},
            cooperative_admin,
        )
        self.assertEqual(recommendations.status_code, 200, recommendations.get_json())
        worker_id = recommendations.get_json()["data"][0]["worker"]["id"]

        worker_profile = self.call("GET", f"/api/workers/{worker_id}", token=cooperative_admin)
        self.assertEqual(worker_profile.status_code, 200)

        with self.app.app_context():
            worker_record = Worker.query.get(worker_id)
        welfare = self.call(
            "POST",
            "/api/welfare",
            {"worker_id": worker_record.id, "scheme_name": "Demo worker coverage", "enrollment_status": "active"},
            worker_user,
        )
        self.assertEqual(welfare.status_code, 201, welfare.get_json())
        self.assertEqual(self.call("GET", "/api/welfare", token=customer).status_code, 403)

        allocation = self.call(
            "POST",
            "/api/allocations",
            {"request_id": request_id, "worker_id": worker_id},
            cooperative_admin,
        )
        self.assertEqual(allocation.status_code, 201, allocation.get_json())

        worker_bookings = self.call("GET", "/api/bookings", token=worker_user)
        self.assertEqual(worker_bookings.status_code, 200)
        booking_id = worker_bookings.get_json()["data"][0]["id"]

        early_payment = self.call(
            "POST",
            "/api/payments",
            {"booking_id": booking_id, "payment_method": "upi"},
            customer,
        )
        self.assertEqual(early_payment.status_code, 400, early_payment.get_json())

        for status in ("ACCEPTED", "EN_ROUTE", "SERVICE_STARTED", "SERVICE_COMPLETED"):
            response = self.call(
                "PATCH",
                f"/api/bookings/{booking_id}/status",
                {"status": status},
                worker_user,
            )
            self.assertEqual(response.status_code, 200, response.get_json())

        customer_booking = self.call("GET", f"/api/bookings/{booking_id}", token=customer)
        self.assertEqual(customer_booking.status_code, 200)
        self.assertEqual(customer_booking.get_json()["data"]["status"], "completed")

        payment = self.call(
            "POST",
            "/api/payments/initiate",
            {"booking_id": booking_id, "payment_method": "upi"},
            customer,
        )
        self.assertEqual(payment.status_code, 201, payment.get_json())
        self.assertEqual(payment.get_json()["data"]["status"], "completed")

        invoice = self.call("GET", f"/api/payments/invoice/{booking_id}", token=customer)
        self.assertEqual(invoice.status_code, 200, invoice.get_json())

        rating = self.call(
            "POST",
            "/api/ratings",
            {"booking_id": booking_id, "rating": 5, "feedback": "Excellent service"},
            customer,
        )
        self.assertEqual(rating.status_code, 201, rating.get_json())

        history = self.call("GET", "/api/history", token=customer)
        self.assertEqual(history.status_code, 200, history.get_json())

        export = self.call("GET", "/api/exports?resource=history", token=customer)
        self.assertEqual(export.status_code, 200, export.get_json())
        self.assertTrue(all("password_hash" not in item for item in export.get_json()["data"]["items"]))

        dispute = self.call(
            "POST",
            "/api/disputes",
            {"booking_id": booking_id, "category": "service_quality", "description": "Demo dispute"},
            customer,
        )
        self.assertEqual(dispute.status_code, 201, dispute.get_json())
        dispute_id = dispute.get_json()["data"]["id"]
        admin_disputes = self.call("GET", "/api/disputes", token=cooperative_admin)
        self.assertEqual(admin_disputes.status_code, 200, admin_disputes.get_json())
        resolved = self.call(
            "PATCH",
            f"/api/disputes/{dispute_id}",
            {"status": "resolved", "resolution": "Reviewed by cooperative admin"},
            cooperative_admin,
        )
        self.assertEqual(resolved.status_code, 200, resolved.get_json())
        self.assertEqual(resolved.get_json()["data"]["status"], "resolved")

        notifications = self.call("GET", "/api/notifications", token=customer)
        self.assertEqual(notifications.status_code, 200)


if __name__ == "__main__":
    unittest.main()
