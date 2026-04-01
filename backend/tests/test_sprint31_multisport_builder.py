"""
Sprint 31 — Multisport Challenge Builder
Tests: POST /multisport/create, GET /multisport, PUT /multisport/{id}/days,
       PUT /multisport/{id}/automation, GET /challenges/global-leaderboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
EMAIL = "ogrisek.stefano@gmail.com"
PASSWORD = "Founder@KORE2026!"

# ── shared state ──────────────────────────────────────────────────────────────
created_challenge_id = None


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.text}"
    t = r.json().get("token") or r.json().get("access_token")
    assert t, "No token in login response"
    return t


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ── CREATE ────────────────────────────────────────────────────────────────────

class TestCreateMultisportChallenge:
    """POST /api/multisport/create"""

    def test_create_returns_200(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/multisport/create",
                          json={"name": "TEST_IRON WEEK TEST", "duration_days": 7},
                          headers=auth_headers)
        assert r.status_code == 200, f"Create failed: {r.status_code} {r.text}"

    def test_create_returns_challenge_fields(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/multisport/create",
                          json={"name": "TEST_IRON WEEK FIELDS", "duration_days": 7},
                          headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "id" in d
        assert d["name"] == "TEST_IRON WEEK FIELDS"
        assert d["duration_days"] == 7
        assert d["status"] == "draft"
        assert "days" in d
        assert isinstance(d["days"], list)

    def test_create_7_day_scaffolding(self, auth_headers):
        """Challenge with duration_days=7 must return exactly 7 day objects"""
        global created_challenge_id
        r = requests.post(f"{BASE_URL}/api/multisport/create",
                          json={"name": "TEST_SCAFFOLD_7", "duration_days": 7},
                          headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert len(d["days"]) == 7, f"Expected 7 days, got {len(d['days'])}"
        # Save for subsequent tests
        created_challenge_id = d["id"]

    def test_day_structure_has_required_fields(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/multisport/create",
                          json={"name": "TEST_DAY_STRUCT", "duration_days": 3},
                          headers=auth_headers)
        assert r.status_code == 200
        day = r.json()["days"][0]
        for field in ["day", "date", "discipline", "notes"]:
            assert field in day, f"Field '{field}' missing in day object"
        assert day["day"] == 1

    def test_create_missing_name_returns_400(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/multisport/create",
                          json={"duration_days": 7},
                          headers=auth_headers)
        assert r.status_code == 400

    def test_create_no_auth_returns_401(self):
        r = requests.post(f"{BASE_URL}/api/multisport/create",
                          json={"name": "NO_AUTH", "duration_days": 7})
        assert r.status_code in (401, 403)


# ── LIST ──────────────────────────────────────────────────────────────────────

class TestListMultisportChallenges:
    """GET /api/multisport"""

    def test_list_returns_200(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/multisport", headers=auth_headers)
        assert r.status_code == 200, f"List failed: {r.status_code} {r.text}"

    def test_list_returns_challenges_key(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/multisport", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "challenges" in d
        assert isinstance(d["challenges"], list)

    def test_list_includes_created_challenge(self, auth_headers):
        # First create one
        cr = requests.post(f"{BASE_URL}/api/multisport/create",
                           json={"name": "TEST_LIST_VERIFY", "duration_days": 5},
                           headers=auth_headers)
        assert cr.status_code == 200
        new_id = cr.json()["id"]
        # Now list and verify it's there
        lr = requests.get(f"{BASE_URL}/api/multisport", headers=auth_headers)
        assert lr.status_code == 200
        ids = [c["id"] for c in lr.json()["challenges"]]
        assert new_id in ids, "Newly created challenge not found in list"

    def test_list_no_auth_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/multisport")
        assert r.status_code in (401, 403)


# ── UPDATE DAYS ───────────────────────────────────────────────────────────────

class TestUpdateChallengeDays:
    """PUT /api/multisport/{id}/days"""

    def _create_challenge(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/multisport/create",
                          json={"name": "TEST_DAYS_UPDATE", "duration_days": 7},
                          headers=auth_headers)
        assert r.status_code == 200
        return r.json()

    def test_update_days_returns_200(self, auth_headers):
        c = self._create_challenge(auth_headers)
        days = c["days"]
        days[0]["discipline"] = "endurance"
        r = requests.put(f"{BASE_URL}/api/multisport/{c['id']}/days",
                         json={"days": days},
                         headers=auth_headers)
        assert r.status_code == 200, f"Update days failed: {r.status_code} {r.text}"

    def test_update_days_persists(self, auth_headers):
        c = self._create_challenge(auth_headers)
        days = c["days"]
        days[0]["discipline"] = "power"
        days[0]["target_reps"] = 15
        days[2]["discipline"] = "recovery"
        requests.put(f"{BASE_URL}/api/multisport/{c['id']}/days",
                     json={"days": days},
                     headers=auth_headers)
        # GET to verify persistence
        gr = requests.get(f"{BASE_URL}/api/multisport/{c['id']}", headers=auth_headers)
        assert gr.status_code == 200
        fetched_days = gr.json()["days"]
        assert fetched_days[0]["discipline"] == "power"
        assert fetched_days[0]["target_reps"] == 15
        assert fetched_days[2]["discipline"] == "recovery"

    def test_update_days_invalid_discipline_returns_400(self, auth_headers):
        c = self._create_challenge(auth_headers)
        days = c["days"]
        days[0]["discipline"] = "NOT_VALID_DISC"
        r = requests.put(f"{BASE_URL}/api/multisport/{c['id']}/days",
                         json={"days": days},
                         headers=auth_headers)
        assert r.status_code == 400


# ── AUTOMATION ────────────────────────────────────────────────────────────────

class TestUpdateChallengeAutomation:
    """PUT /api/multisport/{id}/automation"""

    def _create_challenge(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/multisport/create",
                          json={"name": "TEST_AUTO_RULES", "duration_days": 7},
                          headers=auth_headers)
        assert r.status_code == 200
        return r.json()

    def test_save_automation_rules_returns_200(self, auth_headers):
        c = self._create_challenge(auth_headers)
        rules = [{"id": "r1", "trigger": "scan_quality_low", "threshold": 60, "action": "assign_recovery"}]
        r = requests.put(f"{BASE_URL}/api/multisport/{c['id']}/automation",
                         json={"rules": rules},
                         headers=auth_headers)
        assert r.status_code == 200, f"Automation update failed: {r.status_code} {r.text}"

    def test_save_automation_rules_response_fields(self, auth_headers):
        c = self._create_challenge(auth_headers)
        rules = [{"id": "r1", "trigger": "recovery_low", "threshold": 50, "action": "notify_coach"}]
        r = requests.put(f"{BASE_URL}/api/multisport/{c['id']}/automation",
                         json={"rules": rules},
                         headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "status" in d
        assert d["status"] == "updated"
        assert d["rules_count"] == 1

    def test_save_multiple_rules(self, auth_headers):
        c = self._create_challenge(auth_headers)
        rules = [
            {"id": "r1", "trigger": "scan_quality_low", "threshold": 60, "action": "assign_recovery"},
            {"id": "r2", "trigger": "pvp_win_streak", "threshold": 3, "action": "assign_power"},
            {"id": "r3", "trigger": "days_inactive", "threshold": 3, "action": "send_alert"},
        ]
        r = requests.put(f"{BASE_URL}/api/multisport/{c['id']}/automation",
                         json={"rules": rules},
                         headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["rules_count"] == 3

    def test_save_invalid_trigger_returns_400(self, auth_headers):
        c = self._create_challenge(auth_headers)
        rules = [{"id": "r1", "trigger": "INVALID_TRIGGER", "threshold": 50, "action": "assign_recovery"}]
        r = requests.put(f"{BASE_URL}/api/multisport/{c['id']}/automation",
                         json={"rules": rules},
                         headers=auth_headers)
        assert r.status_code == 400


# ── GLOBAL LEADERBOARD ────────────────────────────────────────────────────────

class TestGlobalLeaderboard:
    """GET /api/challenges/global-leaderboard"""

    def test_global_leaderboard_returns_200(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/challenges/global-leaderboard", headers=auth_headers)
        assert r.status_code == 200, f"Global leaderboard failed: {r.status_code} {r.text}"

    def test_global_leaderboard_response_structure(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/challenges/global-leaderboard", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "leaderboard" in d
        assert "total_active_challenges" in d
        assert isinstance(d["leaderboard"], list)
        assert isinstance(d["total_active_challenges"], int)

    def test_global_leaderboard_no_auth_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/challenges/global-leaderboard")
        assert r.status_code in (401, 403)


# ── GET SINGLE CHALLENGE ──────────────────────────────────────────────────────

class TestGetSingleChallenge:
    """GET /api/multisport/{challenge_id}"""

    def test_get_challenge_returns_200(self, auth_headers):
        cr = requests.post(f"{BASE_URL}/api/multisport/create",
                           json={"name": "TEST_GET_SINGLE", "duration_days": 7},
                           headers=auth_headers)
        assert cr.status_code == 200
        cid = cr.json()["id"]
        r = requests.get(f"{BASE_URL}/api/multisport/{cid}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == cid

    def test_get_nonexistent_challenge_returns_404(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/multisport/000000000000000000000000", headers=auth_headers)
        assert r.status_code == 404
