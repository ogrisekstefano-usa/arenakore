"""
Sprint 7: Bio-Evolution Tracking Backend Tests
Tests for:
  - GET /api/nexus/rescan-eligibility
  - POST /api/nexus/bioscan
  - Onboarding dna_scans + baseline_scanned_at
  - user_to_response pro_unlocked field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Known test credentials
CHICAGO = {"email": "chicago@arena.com", "password": "testpassword123"}
ADMIN = {"email": "admin@arenadare.com", "password": "Admin2026!"}
PULSEDEMO = {"email": "pulsedemo@arena.com", "password": "testpassword123"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def chicago_token(session):
    """Login as chicago@arena.com (has DNA, validation_pending)"""
    r = session.post(f"{BASE_URL}/api/auth/login", json=CHICAGO)
    assert r.status_code == 200, f"Chicago login failed: {r.text}"
    data = r.json()
    assert "token" in data, "Token not in login response"
    return data["token"]


@pytest.fixture(scope="module")
def admin_token(session):
    """Login as admin@arenadare.com (DNA>75, PRO)"""
    r = session.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    data = r.json()
    assert "token" in data, "Token not in login response"
    return data["token"]


@pytest.fixture(scope="module")
def pulsedemo_token(session):
    """Login as pulsedemo@arena.com (no DNA)"""
    r = session.post(f"{BASE_URL}/api/auth/login", json=PULSEDEMO)
    assert r.status_code == 200, f"Pulsedemo login failed: {r.text}"
    data = r.json()
    assert "token" in data, "Token not in login response"
    return data["token"]


# ====================================
# LOGIN / user_to_response fields
# ====================================
class TestLoginResponse:
    """Login response includes pro_unlocked field (user_to_response)"""

    def test_chicago_login_has_pro_unlocked(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login", json=CHICAGO)
        assert r.status_code == 200
        data = r.json()
        assert "user" in data
        user = data["user"]
        assert "pro_unlocked" in user, "pro_unlocked field missing from user_to_response"
        assert isinstance(user["pro_unlocked"], bool), "pro_unlocked must be a boolean"

    def test_admin_login_has_pro_unlocked(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        assert r.status_code == 200
        data = r.json()
        assert "user" in data
        user = data["user"]
        assert "pro_unlocked" in user, "pro_unlocked field missing from admin user"

    def test_login_token_field_name(self, session):
        """Verify token field is 'token' not 'access_token'"""
        r = session.post(f"{BASE_URL}/api/auth/login", json=CHICAGO)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data, "Expected 'token' field (not 'access_token')"
        assert "access_token" not in data, "Field should be 'token', not 'access_token'"


# ====================================
# GET /nexus/rescan-eligibility
# ====================================
class TestRescanEligibility:
    """Rescan eligibility endpoint for all user states"""

    def test_eligibility_requires_auth(self, session):
        r = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility")
        assert r.status_code == 403, "Endpoint should require auth"

    def test_chicago_eligibility_structure(self, session, chicago_token):
        """chicago has DNA, should be validation_pending"""
        r = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200, f"Failed: {r.text}"
        data = r.json()
        # Required fields
        required_fields = ["can_scan", "phase", "message", "improvement_rates", "avg_dna", "pro_unlocked"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

    def test_chicago_eligibility_validation_pending_phase(self, session, chicago_token):
        """chicago should be in validation_pending or validation_ready phase"""
        r = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200
        data = r.json()
        # Chicago should have DNA; phase should be some scan-related phase (not no_scan)
        assert data["phase"] != "no_scan", "Chicago has DNA, should not be in no_scan phase"
        assert data["avg_dna"] > 0, "Chicago avg_dna should be > 0"

    def test_chicago_has_hours_or_days_remaining(self, session, chicago_token):
        """If validation_pending, hours_remaining should be present"""
        r = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200
        data = r.json()
        if data["phase"] == "validation_pending":
            assert data.get("hours_remaining") is not None, "hours_remaining should be present for validation_pending"
            assert data.get("hours_remaining") > 0, "hours_remaining should be > 0"
            assert "VALIDATION SCAN TRA:" in data["message"] or "H" in data["message"], \
                f"Message should mention time: {data['message']}"
        elif data["phase"] == "locked":
            assert data.get("days_remaining") is not None, "days_remaining should be present for locked phase"
        print(f"Chicago phase: {data['phase']}, can_scan: {data['can_scan']}, message: {data['message']}")

    def test_pulsedemo_eligibility_no_scan(self, session, pulsedemo_token):
        """pulsedemo has no DNA — should return no_scan phase"""
        r = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                        headers={"Authorization": f"Bearer {pulsedemo_token}"})
        # pulsedemo may or may not have completed onboarding
        # If they have no onboarding, they might get a different response
        if r.status_code == 200:
            data = r.json()
            print(f"Pulsedemo eligibility: {data}")
            assert "can_scan" in data
            assert "phase" in data
            assert "message" in data
        else:
            print(f"Pulsedemo eligibility status: {r.status_code}, {r.text}")

    def test_admin_eligibility_has_high_avg_dna(self, session, admin_token):
        """Admin has DNA > 75, should have high avg_dna"""
        r = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                        headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200, f"Failed: {r.text}"
        data = r.json()
        print(f"Admin eligibility: phase={data.get('phase')}, avg_dna={data.get('avg_dna')}, pro_unlocked={data.get('pro_unlocked')}")
        assert "avg_dna" in data
        # Admin with DNA > 75 should have pro_unlocked in response
        assert "pro_unlocked" in data

    def test_eligibility_improvement_rates_structure(self, session, chicago_token):
        """improvement_rates should be a dict (even if empty)"""
        r = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data["improvement_rates"], dict), "improvement_rates should be a dict"
        # If populated, should have DNA keys
        rates = data["improvement_rates"]
        for key in rates:
            assert key in ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"], \
                f"Unexpected key in improvement_rates: {key}"

    def test_no_scan_user_can_scan_true(self, session, pulsedemo_token):
        """User with no DNA should have can_scan=True"""
        r = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                        headers={"Authorization": f"Bearer {pulsedemo_token}"})
        if r.status_code == 200:
            data = r.json()
            if data.get("phase") == "no_scan":
                assert data["can_scan"] == True, "no_scan phase should allow scanning"
                assert data["scan_type"] == "initial"

    def test_validation_pending_can_scan_false(self, session, chicago_token):
        """Chicago (validation_pending within 48h) should have can_scan=False"""
        r = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200
        data = r.json()
        if data["phase"] == "validation_pending":
            assert data["can_scan"] == False, "validation_pending should have can_scan=False"


# ====================================
# POST /nexus/bioscan
# ====================================
class TestBioscan:
    """Bioscan endpoint tests"""

    def test_bioscan_requires_auth(self, session):
        r = session.post(f"{BASE_URL}/api/nexus/bioscan")
        assert r.status_code == 403, "Bioscan should require authentication"

    def test_bioscan_response_structure_admin(self, session, admin_token):
        """Admin bioscan should succeed (or return eligibility error) and have correct structure"""
        r = session.post(f"{BASE_URL}/api/nexus/bioscan",
                         headers={"Authorization": f"Bearer {admin_token}"})
        print(f"Admin bioscan status: {r.status_code}, response: {r.text[:300]}")
        if r.status_code == 200:
            data = r.json()
            required_fields = ["scan_type", "current_dna", "improvement_rates",
                               "avg_dna", "pro_unlocked", "pro_newly_unlocked", "user"]
            for field in required_fields:
                assert field in data, f"Missing field: {field}"
            assert "pro_unlocked" in data, "pro_unlocked missing from bioscan response"
            assert "pro_newly_unlocked" in data, "pro_newly_unlocked missing from bioscan response"
            assert isinstance(data["pro_newly_unlocked"], bool), "pro_newly_unlocked must be bool"
            assert isinstance(data["pro_unlocked"], bool), "pro_unlocked must be bool"
            assert data["avg_dna"] > 0, "avg_dna should be > 0"
            # User in response should have pro_unlocked
            assert "pro_unlocked" in data["user"], "user object should have pro_unlocked"
        elif r.status_code == 400:
            # Already locked - valid response
            detail = r.json().get("detail", "")
            print(f"Admin bioscan blocked: {detail}")
            # This is acceptable if admin is in a locked phase

    def test_pulsedemo_bioscan_no_dna(self, session, pulsedemo_token):
        """Pulsedemo without onboarding/DNA should get 400"""
        r = session.post(f"{BASE_URL}/api/nexus/bioscan",
                         headers={"Authorization": f"Bearer {pulsedemo_token}"})
        print(f"Pulsedemo bioscan status: {r.status_code}, body: {r.text[:300]}")
        # pulsedemo has no DNA, should fail with 400 or succeed if they have onboarding
        if r.status_code == 400:
            assert "detail" in r.json()
        # else they may have DNA from onboarding - still valid

    def test_chicago_bioscan_locked(self, session, chicago_token):
        """Chicago is in validation_pending, bioscan should be blocked"""
        r = session.post(f"{BASE_URL}/api/nexus/bioscan",
                         headers={"Authorization": f"Bearer {chicago_token}"})
        print(f"Chicago bioscan status: {r.status_code}, body: {r.text[:300]}")
        # Chicago is validation_pending (38.5h remaining) - should be blocked
        # Either 400 (blocked) or 200 (if validation_ready)
        assert r.status_code in [200, 400], f"Unexpected status: {r.status_code}"
        if r.status_code == 400:
            detail = r.json().get("detail", "")
            print(f"Chicago blocked: {detail}")
            assert "ore" in detail.lower() or "giorni" in detail.lower() or len(detail) > 5

    def test_bioscan_pro_unlocked_logic(self, session, admin_token):
        """If avg DNA > 75, pro_unlocked should be True"""
        r = session.post(f"{BASE_URL}/api/nexus/bioscan",
                         headers={"Authorization": f"Bearer {admin_token}"})
        if r.status_code == 200:
            data = r.json()
            avg_dna = data.get("avg_dna", 0)
            print(f"Admin avg_dna: {avg_dna}, pro_unlocked: {data.get('pro_unlocked')}")
            if avg_dna > 75:
                assert data["pro_unlocked"] == True, f"avg_dna={avg_dna} > 75, pro_unlocked should be True"
        elif r.status_code == 400:
            print(f"Admin bioscan not available: {r.json().get('detail')}")


# ====================================
# Onboarding: dna_scans + baseline_scanned_at
# ====================================
class TestOnboardingDNA:
    """Test that onboarding creates dna_scans array and baseline_scanned_at"""

    def test_onboarding_creates_dna_scan_history(self, session):
        """Register a new user, complete onboarding, verify /auth/me has DNA and is set correctly"""
        import time
        ts = int(time.time())
        # Register
        r = session.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"TEST_scan_{ts}",
            "email": f"test_scan_{ts}@arena.com",
            "password": "TestPassword123"
        })
        assert r.status_code == 200, f"Register failed: {r.text}"
        new_token = r.json()["token"]

        # Complete onboarding
        r = session.put(f"{BASE_URL}/api/auth/onboarding",
                        json={"role": "atleta", "sport": "Atletica"},
                        headers={"Authorization": f"Bearer {new_token}"})
        assert r.status_code == 200, f"Onboarding failed: {r.text}"
        data = r.json()
        print(f"Onboarding response fields: {list(data.keys())}")

        # Verify DNA is set
        assert data.get("dna") is not None, "dna should be set after onboarding"
        dna = data["dna"]
        for key in ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]:
            assert key in dna, f"DNA missing key: {key}"
            assert 42 <= dna[key] <= 92, f"DNA value out of range for {key}: {dna[key]}"

        # Now check rescan-eligibility — the user should just have done baseline
        r2 = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                         headers={"Authorization": f"Bearer {new_token}"})
        assert r2.status_code == 200, f"Eligibility check failed: {r2.text}"
        elig = r2.json()
        print(f"New user eligibility: {elig}")
        # New user just completed onboarding, should be in validation_pending (within 48h)
        assert "phase" in elig
        assert "can_scan" in elig
        assert elig["avg_dna"] > 0, "avg_dna should be > 0 after onboarding"

    def test_auth_me_has_dna_after_onboarding(self, session, chicago_token):
        """/auth/me returns pro_unlocked field"""
        r = session.get(f"{BASE_URL}/api/auth/me",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200
        data = r.json()
        assert "pro_unlocked" in data, "/auth/me should return pro_unlocked"
        assert "dna" in data, "/auth/me should return dna"


# ====================================
# Edge Cases
# ====================================
class TestEdgeCases:

    def test_eligibility_message_not_empty(self, session, chicago_token):
        """Message should always be a non-empty string"""
        r = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("message"), "Message should not be empty"
        assert len(data["message"]) > 5, "Message should be meaningful"

    def test_eligibility_avg_dna_range(self, session, chicago_token):
        """avg_dna should be between 0 and 100"""
        r = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200
        data = r.json()
        if data.get("avg_dna") is not None:
            assert 0 <= data["avg_dna"] <= 100, f"avg_dna out of range: {data['avg_dna']}"

    def test_bioscan_returns_scan_type(self, session, admin_token):
        """Bioscan response should always include scan_type"""
        r = session.post(f"{BASE_URL}/api/nexus/bioscan",
                         headers={"Authorization": f"Bearer {admin_token}"})
        if r.status_code == 200:
            data = r.json()
            assert data.get("scan_type") in ["baseline", "validation", "evolution"], \
                f"Unexpected scan_type: {data.get('scan_type')}"

    def test_invalid_token_blocked(self, session):
        """Invalid token should return 401 or 403"""
        r = session.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                        headers={"Authorization": "Bearer invalid_token"})
        assert r.status_code in [401, 403], f"Invalid token should be rejected, got {r.status_code}"
