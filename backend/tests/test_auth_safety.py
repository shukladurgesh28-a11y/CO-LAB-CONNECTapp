import unittest

from app import create_app


class AuthSafetyTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()

    def test_otp_is_not_returned_and_attempts_are_limited(self):
        response = self.client.post(
            "/api/auth/register",
            json={
                "name": "OTP Safety Test",
                "email": "otp-safety@example.com",
                "phone": "9111111111",
                "password": "CoLab!Demo2026",
            },
        )
        self.assertEqual(response.status_code, 201, response.get_json())
        self.assertNotIn("otp", response.get_json())

        for _ in range(5):
            invalid = self.client.post(
                "/api/auth/otp/verify",
                json={"phone": "9111111111", "otp": "000000"},
            )
            self.assertIn(invalid.status_code, (401, 429))

        blocked = self.client.post(
            "/api/auth/otp/verify",
            json={"phone": "9111111111", "otp": "000000"},
        )
        self.assertEqual(blocked.status_code, 429)
        expired = self.client.post(
            "/api/auth/otp/verify",
            json={"phone": "9111111111", "otp": "000000"},
        )
        self.assertEqual(expired.status_code, 404)

    def test_login_attempts_are_limited(self):
        for _ in range(10):
            response = self.client.post(
                "/api/auth/login",
                json={"email": "missing-login@example.com", "password": "wrong"},
            )
            self.assertEqual(response.status_code, 401)
        blocked = self.client.post(
            "/api/auth/login",
            json={"email": "missing-login@example.com", "password": "wrong"},
        )
        self.assertEqual(blocked.status_code, 429)


if __name__ == "__main__":
    unittest.main()