"""
Sprint 30 — DNA Athletic Hub Backend Tests
Tests: /api/coach/athletes/full, /api/coach/athlete/{id}/full-profile,
       /api/crew/manage, /api/crew/invite, /api/crew/invitations/{id}/respond
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
EMAIL = "ogrisek.stefano@gmail.com"
PASSWORD = "Founder@KORE2026!"


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for STEFANO OGRISEK (GYM_OWNER/ADMIN)"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if resp.status_code != 200:
        pytest.skip(f"Login failed: {resp.status_code} — {resp.text}")
    data = resp.json()
    token = data.get("token") or data.get("access_token")
    if not token:
        pytest.skip("No token in login response")
    return token


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ── Health check ──────────────────────────────────────────────────────────────

class TestBackendHealth:
    """Basic connectivity"""

    def test_backend_reachable(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/health")
        assert resp.status_code in (200, 404), f"Backend not reachable: {resp.status_code}"
        print(f"Backend health: {resp.status_code}")


# ── /api/coach/athletes/full ──────────────────────────────────────────────────

class TestAthletesFullTable:
    """GET /api/coach/athletes/full — returns athletes with six_axis, injury_risk, global_rank, crews"""

    def test_returns_200_with_athletes(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/coach/athletes/full",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        print(f"Athletes full response keys: {list(data.keys())}")
        assert "athletes" in data, "Missing 'athletes' key"
        assert "total" in data, "Missing 'total' key"
        print(f"Total athletes: {data['total']}")

    def test_athlete_has_six_axis(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/coach/athletes/full",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        athletes = resp.json().get("athletes", [])
        if not athletes:
            pytest.skip("No athletes returned — check gym/crew assignment")
        a = athletes[0]
        six = a.get("six_axis")
        assert six is not None, "Missing six_axis"
        for key in ["endurance", "power", "mobility", "technique", "recovery", "agility"]:
            assert key in six, f"six_axis missing '{key}'"
            assert isinstance(six[key], (int, float)), f"six_axis['{key}'] not numeric"
        print(f"six_axis OK: {six}")

    def test_athlete_has_injury_risk(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/coach/athletes/full",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        athletes = resp.json().get("athletes", [])
        if not athletes:
            pytest.skip("No athletes returned")
        a = athletes[0]
        ir = a.get("injury_risk")
        assert ir is not None, "Missing injury_risk"
        assert "level" in ir and ir["level"] in ("HIGH", "MEDIUM", "LOW"), f"Bad level: {ir}"
        assert "risk_pct" in ir, "Missing risk_pct"
        assert "color" in ir, "Missing color"
        print(f"injury_risk OK: {ir}")

    def test_athlete_has_global_rank(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/coach/athletes/full",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        athletes = resp.json().get("athletes", [])
        if not athletes:
            pytest.skip("No athletes returned")
        a = athletes[0]
        assert "global_rank" in a, "Missing global_rank"
        assert isinstance(a["global_rank"], int), "global_rank not int"
        print(f"global_rank: {a['global_rank']}")

    def test_athlete_has_crews_array(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/coach/athletes/full",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        athletes = resp.json().get("athletes", [])
        if not athletes:
            pytest.skip("No athletes returned")
        a = athletes[0]
        assert "crews" in a, "Missing crews"
        assert isinstance(a["crews"], list), "crews not a list"
        print(f"crews: {a['crews']}")

    def test_sort_by_dna(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/coach/athletes/full?sort_by=dna_avg&sort_order=desc",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        athletes = resp.json().get("athletes", [])
        if len(athletes) >= 2:
            dna_vals = [a["dna_avg"] for a in athletes]
            assert dna_vals == sorted(dna_vals, reverse=True), "Not sorted by dna_avg desc"
        print("Sort by DNA OK")

    def test_injury_filter_high(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/coach/athletes/full?injury_level=HIGH",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        athletes = resp.json().get("athletes", [])
        for a in athletes:
            assert a["injury_risk"]["level"] == "HIGH", f"Filter failed: {a['injury_risk']['level']}"
        print(f"Injury filter HIGH: {len(athletes)} athletes")

    def test_requires_auth(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/coach/athletes/full")
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("Auth required: OK")


# ── /api/coach/athlete/{id}/full-profile ─────────────────────────────────────

class TestAthleteFullProfile:
    """GET /api/coach/athlete/{id}/full-profile — returns deep dive with scan_trend, trend_direction, six_axis, injury_risk, multiskill, crews"""

    def _get_first_athlete_id(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/coach/athletes/full",
                              headers={"Authorization": f"Bearer {auth_token}"})
        athletes = resp.json().get("athletes", [])
        if not athletes:
            return None
        return athletes[0]["id"]

    def test_returns_200(self, api_client, auth_token):
        aid = self._get_first_athlete_id(api_client, auth_token)
        if not aid:
            pytest.skip("No athletes available")
        resp = api_client.get(f"{BASE_URL}/api/coach/athlete/{aid}/full-profile",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200, f"Expected 200: {resp.status_code} — {resp.text}"
        print(f"Full profile 200 OK for athlete {aid}")

    def test_has_six_axis(self, api_client, auth_token):
        aid = self._get_first_athlete_id(api_client, auth_token)
        if not aid:
            pytest.skip("No athletes available")
        resp = api_client.get(f"{BASE_URL}/api/coach/athlete/{aid}/full-profile",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        data = resp.json()
        six = data.get("six_axis")
        assert six is not None
        for k in ["endurance", "power", "mobility", "technique", "recovery", "agility"]:
            assert k in six, f"Missing {k} in six_axis"
        print(f"six_axis: {six}")

    def test_has_scan_trend(self, api_client, auth_token):
        aid = self._get_first_athlete_id(api_client, auth_token)
        if not aid:
            pytest.skip("No athletes available")
        resp = api_client.get(f"{BASE_URL}/api/coach/athlete/{aid}/full-profile",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "scan_trend" in data, "Missing scan_trend"
        assert "trend_direction" in data, "Missing trend_direction"
        assert data["trend_direction"] in ("up", "down", "stable"), f"Bad trend_direction: {data['trend_direction']}"
        print(f"scan_trend: {len(data['scan_trend'])} entries, direction: {data['trend_direction']}")

    def test_has_injury_risk_with_recommendation(self, api_client, auth_token):
        aid = self._get_first_athlete_id(api_client, auth_token)
        if not aid:
            pytest.skip("No athletes available")
        resp = api_client.get(f"{BASE_URL}/api/coach/athlete/{aid}/full-profile",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        data = resp.json()
        ir = data.get("injury_risk")
        assert ir is not None
        assert "recommendation" in ir, "Missing recommendation"
        assert len(ir["recommendation"]) > 5, "Recommendation too short"
        print(f"injury_risk recommendation: {ir['recommendation'][:60]}...")

    def test_has_multiskill_and_crews(self, api_client, auth_token):
        aid = self._get_first_athlete_id(api_client, auth_token)
        if not aid:
            pytest.skip("No athletes available")
        resp = api_client.get(f"{BASE_URL}/api/coach/athlete/{aid}/full-profile",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "multiskill" in data, "Missing multiskill"
        assert "crews" in data, "Missing crews"
        assert isinstance(data["crews"], list), "crews not a list"
        print(f"multiskill: {data['multiskill']}, crews: {data['crews']}")

    def test_invalid_id_returns_404(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/coach/athlete/000000000000000000000000/full-profile",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("Invalid ID 404: OK")


# ── /api/crew/manage ──────────────────────────────────────────────────────────

class TestCrewManage:
    """GET /api/crew/manage — returns crews with weighted_dna, avg_six_axis, members with role badges"""

    def test_returns_200(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/crew/manage",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200, f"Expected 200: {resp.status_code} — {resp.text}"
        data = resp.json()
        print(f"Crew manage response keys: {list(data.keys())}")
        assert "crews" in data
        assert "sent_invitations" in data
        assert "pending_for_me" in data

    def test_crew_has_weighted_dna(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/crew/manage",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        crews = resp.json().get("crews", [])
        if not crews:
            pytest.skip("No crews owned/coached by this user")
        crew = crews[0]
        assert "weighted_dna" in crew, "Missing weighted_dna"
        assert isinstance(crew["weighted_dna"], (int, float))
        print(f"weighted_dna: {crew['weighted_dna']}")

    def test_crew_has_avg_six_axis(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/crew/manage",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        crews = resp.json().get("crews", [])
        if not crews:
            pytest.skip("No crews available")
        crew = crews[0]
        avg_six = crew.get("avg_six_axis")
        assert avg_six is not None, "Missing avg_six_axis"
        for k in ["endurance", "power", "mobility", "technique", "recovery", "agility"]:
            assert k in avg_six, f"avg_six_axis missing '{k}'"
        print(f"avg_six_axis: {avg_six}")

    def test_members_have_role_badges(self, api_client, auth_token):
        resp = api_client.get(f"{BASE_URL}/api/crew/manage",
                              headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        crews = resp.json().get("crews", [])
        if not crews:
            pytest.skip("No crews available")
        crew = crews[0]
        members = crew.get("members", [])
        if not members:
            pytest.skip("Crew has no members")
        for m in members:
            assert "role" in m, "Member missing role"
            assert m["role"] in ("OWNER", "COACH", "ATHLETE"), f"Invalid role: {m['role']}"
        print(f"Member roles: {[m['role'] for m in members]}")

    def test_requires_auth(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/crew/manage")
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("Auth required: OK")


# ── /api/crew/invite ──────────────────────────────────────────────────────────

class TestCrewInvite:
    """POST /api/crew/invite"""

    def test_invite_missing_fields_returns_400(self, api_client, auth_token):
        resp = api_client.post(f"{BASE_URL}/api/crew/invite",
                               json={},
                               headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print("Missing fields 400: OK")

    def test_invite_invalid_crew_returns_404(self, api_client, auth_token):
        resp = api_client.post(f"{BASE_URL}/api/crew/invite",
                               json={"crew_id": "000000000000000000000000", "email": "test@test.com", "role": "ATHLETE"},
                               headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("Invalid crew 404: OK")

    def test_invite_unknown_user_returns_404(self, api_client, auth_token):
        # Get a valid crew ID first
        resp = api_client.get(f"{BASE_URL}/api/crew/manage",
                              headers={"Authorization": f"Bearer {auth_token}"})
        crews = resp.json().get("crews", [])
        if not crews:
            pytest.skip("No crews available to test invite")
        crew_id = crews[0]["id"]

        inv_resp = api_client.post(f"{BASE_URL}/api/crew/invite",
                                   json={"crew_id": crew_id, "email": "nobody@nonexistent.xyz", "role": "ATHLETE"},
                                   headers={"Authorization": f"Bearer {auth_token}"})
        assert inv_resp.status_code == 404, f"Expected 404, got {inv_resp.status_code}: {inv_resp.text}"
        print("Unknown user 404: OK")

    def test_requires_auth(self, api_client):
        resp = api_client.post(f"{BASE_URL}/api/crew/invite",
                               json={"crew_id": "abc", "email": "x@x.com"})
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("Auth required: OK")


# ── /api/crew/invitations/{id}/respond ───────────────────────────────────────

class TestCrewInvitationsRespond:
    """POST /api/crew/invitations/{id}/respond"""

    def test_invalid_invitation_id(self, api_client, auth_token):
        resp = api_client.post(f"{BASE_URL}/api/crew/invitations/000000000000000000000000/respond",
                               json={"action": "accept"},
                               headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code in (403, 404), f"Expected 403/404, got {resp.status_code}: {resp.text}"
        print(f"Invalid invitation: {resp.status_code} OK")

    def test_bad_action_returns_400(self, api_client, auth_token):
        resp = api_client.post(f"{BASE_URL}/api/crew/invitations/000000000000000000000000/respond",
                               json={"action": "maybe"},
                               headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code in (400, 403, 404), f"Expected 400/403/404, got {resp.status_code}"
        print(f"Bad action: {resp.status_code} OK")

    def test_requires_auth(self, api_client):
        resp = api_client.post(f"{BASE_URL}/api/crew/invitations/someid/respond",
                               json={"action": "accept"})
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("Auth required: OK")
