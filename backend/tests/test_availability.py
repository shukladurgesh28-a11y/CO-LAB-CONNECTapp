import unittest

from app import create_app
from app.models.service import Service
from app.models.user import User
from app.models.worker import Worker


class AvailabilityMatchingTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()

    def call(self, method, path, payload=None, token=None):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        return self.client.open(path, method=method, json=payload, headers=headers)

    def login(self, email):
        response = self.call("POST", "/api/auth/login", {"email": email, "password": "CoLab!Demo2026"})
        self.assertEqual(response.status_code, 200)
        return response.get_json()["token"]

    def test_explicit_leave_excludes_worker_from_matching(self):
        worker_token = self.login("worker@demo.com")
        customer_token = self.login("customer@demo.com")
        admin_token = self.login("coop@demo.com")
        with self.app.app_context():
            worker_user = User.query.filter_by(email="worker@demo.com").one()
            worker_id = Worker.query.filter_by(user_id=worker_user.id).one().id
            service_id = Service.query.filter_by(slug="plumber").one().id

        availability = self.call(
            "PATCH",
            f"/api/workers/{worker_id}/availability",
            {
                "availabilities": [{
                    "day_of_week": 4,
                    "start_time": "08:00",
                    "end_time": "18:00",
                    "is_available": False,
                    "effective_from": "2026-09-10",
                    "effective_until": "2026-09-12",
                }],
            },
            worker_token,
        )
        self.assertEqual(availability.status_code, 200, availability.get_json())

        request_response = self.call(
            "POST",
            "/api/requests",
            {
                "service_id": service_id,
                "description": "Leave matching test",
                "location_address": "Pune",
                "location_lat": 18.5204,
                "location_lng": 73.8567,
                "preferred_date": "2026-09-11",
                "preferred_time_start": "10:00",
                "urgency": "high",
            },
            customer_token,
        )
        self.assertEqual(request_response.status_code, 201, request_response.get_json())
        request_id = request_response.get_json()["data"]["id"]
        recommendations = self.call(
            "POST", "/api/matching/recommend", {"request_id": request_id}, admin_token
        )
        self.assertEqual(recommendations.status_code, 200, recommendations.get_json())
        self.assertEqual(recommendations.get_json()["data"], [])


if __name__ == "__main__":
    unittest.main()
