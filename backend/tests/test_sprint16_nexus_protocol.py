"""
Sprint 16 — NEXUS PROTOCOL v2
Tests: POST /api/nexus/5beat-dna DNA sync endpoint, auth flow, KORE DNA display
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://voice-coach-40.preview.emergentagent.com')
FOUNDER_EMAIL = "ogrisek.stefano@gmail.com"
FOUNDER_PASS = "Founder@KORE2026!"


@pytest.fixture(scope="module")
def founder_token():
    """Login with founder credentials and get token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": FOUNDER_EMAIL,
        "password": FOUNDER_PASS
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in response"
    return data["token"]


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestAuthFlow:
    """Basic auth validation"""

    def test_founder_login_success(self, api_client):
        """Founder login returns token and user data"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": FOUNDER_EMAIL,
            "password": FOUNDER_PASS,
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        user = data["user"]
        assert user["email"] == FOUNDER_EMAIL
        assert user.get("is_founder") is True

    def test_founder_me_endpoint(self, api_client, founder_token):
        """GET /auth/me returns user with DNA"""
        response = api_client.get(f"{BASE_URL}/api/auth/me",
                                   headers={"Authorization": f"Bearer {founder_token}"})
        assert response.status_code == 200
        user = response.json()
        assert user.get("id") is not None
        print(f"Founder DNA: {user.get('dna')}")


class TestFiveBeatDnaEndpoint:
    """POST /api/nexus/5beat-dna — Save Beat 5 scan results"""

    def test_5beat_dna_requires_auth(self, api_client):
        """Endpoint requires authentication"""
        response = api_client.post(f"{BASE_URL}/api/nexus/5beat-dna", json={
            "dna_results": {"velocita": 87}
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"

    def test_5beat_dna_empty_body_fails(self, api_client, founder_token):
        """Empty dna_results returns 400"""
        response = api_client.post(f"{BASE_URL}/api/nexus/5beat-dna",
            json={"dna_results": {}},
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"

    def test_5beat_dna_saves_all_6_keys(self, api_client, founder_token):
        """POST with 6 KORE DNA keys saves correctly"""
        beat5_dna = {
            "velocita": 87, "forza": 83, "resistenza": 91,
            "tecnica": 88, "mentalita": 94, "flessibilita": 79,
        }
        response = api_client.post(f"{BASE_URL}/api/nexus/5beat-dna",
            json={"dna_results": beat5_dna},
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        assert response.status_code == 200, f"5beat-dna failed: {response.text}"
        data = response.json()
        assert data.get("status") == "5beat_dna_saved"
        assert "dna_updated" in data
        assert "user" in data

        # Verify saved DNA values
        dna_updated = data["dna_updated"]
        assert "velocita" in dna_updated
        assert "forza" in dna_updated
        assert "resistenza" in dna_updated
        assert "tecnica" in dna_updated
        assert "mentalita" in dna_updated
        assert "flessibilita" in dna_updated

        print(f"DNA updated keys: {list(dna_updated.keys())}")
        print(f"User DNA after sync: {data['user'].get('dna')}")

    def test_5beat_dna_values_persist_to_me(self, api_client, founder_token):
        """After 5beat-dna save, /auth/me shows updated DNA"""
        # First save specific values
        beat5_dna = {
            "velocita": 87, "forza": 83, "resistenza": 91,
            "tecnica": 88, "mentalita": 94, "flessibilita": 79,
        }
        save_response = api_client.post(f"{BASE_URL}/api/nexus/5beat-dna",
            json={"dna_results": beat5_dna},
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        assert save_response.status_code == 200

        # Now verify with GET /auth/me
        me_response = api_client.get(f"{BASE_URL}/api/auth/me",
                                      headers={"Authorization": f"Bearer {founder_token}"})
        assert me_response.status_code == 200
        user = me_response.json()
        dna = user.get("dna") or {}

        # Verify DNA values are the ones we just saved
        assert dna.get("velocita") == 87, f"Expected velocita=87, got {dna.get('velocita')}"
        assert dna.get("forza") == 83, f"Expected forza=83, got {dna.get('forza')}"
        assert dna.get("resistenza") == 91, f"Expected resistenza=91, got {dna.get('resistenza')}"
        assert dna.get("tecnica") == 88, f"Expected tecnica=88, got {dna.get('tecnica')}"
        assert dna.get("mentalita") == 94, f"Expected mentalita=94, got {dna.get('mentalita')}"
        assert dna.get("flessibilita") == 79, f"Expected flessibilita=79, got {dna.get('flessibilita')}"

        print(f"Verified DNA from /auth/me: {dna}")

    def test_5beat_dna_invalid_values_skipped(self, api_client, founder_token):
        """Non-numeric dna values are skipped gracefully"""
        response = api_client.post(f"{BASE_URL}/api/nexus/5beat-dna",
            json={"dna_results": {"velocita": "not_a_number", "forza": 80}},
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        # Should succeed with just forza saved (velocita skipped)
        assert response.status_code == 200
        data = response.json()
        assert "forza" in data.get("dna_updated", {})
        assert "velocita" not in data.get("dna_updated", {})

    def test_5beat_dna_response_structure(self, api_client, founder_token):
        """Response contains expected fields"""
        response = api_client.post(f"{BASE_URL}/api/nexus/5beat-dna",
            json={"dna_results": {"velocita": 87, "forza": 83}},
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "dna_updated" in data
        assert "user" in data
        # User should have standard fields
        user = data["user"]
        assert "id" in user
        assert "username" in user
        assert "dna" in user


class TestRescanEligibility:
    """GET /api/nexus/rescan-eligibility"""

    def test_rescan_eligibility_returns_data(self, api_client, founder_token):
        """Endpoint returns scan eligibility data"""
        response = api_client.get(f"{BASE_URL}/api/nexus/rescan-eligibility",
                                   headers={"Authorization": f"Bearer {founder_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "can_scan" in data
        assert "scan_type" in data
        print(f"Rescan eligibility: {data.get('scan_type')}, can_scan: {data.get('can_scan')}")
