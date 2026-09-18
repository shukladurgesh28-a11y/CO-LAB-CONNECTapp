"""Phase 24 governance tests: OTP persistence, state machine, matching
fairness/determinism, 2-minute offers, settlement ledger."""

import unittest
from datetime import datetime, timedelta

from app import create_app, db
from app.models.booking import (
    AllocationOffer, Booking, MatchingRecommendation, Settlement,
)
from app.models.service import Service
from app.models.user import OtpChallenge, User
from app.models.worker import Worker


class GovernanceTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.app.config["OTP_EXPOSE_IN_RESPONSE"] = True
        self.client = self.app.test_client()

    def call(self, method, path, payload=None, token=None):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        return self.client.open(path, method=method, json=payload, headers=headers)

    def login(self, email):
        response = self.call(
            "POST", "/api/auth/login",
            {"email": email, "password": "CoLab!Demo2026"},
        )
        self.assertEqual(response.status_code, 200, response.get_json())
        return response.get_json()["token"]

    # --- Phase 3: OTP persistence, no pre-verification JWT -----------------
    def test_register_issues_no_token_and_stores_hashed_challenge(self):
        res = self.call("POST", "/api/auth/register", {
            "name": "Gov OTP", "email": "gov-otp@example.com",
            "phone": "9222222222", "password": "CoLab!Demo2026",
        })
        self.assertEqual(res.status_code, 201, res.get_json())
        body = res.get_json()
        self.assertNotIn("token", body)
        self.assertIn("otp", body)  # exposed only because the test enables it

        with self.app.app_context():
            challenge = OtpChallenge.query.filter_by(phone="9222222222").first()
            self.assertIsNotNone(challenge)
            # Hash only: plaintext OTP must never be persisted.
            self.assertNotEqual(challenge.otp_hash, body["otp"])
            self.assertEqual(len(challenge.otp_hash), 64)

        # Login before verification must fail.
        denied = self.call("POST", "/api/auth/login", {
            "email": "gov-otp@example.com", "password": "CoLab!Demo2026",
        })
        self.assertEqual(denied.status_code, 403)

        # Correct OTP verifies and issues the JWT.
        ok = self.call("POST", "/api/auth/otp/verify",
                       {"phone": "9222222222", "otp": body["otp"]})
        self.assertEqual(ok.status_code, 200, ok.get_json())
        self.assertIn("token", ok.get_json()["data"])
        with self.app.app_context():
            user = User.query.filter_by(email="gov-otp@example.com").first()
            self.assertTrue(user.is_verified)

    def test_otp_attempt_limits_and_expiry(self):
        res = self.call("POST", "/api/auth/register", {
            "name": "Gov OTP2", "email": "gov-otp2@example.com",
            "phone": "9333333333", "password": "CoLab!Demo2026",
        })
        self.assertEqual(res.status_code, 201)
        for _ in range(5):
            bad = self.call("POST", "/api/auth/otp/verify",
                            {"phone": "9333333333", "otp": "000000"})
            self.assertIn(bad.status_code, (401, 429))
        blocked = self.call("POST", "/api/auth/otp/verify",
                            {"phone": "9333333333", "otp": "000000"})
        self.assertEqual(blocked.status_code, 429)
        gone = self.call("POST", "/api/auth/otp/verify",
                         {"phone": "9333333333", "otp": "000000"})
        self.assertEqual(gone.status_code, 404)

    # --- Full flow helpers ------------------------------------------------
    def _drive_to_completed(self):
        customer = self.login("customer@demo.com")
        admin = self.login("coop@demo.com")
        worker_token = self.login("worker@demo.com")
        with self.app.app_context():
            service_id = Service.query.filter_by(slug="electrician").one().id
            worker_id = Worker.query.filter_by(email="worker@demo.com").one().id
        req = self.call("POST", "/api/requests", {
            "service_id": service_id, "amount": 500.0,
            "description": "Governance E2E", "location_address": "Pune",
            "location_lat": 18.5204, "location_lng": 73.8567,
            "preferred_date": "2026-09-15", "preferred_time_start": "11:00",
        }, customer)
        self.assertEqual(req.status_code, 201, req.get_json())
        request_id = req.get_json()["data"]["id"]
        booking_id = req.get_json()["data"]["booking_id"]

        alloc = self.call("POST", "/api/allocations",
                          {"request_id": request_id, "worker_id": worker_id}, admin)
        self.assertEqual(alloc.status_code, 201, alloc.get_json())
        for status in ("accepted", "completed"):
            upd = self.call("PATCH", f"/api/bookings/{booking_id}/status",
                            {"status": status}, worker_token)
            self.assertEqual(upd.status_code, 200, upd.get_json())
        return customer, admin, worker_token, worker_id, request_id, booking_id

    # --- Phase 8: offers ---------------------------------------------------
    def test_allocation_creates_two_minute_offer(self):
        customer = self.login("customer@demo.com")
        admin = self.login("coop@demo.com")
        worker_token = self.login("worker@demo.com")
        with self.app.app_context():
            service_id = Service.query.filter_by(slug="electrician").one().id
            worker_id = Worker.query.filter_by(email="worker@demo.com").one().id
        req = self.call("POST", "/api/requests", {
            "service_id": service_id, "amount": 500.0,
            "description": "Offer check", "location_address": "Pune",
        }, customer)
        request_id = req.get_json()["data"]["id"]
        booking_id = req.get_json()["data"]["booking_id"]
        alloc = self.call("POST", "/api/allocations",
                          {"request_id": request_id, "worker_id": worker_id}, admin)
        self.assertEqual(alloc.status_code, 201)

        offers = self.call("GET", "/api/offers", token=worker_token)
        self.assertEqual(offers.status_code, 200)
        mine = [o for o in offers.get_json()["data"] if o["request_id"] == request_id]
        self.assertEqual(len(mine), 1)
        offer = mine[0]
        self.assertEqual(offer["status"], "offered")
        offered = datetime.fromisoformat(offer["offered_at"])
        expires = datetime.fromisoformat(offer["expires_at"])
        self.assertAlmostEqual((expires - offered).total_seconds(), 120, delta=2)

        # Worker accept marks the offer accepted on the SAME booking.
        accept = self.call("PATCH", f"/api/bookings/{booking_id}/status",
                           {"status": "accepted"}, worker_token)
        self.assertEqual(accept.status_code, 200)
        with self.app.app_context():
            updated = AllocationOffer.query.filter_by(request_id=request_id).one()
            self.assertEqual(updated.status, "accepted")

    def test_expired_offer_is_marked_but_keeps_assignment(self):
        customer = self.login("customer@demo.com")
        admin = self.login("coop@demo.com")
        worker_token = self.login("worker@demo.com")
        with self.app.app_context():
            service_id = Service.query.filter_by(slug="electrician").one().id
            worker_id = Worker.query.filter_by(email="worker@demo.com").one().id
        req = self.call("POST", "/api/requests", {
            "service_id": service_id, "amount": 500.0,
            "description": "Expiry check", "location_address": "Pune",
        }, customer)
        request_id = req.get_json()["data"]["id"]
        booking_id = req.get_json()["data"]["booking_id"]
        self.call("POST", "/api/allocations",
                  {"request_id": request_id, "worker_id": worker_id}, admin)
        with self.app.app_context():
            offer = AllocationOffer.query.filter_by(request_id=request_id).one()
            offer.expires_at = datetime.utcnow() - timedelta(seconds=1)
            db.session.commit()

        offers = self.call("GET", "/api/offers", token=worker_token)
        self.assertEqual(offers.status_code, 200)
        with self.app.app_context():
            self.assertEqual(
                AllocationOffer.query.filter_by(request_id=request_id).one().status,
                "expired",
            )
            # Assignment survives: late accept still allowed (acceptance test).
            booking = Booking.query.get(booking_id)
            self.assertEqual(booking.worker_id, worker_id)
            self.assertEqual(booking.status, "confirmed")

    # --- Phase 7: matching determinism + cold-start ------------------------
    def test_matching_is_deterministic_and_explains_cold_start(self):
        admin = self.login("coop@demo.com")
        customer = self.login("customer@demo.com")
        with self.app.app_context():
            service_id = Service.query.filter_by(slug="electrician").one().id
        req = self.call("POST", "/api/requests", {
            "service_id": service_id, "amount": 500.0,
            "description": "Matching check", "location_address": "Pune",
            "location_lat": 18.5204, "location_lng": 73.8567,
        }, customer)
        request_id = req.get_json()["data"]["id"]

        first = self.call("GET", f"/api/matching/{request_id}", token=admin)
        second = self.call("GET", f"/api/matching/{request_id}", token=admin)
        self.assertEqual(first.status_code, 200)
        order1 = [r["worker"]["id"] for r in first.get_json()["data"]]
        order2 = [r["worker"]["id"] for r in second.get_json()["data"]]
        self.assertEqual(order1, order2)
        explanations = [" ".join(r["explanation"]) for r in first.get_json()["data"]]
        self.assertTrue(any("Cold-start fairness boost applied" in e for e in explanations))

        with self.app.app_context():
            stored = MatchingRecommendation.query.filter_by(request_id=request_id).all()
            self.assertTrue(len(stored) > 0)
            ranks = sorted(s.rank for s in stored)
            self.assertEqual(ranks, list(range(1, len(stored) + 1)))

    # --- Phase 11/13: terminal states + settlement --------------------------
    def test_completed_is_terminal_and_settlement_reconciles(self):
        customer, admin, worker_token, worker_id, request_id, booking_id = self._drive_to_completed()

        illegal = self.call("PATCH", f"/api/bookings/{booking_id}/status",
                            {"status": "accepted"}, worker_token)
        self.assertEqual(illegal.status_code, 400)

        settle = self.call("GET", f"/api/payments/settlement/{booking_id}", token=admin)
        self.assertEqual(settle.status_code, 200, settle.get_json())
        data = settle.get_json()["data"]
        self.assertEqual(data["status"], "settled")
        self.assertEqual(float(data["gross_amount"]), 500.0)
        self.assertEqual(float(data["commission"]), 50.0)
        self.assertEqual(float(data["welfare"]), 10.0)
        self.assertEqual(float(data["worker_payout"]), 440.0)

        # Customer isolation: another customer cannot read the settlement.
        outsider = self.call("POST", "/api/auth/register", {
            "name": "Outsider", "email": "outsider@example.com",
            "phone": "9444444444", "password": "CoLab!Demo2026",
        })
        self.assertEqual(outsider.status_code, 201)
        self.call("POST", "/api/auth/otp/verify", {
            "phone": "9444444444", "otp": outsider.get_json()["otp"],
        })
        outsider_token = self.login("outsider@example.com")
        forbidden = self.call("GET", f"/api/payments/settlement/{booking_id}",
                              token=outsider_token)
        self.assertEqual(forbidden.status_code, 403)


if __name__ == "__main__":
    unittest.main()
