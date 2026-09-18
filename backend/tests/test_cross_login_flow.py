import unittest
from app import create_app, db
from app.models.service import Service
from app.models.worker import Worker
from app.models.booking import Booking, ServiceRequest, Allocation, Payment, Invoice, Rating, ServiceHistory


class CrossLoginFlowTestCase(unittest.TestCase):
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

    def test_complete_cross_login_flow(self):
        # 1. Login as CUSTOMER
        customer_token = self.login("customer@demo.com")

        with self.app.app_context():
            electrician_service = Service.query.filter_by(slug="electrician").first()
            self.assertIsNotNone(electrician_service, "Electrician service must exist in seed/catalog")
            service_id = electrician_service.id

        # 2. Book an Electrician service with price/amount = 500
        req_res = self.call(
            "POST",
            "/api/requests",
            {
                "service_id": service_id,
                "amount": 500.0,
                "description": "Fix electrical wiring and circuit breaker",
                "location_address": "Model Colony, Pune",
                "location_lat": 18.5204,
                "location_lng": 73.8567,
                "preferred_date": "2026-09-15",
                "preferred_time_start": "11:00",
                "urgency": "normal",
            },
            customer_token,
        )
        self.assertEqual(req_res.status_code, 201, req_res.get_json())
        req_json = req_res.get_json()["data"]
        request_id = req_json["id"]
        booking_id = req_json["booking_id"]
        self.assertIsNotNone(booking_id, "Backend must return real database booking_id")

        # Verify candidate rankings stored in backend
        self.assertIn("candidate_rankings", req_json)
        self.assertTrue(len(req_json["candidate_rankings"]) > 0, "AI matching candidate rankings must be persisted")

        # 3. Customer checks bookings: the booking must appear with amount 500 and status PENDING
        cust_bookings = self.call("GET", "/api/bookings", token=customer_token)
        self.assertEqual(cust_bookings.status_code, 200)
        c_list = cust_bookings.get_json()["data"]
        c_match = next((b for b in c_list if b["id"] == booking_id), None)
        self.assertIsNotNone(c_match, f"Booking #{booking_id} must appear in Customer bookings")
        self.assertEqual(c_match["status"], "pending")
        self.assertEqual(c_match["total_amount"], 500.0)

        # 4. Logout / Login as SOCIETY / COOPERATIVE ADMIN
        admin_token = self.login("coop@demo.com")

        # Admin checks request queue / requests: The SAME booking/request must appear
        admin_reqs = self.call("GET", "/api/requests?status=all", token=admin_token)
        self.assertEqual(admin_reqs.status_code, 200)
        a_req_list = admin_reqs.get_json()["data"]
        a_match = next((r for r in a_req_list if r["id"] == request_id or r.get("booking_id") == booking_id), None)
        self.assertIsNotNone(a_match, f"Request #{request_id} must appear in Admin queue")
        self.assertEqual(a_match["status"], "pending")
        self.assertIsNone(a_match.get("allocated_worker_id"), "Worker must not be allocated yet")

        # Admin checks bookings: Booking #123 appears
        admin_bookings = self.call("GET", "/api/bookings?status=all", token=admin_token)
        self.assertEqual(admin_bookings.status_code, 200)
        ab_list = admin_bookings.get_json()["data"]
        ab_match = next((b for b in ab_list if b["id"] == booking_id), None)
        self.assertIsNotNone(ab_match, f"Booking #{booking_id} must appear in Admin bookings")
        self.assertEqual(ab_match["status"], "pending")

        # 5. Admin allocates Worker Demo
        with self.app.app_context():
            worker_demo = Worker.query.filter_by(email="worker@demo.com").first()
            if not worker_demo:
                worker_demo = Worker.query.first()
            self.assertIsNotNone(worker_demo)
            worker_id = worker_demo.id

        alloc_res = self.call(
            "POST",
            "/api/allocations",
            {"request_id": request_id, "worker_id": worker_id},
            admin_token,
        )
        self.assertEqual(alloc_res.status_code, 201, alloc_res.get_json())
        alloc_data = alloc_res.get_json()["data"]
        self.assertEqual(alloc_data["worker_id"], worker_id)

        # Verify admin booking query now shows allocated worker
        admin_b_after = self.call("GET", f"/api/bookings/{booking_id}", token=admin_token)
        self.assertEqual(admin_b_after.status_code, 200)
        b_allocated = admin_b_after.get_json()["data"]
        self.assertEqual(b_allocated["worker_id"], worker_id)
        self.assertEqual(b_allocated["status"], "confirmed")

        # 6. Logout / Login as WORKER
        worker_token = self.login("worker@demo.com")

        # Worker retrieves bookings using authenticated worker's database identity
        worker_jobs = self.call("GET", "/api/bookings", token=worker_token)
        self.assertEqual(worker_jobs.status_code, 200)
        w_list = worker_jobs.get_json()["data"]
        w_match = next((b for b in w_list if b["id"] == booking_id), None)
        self.assertIsNotNone(w_match, f"Worker must see the SAME Booking #{booking_id}")
        self.assertEqual(w_match["status"], "confirmed")

        # Worker must see the money/payout breakdown:
        # Customer amount: 500, Commission: 50, Welfare: 10, Worker Payout: 440
        financials = w_match.get("financials")
        self.assertIsNotNone(financials, "Worker must see financials breakdown")
        self.assertEqual(float(financials["service_charges"]), 500.0)
        self.assertEqual(float(financials["commission_amount"]), 50.0)
        self.assertEqual(float(financials["welfare_amount"]), 10.0)
        self.assertEqual(float(financials["worker_payout"]), 440.0)

        # 7. Worker accepts the booking
        accept_res = self.call(
            "PATCH",
            f"/api/bookings/{booking_id}/status",
            {"status": "accepted"},
            worker_token,
        )
        self.assertEqual(accept_res.status_code, 200, accept_res.get_json())
        self.assertEqual(accept_res.get_json()["data"]["status"], "accepted")

        # Verify Customer sees ACCEPTED
        c_check = self.call("GET", f"/api/bookings/{booking_id}", token=customer_token)
        self.assertEqual(c_check.status_code, 200)
        self.assertEqual(c_check.get_json()["data"]["status"], "accepted")

        # 8. Worker completes the service
        complete_res = self.call(
            "PATCH",
            f"/api/bookings/{booking_id}/status",
            {"status": "completed"},
            worker_token,
        )
        self.assertEqual(complete_res.status_code, 200, complete_res.get_json())
        self.assertEqual(complete_res.get_json()["data"]["status"], "completed")

        # 9. Verify Financial Record (Payment & Payout) finalized in Backend
        # Customer view: completed booking and payment
        c_completed = self.call("GET", f"/api/bookings/{booking_id}", token=customer_token)
        self.assertEqual(c_completed.status_code, 200)
        c_comp_data = c_completed.get_json()["data"]
        self.assertEqual(c_comp_data["status"], "completed")
        self.assertEqual(c_comp_data["payment_status"], "paid")
        self.assertEqual(float(c_comp_data["total_amount"]), 500.0)

        # Worker view: sees completed status and payout of 440
        w_completed = self.call("GET", f"/api/bookings/{booking_id}", token=worker_token)
        self.assertEqual(w_completed.status_code, 200)
        w_comp_data = w_completed.get_json()["data"]
        self.assertEqual(w_comp_data["status"], "completed")
        w_fin = w_comp_data["financials"]
        self.assertEqual(float(w_fin["worker_payout"]), 440.0)
        self.assertEqual(float(w_fin["commission_amount"]), 50.0)
        self.assertEqual(float(w_fin["welfare_amount"]), 10.0)

        # Admin view: sees customer amount + commission + welfare + worker payout
        a_completed = self.call("GET", f"/api/bookings/{booking_id}", token=admin_token)
        self.assertEqual(a_completed.status_code, 200)
        a_comp_data = a_completed.get_json()["data"]
        a_fin = a_comp_data["financials"]
        self.assertEqual(float(a_fin["total_amount"]), 500.0)
        self.assertEqual(float(a_fin["commission_amount"]), 50.0)
        self.assertEqual(float(a_fin["welfare_amount"]), 10.0)
        self.assertEqual(float(a_fin["worker_payout"]), 440.0)

        # 10. Customer submits rating/feedback
        rate_res = self.call(
            "POST",
            "/api/ratings",
            {
                "booking_id": booking_id,
                "rating": 5,
                "feedback": "Good service, very polite and professional electrician.",
                "service_quality": 5,
                "punctuality": 5,
                "professionalism": 5,
            },
            customer_token,
        )
        self.assertEqual(rate_res.status_code, 201, rate_res.get_json())

        # 11. Worker sees rating and feedback
        w_rated = self.call("GET", f"/api/bookings/{booking_id}", token=worker_token)
        self.assertEqual(w_rated.status_code, 200)
        w_rating = w_rated.get_json()["data"].get("rating")
        self.assertIsNotNone(w_rating, "Worker must see rating in booking detail")
        self.assertEqual(w_rating["rating"], 5)
        self.assertEqual(w_rating["feedback"], "Good service, very polite and professional electrician.")

        # Worker also queries booking rating endpoint
        b_rate_res = self.call("GET", f"/api/ratings/booking/{booking_id}", token=worker_token)
        self.assertEqual(b_rate_res.status_code, 200)
        self.assertEqual(b_rate_res.get_json()["data"]["rating"], 5)

        # 12. Admin sees the rating/feedback
        a_rated = self.call("GET", f"/api/bookings/{booking_id}", token=admin_token)
        self.assertEqual(a_rated.status_code, 200)
        a_rating = a_rated.get_json()["data"].get("rating")
        self.assertIsNotNone(a_rating, "Admin must see rating in booking detail")
        self.assertEqual(a_rating["rating"], 5)
        self.assertEqual(a_rating["feedback"], "Good service, very polite and professional electrician.")

        # 13. Database Integrity Verification
        with self.app.app_context():
            db_booking = Booking.query.get(booking_id)
            self.assertIsNotNone(db_booking)
            self.assertEqual(db_booking.customer_id, 1)
            self.assertEqual(db_booking.worker_id, worker_id)
            self.assertEqual(db_booking.status, "completed")

            # Check Payment record exists and references booking_id
            db_payment = Payment.query.filter_by(booking_id=booking_id).first()
            self.assertIsNotNone(db_payment)
            self.assertEqual(db_payment.status, "completed")
            self.assertEqual(db_payment.amount, 500.0)

            # Check Invoice record exists and references booking_id
            db_invoice = Invoice.query.filter_by(booking_id=booking_id).first()
            self.assertIsNotNone(db_invoice)
            self.assertEqual(float(db_invoice.service_charges), 500.0)
            self.assertEqual(float(db_invoice.commission_amount), 50.0)
            self.assertEqual(float(db_invoice.welfare_amount), 10.0)
            self.assertEqual(float(db_invoice.worker_payout), 440.0)
            self.assertEqual(db_invoice.payment_status, "paid")

            # Check Rating references booking_id and worker_id
            db_rating = Rating.query.filter_by(booking_id=booking_id).first()
            self.assertIsNotNone(db_rating)
            self.assertEqual(db_rating.worker_id, worker_id)
            self.assertEqual(db_rating.rating, 5)

            # Check ServiceHistory references booking_id and worker_id
            db_history = ServiceHistory.query.filter_by(booking_id=booking_id).first()
            self.assertIsNotNone(db_history)
            self.assertEqual(db_history.worker_id, worker_id)
            self.assertEqual(db_history.customer_id, 1)
