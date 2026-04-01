"""
Sprint 34 — Talent Report + Privacy + CertBadge + Scout Visibility
Tests:
- GET /api/talent/report/{id}  — full talent trading card data
- PUT /api/users/scout-visibility — toggle scout visibility
- GET /api/auth/me — is_nexus_certified, scout_visible fields
- GET /api/leaderboard — is_nexus_certified per athlete
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
STEFANO_EMAIL = "ogrisek.stefano@gmail.com"
STEFANO_PASSWORD = "Founder@KORE2026!"

@pytest.fixture(scope="module")
def auth_token():
    """Login as STEFANO and return token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": STEFANO_EMAIL, "password": STEFANO_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} — {r.text}")
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in login response: {list(data.keys())}"
    return token


@pytest.fixture(scope="module")
def stefano_id(auth_token):
    """Get STEFANO's user ID from /api/auth/me"""
    r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
    assert r.status_code == 200
    return r.json()["id"]


# ── AUTH ME — is_nexus_certified + scout_visible ─────────────────────────────
class TestAuthMe:
    """GET /api/auth/me returns is_nexus_certified and scout_visible"""

    def test_me_returns_is_nexus_certified(self, auth_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200
        data = r.json()
        assert "is_nexus_certified" in data, "is_nexus_certified field missing from /auth/me"

    def test_me_returns_scout_visible(self, auth_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200
        data = r.json()
        assert "scout_visible" in data, "scout_visible field missing from /auth/me"

    def test_stefano_is_nexus_certified_true(self, auth_token):
        """STEFANO has onboarding_completed + baseline_scanned_at + dna → should be certified"""
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["is_nexus_certified"] is True, f"STEFANO should be certified, got is_nexus_certified={data.get('is_nexus_certified')}"


# ── TALENT REPORT ─────────────────────────────────────────────────────────────
class TestTalentReport:
    """GET /api/talent/report/{athlete_id}"""

    def test_talent_report_requires_auth(self, stefano_id):
        r = requests.get(f"{BASE_URL}/api/talent/report/{stefano_id}")
        assert r.status_code in (401, 403), f"Expected 401 or 403, got {r.status_code}"

    def test_talent_report_returns_200(self, auth_token, stefano_id):
        r = requests.get(f"{BASE_URL}/api/talent/report/{stefano_id}",
                         headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200, f"Talent report failed: {r.status_code} — {r.text}"

    def test_talent_report_has_athlete_profile(self, auth_token, stefano_id):
        r = requests.get(f"{BASE_URL}/api/talent/report/{stefano_id}",
                         headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200
        data = r.json()
        athlete = data.get("athlete", {})
        assert athlete.get("id") is not None, "athlete.id missing"
        assert athlete.get("username") is not None, "athlete.username missing"
        assert athlete.get("level") is not None, "athlete.level missing"
        assert athlete.get("xp") is not None, "athlete.xp missing"

    def test_talent_report_has_kore_score(self, auth_token, stefano_id):
        r = requests.get(f"{BASE_URL}/api/talent/report/{stefano_id}",
                         headers={"Authorization": f"Bearer {auth_token}"})
        data = r.json()
        kore = data.get("kore_score", {})
        assert "score" in kore, "kore_score.score missing"
        assert "grade" in kore, "kore_score.grade missing"

    def test_talent_report_has_dna_and_world_avg(self, auth_token, stefano_id):
        r = requests.get(f"{BASE_URL}/api/talent/report/{stefano_id}",
                         headers={"Authorization": f"Bearer {auth_token}"})
        data = r.json()
        assert "dna" in data, "dna field missing"
        assert "world_avg_dna" in data, "world_avg_dna missing"
        # DNA should have all 6 keys
        for k in ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]:
            assert k in data["dna"], f"dna.{k} missing"
            assert k in data["world_avg_dna"], f"world_avg_dna.{k} missing"

    def test_talent_report_has_six_axis(self, auth_token, stefano_id):
        r = requests.get(f"{BASE_URL}/api/talent/report/{stefano_id}",
                         headers={"Authorization": f"Bearer {auth_token}"})
        data = r.json()
        assert "six_axis" in data, "six_axis missing"
        assert isinstance(data["six_axis"], dict), "six_axis should be dict"

    def test_talent_report_has_injury_risk(self, auth_token, stefano_id):
        r = requests.get(f"{BASE_URL}/api/talent/report/{stefano_id}",
                         headers={"Authorization": f"Bearer {auth_token}"})
        data = r.json()
        assert "injury_risk" in data, "injury_risk missing"

    def test_talent_report_has_scan_trend(self, auth_token, stefano_id):
        r = requests.get(f"{BASE_URL}/api/talent/report/{stefano_id}",
                         headers={"Authorization": f"Bearer {auth_token}"})
        data = r.json()
        assert "scan_trend" in data, "scan_trend missing"
        assert isinstance(data["scan_trend"], list), "scan_trend should be list"

    def test_talent_report_has_forecast_30d(self, auth_token, stefano_id):
        r = requests.get(f"{BASE_URL}/api/talent/report/{stefano_id}",
                         headers={"Authorization": f"Bearer {auth_token}"})
        data = r.json()
        f30 = data.get("forecast_30d", {})
        assert "projected_dna" in f30, "forecast_30d.projected_dna missing"
        assert "projected_kore" in f30, "forecast_30d.projected_kore missing"
        assert "scans_per_week" in f30, "forecast_30d.scans_per_week missing"
        assert "trend_label" in f30, "forecast_30d.trend_label missing"

    def test_talent_report_has_generated_at(self, auth_token, stefano_id):
        r = requests.get(f"{BASE_URL}/api/talent/report/{stefano_id}",
                         headers={"Authorization": f"Bearer {auth_token}"})
        data = r.json()
        assert "generated_at" in data, "generated_at missing"
        assert "coach_note" in data, "coach_note missing"

    def test_talent_report_athlete_has_is_nexus_certified(self, auth_token, stefano_id):
        r = requests.get(f"{BASE_URL}/api/talent/report/{stefano_id}",
                         headers={"Authorization": f"Bearer {auth_token}"})
        data = r.json()
        athlete = data.get("athlete", {})
        assert "is_nexus_certified" in athlete, "athlete.is_nexus_certified missing from report"

    def test_talent_report_invalid_id_returns_404(self, auth_token):
        r = requests.get(f"{BASE_URL}/api/talent/report/000000000000000000000000",
                         headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 404, f"Expected 404 for invalid ID, got {r.status_code}"


# ── SCOUT VISIBILITY TOGGLE ───────────────────────────────────────────────────
class TestScoutVisibility:
    """PUT /api/users/scout-visibility"""

    def test_scout_visibility_requires_auth(self):
        r = requests.put(f"{BASE_URL}/api/users/scout-visibility",
                         json={"scout_visible": False})
        assert r.status_code in (401, 403), f"Expected 401 or 403, got {r.status_code}"

    def test_set_scout_invisible(self, auth_token):
        r = requests.put(f"{BASE_URL}/api/users/scout-visibility",
                         json={"scout_visible": False},
                         headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200, f"Scout visibility toggle failed: {r.status_code} — {r.text}"
        data = r.json()
        assert data.get("scout_visible") is False, f"Expected scout_visible=false, got {data.get('scout_visible')}"
        assert data.get("status") == "updated", f"Expected status=updated, got {data.get('status')}"

    def test_scout_invisible_persists_in_me(self, auth_token):
        """After setting scout_visible=False, /auth/me should reflect it"""
        requests.put(f"{BASE_URL}/api/users/scout-visibility",
                     json={"scout_visible": False},
                     headers={"Authorization": f"Bearer {auth_token}"})
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("scout_visible") is False, f"scout_visible should be False after toggle, got {data.get('scout_visible')}"

    def test_set_scout_visible_restores(self, auth_token):
        r = requests.put(f"{BASE_URL}/api/users/scout-visibility",
                         json={"scout_visible": True},
                         headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("scout_visible") is True, f"Expected scout_visible=True after restore"

    def test_scout_visible_persists_in_me(self, auth_token):
        """After restoring scout_visible=True, /auth/me should reflect it"""
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("scout_visible") is True, f"scout_visible should be True after restore"

    def test_scout_invisible_removes_from_talent_discovery(self, auth_token, stefano_id):
        """When scout_visible=False, athlete should NOT appear in talent discovery"""
        # Set invisible
        requests.put(f"{BASE_URL}/api/users/scout-visibility",
                     json={"scout_visible": False},
                     headers={"Authorization": f"Bearer {auth_token}"})
        # Check discovery
        r = requests.get(f"{BASE_URL}/api/talent/discovery",
                         headers={"Authorization": f"Bearer {auth_token}"})
        if r.status_code == 200:
            athletes = r.json().get("athletes", [])
            ids = [a["id"] for a in athletes]
            assert stefano_id not in ids, "STEFANO should not appear in discovery when scout_visible=False"
        # Restore
        requests.put(f"{BASE_URL}/api/users/scout-visibility",
                     json={"scout_visible": True},
                     headers={"Authorization": f"Bearer {auth_token}"})


# ── LEADERBOARD — is_nexus_certified ─────────────────────────────────────────
class TestLeaderboardCertBadge:
    """GET /api/leaderboard now returns is_nexus_certified per athlete"""

    def test_leaderboard_global_returns_200(self, auth_token):
        r = requests.get(f"{BASE_URL}/api/leaderboard?type=global",
                         headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200, f"Leaderboard failed: {r.status_code}"

    def test_leaderboard_has_is_nexus_certified_field(self, auth_token):
        r = requests.get(f"{BASE_URL}/api/leaderboard?type=global",
                         headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list), "Leaderboard should return a list"
        if len(data) > 0:
            assert "is_nexus_certified" in data[0], f"is_nexus_certified missing from leaderboard entry: {list(data[0].keys())}"

    def test_leaderboard_certified_athletes_have_bool_flag(self, auth_token):
        r = requests.get(f"{BASE_URL}/api/leaderboard?type=global",
                         headers={"Authorization": f"Bearer {auth_token}"})
        data = r.json()
        for entry in data[:5]:
            assert isinstance(entry.get("is_nexus_certified"), bool), \
                f"is_nexus_certified should be bool, got {type(entry.get('is_nexus_certified'))} for {entry.get('username')}"


# ── TALENT DISCOVERY for other athletes ──────────────────────────────────────
class TestTalentDiscoveryReportButton:
    """GET /api/talent/discovery — verify athlete IDs available for report"""

    def test_discovery_returns_athletes(self, auth_token):
        r = requests.get(f"{BASE_URL}/api/talent/discovery",
                         headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200
        data = r.json()
        athletes = data.get("athletes", [])
        assert len(athletes) > 0, "No athletes in talent discovery"

    def test_discovery_athletes_have_id(self, auth_token):
        r = requests.get(f"{BASE_URL}/api/talent/discovery",
                         headers={"Authorization": f"Bearer {auth_token}"})
        data = r.json()
        for a in data.get("athletes", [])[:5]:
            assert "id" in a, f"Athlete missing id: {a}"

    def test_report_for_non_self_athlete(self, auth_token):
        """Fetch talent report for the first athlete in discovery (non-self)"""
        r = requests.get(f"{BASE_URL}/api/talent/discovery",
                         headers={"Authorization": f"Bearer {auth_token}"})
        athletes = r.json().get("athletes", [])
        if not athletes:
            pytest.skip("No athletes in discovery to test report")
        athlete_id = athletes[0]["id"]
        r2 = requests.get(f"{BASE_URL}/api/talent/report/{athlete_id}",
                          headers={"Authorization": f"Bearer {auth_token}"})
        assert r2.status_code == 200, f"Talent report for {athlete_id} failed: {r2.status_code} — {r2.text}"
        data = r2.json()
        assert data["athlete"]["id"] == athlete_id
        assert "kore_score" in data
        assert "dna" in data
        assert "forecast_30d" in data


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
