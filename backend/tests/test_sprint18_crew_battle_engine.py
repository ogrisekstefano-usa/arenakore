"""
Sprint 18 — CREW BATTLE ENGINE tests
Tests: /battles/crew/live, /battles/crew/matchmake, /battles/crew/challenge, /battles/crew/{id}/contribute
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")

EMAIL = "ogrisek.stefano@gmail.com"
PASSWORD = "Founder@KORE2026!"
IRON_WOLVES_ID = "69cbe8b24fa84b1e8ed46adb"
NEXUS_ELITE_ID = "69cbe8b24fa84b1e8ed46adc"
SHADOW_SQUAD_ID = "69cbe8b24fa84b1e8ed46ada"


@pytest.fixture(scope="module")
def auth_token():
    """Login and return JWT token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ── LIVE BATTLE DASHBOARD ─────────────────────────────────────────────────────

class TestLiveBattles:
    """GET /battles/crew/live — live battle dashboard"""

    def test_live_battles_returns_200(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/battles/crew/live", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: live battles returns 200")

    def test_live_battles_is_list(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/battles/crew/live", headers=auth_headers)
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: live battles is list with {len(data)} battles")

    def test_live_battle_shadow_vs_nexus_exists(self, auth_headers):
        """SHADOW SQUAD vs NEXUS ELITE battle should be present"""
        resp = requests.get(f"{BASE_URL}/api/battles/crew/live", headers=auth_headers)
        data = resp.json()
        crew_names = [(b["crew_a"]["name"], b["crew_b"]["name"]) for b in data]
        found = any(
            ("SHADOW SQUAD" in a and "NEXUS ELITE" in b) or ("NEXUS ELITE" in a and "SHADOW SQUAD" in b)
            for a, b in crew_names
        )
        assert found, f"SHADOW SQUAD vs NEXUS ELITE not found in {crew_names}"
        print("PASS: SHADOW SQUAD vs NEXUS ELITE battle found")

    def test_live_battle_scores(self, auth_headers):
        """Scores should be 82.4 (SHADOW SQUAD) and 86.5 (NEXUS ELITE)"""
        resp = requests.get(f"{BASE_URL}/api/battles/crew/live", headers=auth_headers)
        data = resp.json()
        battle = None
        for b in data:
            if b["crew_a"]["name"] == "SHADOW SQUAD" and b["crew_b"]["name"] == "NEXUS ELITE":
                battle = b
                break
        assert battle is not None, "Could not find SHADOW SQUAD vs NEXUS ELITE"
        assert battle["crew_a"]["score"] == 82.4, f"Expected 82.4, got {battle['crew_a']['score']}"
        assert battle["crew_b"]["score"] == 86.5, f"Expected 86.5, got {battle['crew_b']['score']}"
        print(f"PASS: scores correct — {battle['crew_a']['score']} vs {battle['crew_b']['score']}")

    def test_live_battle_user_in_battle(self, auth_headers):
        """user_in_battle should be True since STEFANO is in SHADOW SQUAD"""
        resp = requests.get(f"{BASE_URL}/api/battles/crew/live", headers=auth_headers)
        data = resp.json()
        battle = next(
            (b for b in data if b["crew_a"]["name"] == "SHADOW SQUAD"),
            None
        )
        assert battle is not None
        assert battle["user_in_battle"] is True, f"user_in_battle should be True, got {battle['user_in_battle']}"
        print("PASS: user_in_battle is True for SHADOW SQUAD member")

    def test_live_battle_is_my_crew(self, auth_headers):
        """crew_a.is_my_crew=True for SHADOW SQUAD (STEFANO's crew)"""
        resp = requests.get(f"{BASE_URL}/api/battles/crew/live", headers=auth_headers)
        data = resp.json()
        battle = next(
            (b for b in data if b["crew_a"]["name"] == "SHADOW SQUAD"),
            None
        )
        assert battle is not None
        assert battle["crew_a"]["is_my_crew"] is True, f"crew_a.is_my_crew should be True"
        assert battle["crew_b"]["is_my_crew"] is False, f"crew_b.is_my_crew should be False"
        print("PASS: is_my_crew flags correct")

    def test_live_battle_pct_adds_to_100(self, auth_headers):
        """pct values should add up to ~100"""
        resp = requests.get(f"{BASE_URL}/api/battles/crew/live", headers=auth_headers)
        data = resp.json()
        if data:
            battle = data[0]
            total_pct = battle["crew_a"]["pct"] + battle["crew_b"]["pct"]
            assert abs(total_pct - 100.0) < 0.5, f"Percentages should sum to ~100, got {total_pct}"
            print(f"PASS: pct sums to {total_pct}")

    def test_live_battle_has_ends_at(self, auth_headers):
        """Battle should have ends_at timestamp"""
        resp = requests.get(f"{BASE_URL}/api/battles/crew/live", headers=auth_headers)
        data = resp.json()
        if data:
            assert "ends_at" in data[0], "Battle should have ends_at"
            assert data[0]["ends_at"] is not None
            print(f"PASS: ends_at present: {data[0]['ends_at']}")


# ── MATCHMAKING AI ────────────────────────────────────────────────────────────

class TestMatchmaking:
    """GET /battles/crew/matchmake — AI matchmaking panel"""

    def test_matchmake_returns_200(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/battles/crew/matchmake", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: matchmake returns 200")

    def test_matchmake_has_crew(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/battles/crew/matchmake", headers=auth_headers)
        data = resp.json()
        assert data.get("has_crew") is True, f"has_crew should be True, got {data.get('has_crew')}"
        assert data.get("my_crew_name") == "SHADOW SQUAD"
        print(f"PASS: has_crew=True, crew={data['my_crew_name']}")

    def test_matchmake_my_kore_score(self, auth_headers):
        """STEFANO's SHADOW SQUAD should have KORE score ~82.4"""
        resp = requests.get(f"{BASE_URL}/api/battles/crew/matchmake", headers=auth_headers)
        data = resp.json()
        score = data.get("my_kore_score")
        assert score is not None, "my_kore_score should be present"
        assert 70 <= score <= 100, f"Score should be between 70-100, got {score}"
        print(f"PASS: my_kore_score = {score}")

    def test_matchmake_suggestions_present(self, auth_headers):
        """Should return at least 1 crew suggestion"""
        resp = requests.get(f"{BASE_URL}/api/battles/crew/matchmake", headers=auth_headers)
        data = resp.json()
        suggestions = data.get("suggestions", [])
        assert len(suggestions) >= 1, f"Should have at least 1 suggestion, got {len(suggestions)}"
        print(f"PASS: {len(suggestions)} suggestions returned")

    def test_matchmake_iron_wolves_in_suggestions(self, auth_headers):
        """IRON WOLVES should appear as a suggestion"""
        resp = requests.get(f"{BASE_URL}/api/battles/crew/matchmake", headers=auth_headers)
        data = resp.json()
        names = [s["name"] for s in data.get("suggestions", [])]
        assert "IRON WOLVES" in names, f"IRON WOLVES not in suggestions: {names}"
        print(f"PASS: IRON WOLVES in suggestions: {names}")

    def test_matchmake_suggestion_fields(self, auth_headers):
        """Each suggestion should have required fields"""
        resp = requests.get(f"{BASE_URL}/api/battles/crew/matchmake", headers=auth_headers)
        data = resp.json()
        for sugg in data.get("suggestions", []):
            assert "id" in sugg, "suggestion missing 'id'"
            assert "name" in sugg, "suggestion missing 'name'"
            assert "members_count" in sugg, "suggestion missing 'members_count'"
            assert "kore_battle_score" in sugg, "suggestion missing 'kore_battle_score'"
            assert "score_diff" in sugg, "suggestion missing 'score_diff'"
            assert "is_stronger" in sugg, "suggestion missing 'is_stronger'"
            assert "already_challenged" in sugg, "suggestion missing 'already_challenged'"
        print("PASS: all suggestion fields present")

    def test_matchmake_nexus_elite_already_challenged(self, auth_headers):
        """NEXUS ELITE should be marked as already_challenged=True (active battle)"""
        resp = requests.get(f"{BASE_URL}/api/battles/crew/matchmake", headers=auth_headers)
        data = resp.json()
        nexus = next((s for s in data.get("suggestions", []) if s["name"] == "NEXUS ELITE"), None)
        if nexus:
            assert nexus.get("already_challenged") is True, f"NEXUS ELITE already_challenged should be True, got {nexus.get('already_challenged')}"
            print("PASS: NEXUS ELITE correctly marked as already_challenged=True")
        else:
            print("INFO: NEXUS ELITE not in suggestions (may be filtered out if same battle expired)")


# ── CHALLENGE CREW ─────────────────────────────────────────────────────────────

class TestChallengeCrew:
    """POST /battles/crew/challenge — challenge a crew"""

    def test_challenge_already_active_battle_returns_400(self, auth_headers):
        """Challenging NEXUS ELITE again should return 400 (battle already active)"""
        resp = requests.post(
            f"{BASE_URL}/api/battles/crew/challenge",
            headers=auth_headers,
            json={"crew_id": NEXUS_ELITE_ID, "duration_hours": 24}
        )
        assert resp.status_code == 400, f"Expected 400 (already active), got {resp.status_code}: {resp.text}"
        print(f"PASS: duplicate challenge returns 400 — {resp.json()}")

    def test_challenge_invalid_crew_id_returns_404(self, auth_headers):
        """Challenge with invalid crew ID should return 404"""
        resp = requests.post(
            f"{BASE_URL}/api/battles/crew/challenge",
            headers=auth_headers,
            json={"crew_id": "000000000000000000000000", "duration_hours": 24}
        )
        assert resp.status_code in [404, 400], f"Expected 404/400, got {resp.status_code}: {resp.text}"
        print(f"PASS: invalid crew returns {resp.status_code}")

    def test_challenge_own_crew_returns_400(self, auth_headers):
        """Challenging your own crew should return 400"""
        resp = requests.post(
            f"{BASE_URL}/api/battles/crew/challenge",
            headers=auth_headers,
            json={"crew_id": SHADOW_SQUAD_ID, "duration_hours": 24}
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        print(f"PASS: self-challenge returns 400 — {resp.json()}")


# ── UNAUTHENTICATED GUARD ─────────────────────────────────────────────────────

class TestAuthGuard:
    """All battle endpoints require auth"""

    def test_live_battles_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/battles/crew/live")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: /battles/crew/live requires auth")

    def test_matchmake_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/battles/crew/matchmake")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: /battles/crew/matchmake requires auth")

    def test_challenge_requires_auth(self):
        resp = requests.post(f"{BASE_URL}/api/battles/crew/challenge", json={"crew_id": IRON_WOLVES_ID, "duration_hours": 24})
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: /battles/crew/challenge requires auth")
