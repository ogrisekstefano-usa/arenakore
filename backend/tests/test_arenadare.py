import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_USER = {
    "username": f"TEST_user{int(time.time())}",
    "email": f"test_{int(time.time())}@arena.com",
    "password": "Password123"
}
EXISTING_USER = {"email": "test@arena.com", "password": "Password123"}

token = None
registered_user_id = None


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# Auth: Register
class TestRegister:
    """Registration endpoint tests"""

    def test_register_success(self, session):
        global token, registered_user_id
        r = session.post(f"{BASE_URL}/api/auth/register", json=TEST_USER)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == TEST_USER["username"]
        assert data["user"]["email"] == TEST_USER["email"]
        assert data["user"]["onboarding_completed"] == False
        token = data["token"]
        registered_user_id = data["user"]["id"]

    def test_register_duplicate_username(self, session):
        r = session.post(f"{BASE_URL}/api/auth/register", json={
            "username": TEST_USER["username"],
            "email": "another@arena.com",
            "password": "Password123"
        })
        assert r.status_code == 400

    def test_register_duplicate_email(self, session):
        r = session.post(f"{BASE_URL}/api/auth/register", json={
            "username": "TEST_unique999",
            "email": TEST_USER["email"],
            "password": "Password123"
        })
        assert r.status_code == 400

    def test_register_short_password(self, session):
        r = session.post(f"{BASE_URL}/api/auth/register", json={
            "username": "TEST_pwdtest",
            "email": "pwdtest@arena.com",
            "password": "abc"
        })
        assert r.status_code == 400

    def test_register_short_username(self, session):
        r = session.post(f"{BASE_URL}/api/auth/register", json={
            "username": "ab",
            "email": "short@arena.com",
            "password": "Password123"
        })
        assert r.status_code == 400


# Auth: Login
class TestLogin:
    """Login endpoint tests"""

    def test_login_success(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login", json=EXISTING_USER)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert "user" in data

    def test_login_wrong_password(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login", json={"email": EXISTING_USER["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_login_nonexistent_email(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login", json={"email": "notfound@arena.com", "password": "Password123"})
        assert r.status_code == 401


# Auth: Me + Username check
class TestAuthUtils:
    def test_get_me(self, session):
        global token
        if not token:
            pytest.skip("No token available")
        r = session.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        data = r.json()
        assert "username" in data

    def test_check_username_available(self, session):
        r = session.get(f"{BASE_URL}/api/auth/check-username?username=available_unique_xyz123")
        assert r.status_code == 200
        assert r.json()["available"] == True

    def test_check_username_taken(self, session):
        r = session.get(f"{BASE_URL}/api/auth/check-username?username=testatleta")
        assert r.status_code == 200
        assert r.json()["available"] == False


# Onboarding
class TestOnboarding:
    def test_complete_onboarding(self, session):
        global token
        if not token:
            pytest.skip("No token available")
        r = session.put(f"{BASE_URL}/api/auth/onboarding",
                        json={"role": "atleta", "sport": "Atletica"},
                        headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["onboarding_completed"] == True
        assert data["xp"] == 100
        assert data["dna"] is not None


# Battles
class TestBattles:
    def test_get_battles(self, session):
        r = session.get(f"{BASE_URL}/api/battles", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "title" in data[0]
        assert "status" in data[0]

    def test_battles_require_auth(self, session):
        r = session.get(f"{BASE_URL}/api/battles")
        assert r.status_code == 403


# Disciplines
class TestDisciplines:
    def test_get_disciplines(self, session):
        r = session.get(f"{BASE_URL}/api/disciplines", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_disciplines_require_auth(self, session):
        r = session.get(f"{BASE_URL}/api/disciplines")
        assert r.status_code == 403


# Crews
class TestCrews:
    def test_get_crews(self, session):
        r = session.get(f"{BASE_URL}/api/crews", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "name" in data[0]

    def test_crews_require_auth(self, session):
        r = session.get(f"{BASE_URL}/api/crews")
        assert r.status_code == 403
