"""
ARENAKORE ID Recovery Flow — Backend Tests (Sprint 13)
Tests: /api/auth/forgot-password, /api/auth/verify-otp, /api/auth/reset-password
Covers: OTP generation, email anti-enumeration, OTP SHA256 verify, bcrypt password reset, login-after-reset
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Credentials (from /app/memory/test_credentials.md)
ADMIN_EMAIL = "admin@arenadare.com"
ADMIN_PASSWORD = "Admin2026!"
TEST_EMAIL = "chicago@arena.com"
TEST_PASSWORD_ORIGINAL = "testpassword123"
TEST_PASSWORD_NEW = "NewPassword2026!"

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ──────────────────────────────────────────────────────────────────
# Step 1: Forgot Password
# ──────────────────────────────────────────────────────────────────
class TestForgotPassword:
    """POST /api/auth/forgot-password — OTP generation and anti-enumeration"""

    def test_existing_user_returns_sent_and_dev_otp(self, session):
        """Existing admin email → status=sent, dev_otp (6-digit numeric)"""
        resp = session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": ADMIN_EMAIL})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "sent", f"Expected status=sent, got: {data}"
        assert "dev_otp" in data, f"dev_otp missing in response: {data}"
        assert len(data["dev_otp"]) == 6, f"OTP must be 6 digits, got: {data['dev_otp']}"
        assert data["dev_otp"].isdigit(), f"OTP must be numeric, got: {data['dev_otp']}"
        print(f"PASS: forgot-password existing user: status=sent, dev_otp={data['dev_otp']}")

    def test_nonexistent_email_returns_generic_response(self, session):
        """Non-existing email → status=sent (no email enumeration), NO dev_otp"""
        resp = session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "ghost@nowhere.com"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "sent", f"Expected generic status=sent, got: {data}"
        assert "dev_otp" not in data, f"dev_otp must NOT appear for non-existing user: {data}"
        print(f"PASS: forgot-password non-existent user: generic status=sent, no dev_otp (anti-enum OK)")

    def test_chicago_user_returns_dev_otp(self, session):
        """chicago@arena.com should return dev_otp for recovery flow"""
        resp = session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": TEST_EMAIL})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "sent"
        assert "dev_otp" in data, f"dev_otp missing for chicago user: {data}"
        assert data["dev_otp"].isdigit()
        print(f"PASS: forgot-password chicago user: dev_otp={data['dev_otp']}")


# ──────────────────────────────────────────────────────────────────
# Step 2: Verify OTP
# ──────────────────────────────────────────────────────────────────
class TestVerifyOTP:
    """POST /api/auth/verify-otp — SHA256 OTP verification + reset_token JWT"""

    def _get_fresh_otp(self, session, email):
        resp = session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
        assert resp.status_code == 200
        data = resp.json()
        assert "dev_otp" in data, f"No dev_otp returned for {email}"
        return data["dev_otp"]

    def test_correct_otp_returns_verified_and_reset_token(self, session):
        """Correct OTP → status=verified + reset_token JWT"""
        otp = self._get_fresh_otp(session, ADMIN_EMAIL)
        resp = session.post(f"{BASE_URL}/api/auth/verify-otp", json={"email": ADMIN_EMAIL, "otp": otp})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "verified", f"Expected status=verified, got: {data}"
        assert "reset_token" in data, f"reset_token missing: {data}"
        # JWT has 3 dot-separated parts
        parts = data["reset_token"].split(".")
        assert len(parts) == 3, f"reset_token does not look like a JWT: {data['reset_token']}"
        print(f"PASS: verify-otp correct OTP: status=verified, JWT reset_token present ({len(data['reset_token'])} chars)")

    def test_wrong_otp_returns_400(self, session):
        """Wrong OTP → 400 with error detail"""
        self._get_fresh_otp(session, ADMIN_EMAIL)  # Ensure a fresh record exists
        resp = session.post(f"{BASE_URL}/api/auth/verify-otp", json={"email": ADMIN_EMAIL, "otp": "000000"})
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "detail" in data, f"Expected 'detail' field in error: {data}"
        print(f"PASS: verify-otp wrong OTP: 400 returned — {data['detail']}")


# ──────────────────────────────────────────────────────────────────
# Step 3: Reset Password (using chicago@arena.com — will be restored)
# ──────────────────────────────────────────────────────────────────
class TestResetPassword:
    """POST /api/auth/reset-password — bcrypt hash update + post-reset login"""

    def _get_reset_token(self, session):
        """Helper: get a fresh reset_token for chicago@arena.com"""
        r1 = session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": TEST_EMAIL})
        assert r1.status_code == 200, f"forgot-password failed: {r1.text}"
        otp = r1.json().get("dev_otp")
        assert otp, f"No dev_otp for chicago: {r1.json()}"
        r2 = session.post(f"{BASE_URL}/api/auth/verify-otp", json={"email": TEST_EMAIL, "otp": otp})
        assert r2.status_code == 200, f"verify-otp failed: {r2.text}"
        return r2.json()["reset_token"]

    def test_mismatched_passwords_returns_400(self, session):
        """Mismatched confirm_password → 400"""
        token = self._get_reset_token(session)
        resp = session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "reset_token": token,
            "new_password": "Password123!",
            "confirm_password": "DifferentPwd!",
        })
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "detail" in data
        print(f"PASS: reset-password mismatch: 400 returned — {data['detail']}")

    def test_valid_reset_token_and_passwords_returns_success(self, session):
        """Valid reset_token + matching passwords → status=success"""
        token = self._get_reset_token(session)
        resp = session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "reset_token": token,
            "new_password": TEST_PASSWORD_NEW,
            "confirm_password": TEST_PASSWORD_NEW,
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "success", f"Expected status=success, got: {data}"
        print(f"PASS: reset-password success: {data.get('message', '')}")

    def test_login_with_new_password_after_reset(self, session):
        """After reset, login with new password must succeed (bcrypt hash verified)"""
        # Reset to new password
        token = self._get_reset_token(session)
        r = session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "reset_token": token,
            "new_password": TEST_PASSWORD_NEW,
            "confirm_password": TEST_PASSWORD_NEW,
        })
        assert r.status_code == 200, f"Reset failed: {r.text}"

        # Login with new password
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD_NEW,
        })
        assert resp.status_code == 200, f"Login with new password failed: {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "token" in data, f"No token in login response: {data}"
        assert data["user"]["email"] == TEST_EMAIL
        print(f"PASS: login with new password success — bcrypt hash updated correctly")

    def test_restore_original_password(self, session):
        """CLEANUP: Restore chicago@arena.com to original password testpassword123"""
        token = self._get_reset_token(session)
        r = session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "reset_token": token,
            "new_password": TEST_PASSWORD_ORIGINAL,
            "confirm_password": TEST_PASSWORD_ORIGINAL,
        })
        assert r.status_code == 200, f"Restore password failed: {r.text}"
        print(f"PASS: Password restored to original (testpassword123)")

        # Verify original password works
        r2 = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD_ORIGINAL,
        })
        assert r2.status_code == 200, f"Login with original password failed: {r2.text}"
        print(f"PASS: Login verified with testpassword123 — cleanup complete")

    def test_short_password_returns_400(self, session):
        """Password shorter than 8 chars → 400"""
        token = self._get_reset_token(session)
        resp = session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "reset_token": token,
            "new_password": "short",
            "confirm_password": "short",
        })
        assert resp.status_code == 400, f"Expected 400 for short password, got {resp.status_code}: {resp.text}"
        print(f"PASS: reset-password short password: 400 returned")
