"""
Test: Wallet Engine — Apple Pass + Google Wallet endpoints
Tests: /api/wallet/apple-pass and /api/wallet/google-pass
Also covers: auth flow, 5-tab navigation prerequisites
"""
import pytest
import requests
import os
import base64
import zipfile
import io

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# ── Shared fixtures ──────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def admin_token():
    """Login as admin and return JWT token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@arenadare.com",
        "password": "Admin2026!"
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    data = resp.json()
    assert "token" in data, "No token in response"
    return data["token"]


@pytest.fixture(scope="module")
def test_user_token():
    """Login as chicago test user and return JWT token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "chicago@arena.com",
        "password": "testpassword123"
    })
    assert resp.status_code == 200, f"Test user login failed: {resp.text}"
    data = resp.json()
    return data["token"]


# ── Auth Tests ──────────────────────────────────────────────────────────────

class TestAuthLogin:
    """Verify login with required credentials"""

    def test_admin_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@arenadare.com",
            "password": "Admin2026!"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@arenadare.com"
        print(f"Admin login PASS — username: {data['user']['username']}, is_admin: {data['user']['is_admin']}")

    def test_admin_is_admin_flag(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@arenadare.com",
            "password": "Admin2026!"
        })
        data = resp.json()
        assert data["user"].get("is_admin") == True, "Admin user should have is_admin=True"
        print("Admin is_admin=True: PASS")

    def test_chicago_user_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "chicago@arena.com",
            "password": "testpassword123"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        print(f"Chicago user login PASS — username: {data['user']['username']}")

    def test_invalid_credentials_rejected(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@arenadare.com",
            "password": "wrongpassword"
        })
        assert resp.status_code == 401
        print("Invalid credential rejection: PASS")


# ── Apple Wallet Tests ──────────────────────────────────────────────────────

class TestAppleWallet:
    """Verify /api/wallet/apple-pass endpoint"""

    def test_apple_pass_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/wallet/apple-pass")
        assert resp.status_code == 403, f"Expected 403 without auth, got {resp.status_code}"
        print("Apple pass auth guard: PASS")

    def test_apple_pass_returns_200(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/wallet/apple-pass",
                            headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("Apple pass 200 OK: PASS")

    def test_apple_pass_status_generated(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/wallet/apple-pass",
                            headers={"Authorization": f"Bearer {admin_token}"})
        data = resp.json()
        assert data.get("status") == "generated", f"Expected status=generated, got: {data.get('status')}"
        print(f"Apple pass status=generated: PASS")

    def test_apple_pass_has_pass_b64(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/wallet/apple-pass",
                            headers={"Authorization": f"Bearer {admin_token}"})
        data = resp.json()
        assert "pass_b64" in data, "No pass_b64 in response"
        assert len(data["pass_b64"]) > 100, "pass_b64 is too short"
        print(f"Apple pass_b64 present (length={len(data['pass_b64'])}): PASS")

    def test_apple_pass_b64_is_valid_zip(self, admin_token):
        """Verify pass_b64 is a valid base64-encoded ZIP (.pkpass)"""
        resp = requests.get(f"{BASE_URL}/api/wallet/apple-pass",
                            headers={"Authorization": f"Bearer {admin_token}"})
        data = resp.json()
        try:
            zip_bytes = base64.b64decode(data["pass_b64"])
            zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
            names = zf.namelist()
            assert "pass.json" in names, f"pass.json not found in zip. Files: {names}"
            assert "manifest.json" in names, "manifest.json not found in zip"
            print(f"Apple .pkpass ZIP valid, files: {names}: PASS")
        except Exception as e:
            pytest.fail(f"pass_b64 is not a valid ZIP: {e}")

    def test_apple_pass_has_athlete_and_kore_number(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/wallet/apple-pass",
                            headers={"Authorization": f"Bearer {admin_token}"})
        data = resp.json()
        assert "athlete" in data, "No athlete field in response"
        assert "kore_number" in data, "No kore_number field in response"
        assert data["athlete"] != "", "athlete field is empty"
        assert len(data["kore_number"]) == 5, f"kore_number should be 5 digits, got: {data['kore_number']}"
        print(f"Apple pass athlete='{data['athlete']}', kore_number='{data['kore_number']}': PASS")

    def test_apple_pass_for_regular_user(self, test_user_token):
        resp = requests.get(f"{BASE_URL}/api/wallet/apple-pass",
                            headers={"Authorization": f"Bearer {test_user_token}"})
        assert resp.status_code == 200, f"Regular user apple pass failed: {resp.status_code}"
        data = resp.json()
        assert data.get("status") == "generated"
        print("Apple pass for regular user: PASS")


# ── Google Wallet Tests ─────────────────────────────────────────────────────

class TestGoogleWallet:
    """Verify /api/wallet/google-pass endpoint"""

    def test_google_pass_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/wallet/google-pass")
        assert resp.status_code == 403, f"Expected 403 without auth, got {resp.status_code}"
        print("Google pass auth guard: PASS")

    def test_google_pass_returns_200(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/wallet/google-pass",
                            headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("Google pass 200 OK: PASS")

    def test_google_pass_status_generated(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/wallet/google-pass",
                            headers={"Authorization": f"Bearer {admin_token}"})
        data = resp.json()
        assert data.get("status") == "generated", f"Expected status=generated, got: {data.get('status')}"
        print(f"Google pass status=generated: PASS")

    def test_google_pass_has_wallet_url(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/wallet/google-pass",
                            headers={"Authorization": f"Bearer {admin_token}"})
        data = resp.json()
        assert "wallet_url" in data, "No wallet_url in response"
        assert data["wallet_url"].startswith("https://pay.google.com"), \
            f"wallet_url should start with https://pay.google.com, got: {data['wallet_url'][:50]}"
        print(f"Google wallet_url: {data['wallet_url'][:70]}...: PASS")

    def test_google_pass_has_athlete_and_kore_number(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/wallet/google-pass",
                            headers={"Authorization": f"Bearer {admin_token}"})
        data = resp.json()
        assert "athlete" in data, "No athlete field in response"
        assert "kore_number" in data, "No kore_number field in response"
        assert data["athlete"] != "", "athlete field is empty"
        print(f"Google pass athlete='{data['athlete']}', kore_number='{data['kore_number']}': PASS")

    def test_google_pass_for_regular_user(self, test_user_token):
        resp = requests.get(f"{BASE_URL}/api/wallet/google-pass",
                            headers={"Authorization": f"Bearer {test_user_token}"})
        assert resp.status_code == 200, f"Regular user google pass failed: {resp.status_code}"
        data = resp.json()
        assert data.get("status") == "generated"
        print("Google pass for regular user: PASS")
