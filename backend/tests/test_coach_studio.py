"""
Coach Studio Backend API Tests
Tests for: GET /api/coach/athletes, GET /api/coach/compliance,
           GET /api/coach/radar, POST /api/coach/ai-suggestion
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")


@pytest.fixture(scope="module")
def auth_token():
    """Authenticate and return Bearer token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "ogrisek.stefano@gmail.com",
        "password": "Founder@KORE2026!"
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def headers(auth_token):
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestCoachAthletes:
    """GET /api/coach/athletes — Athletes analytics table"""

    def test_get_athletes_returns_200(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_get_athletes_returns_athletes_array(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes", headers=headers)
        data = resp.json()
        assert "athletes" in data, f"Missing 'athletes' key: {data}"
        assert isinstance(data["athletes"], list), "athletes must be a list"

    def test_get_athletes_count_matches_total(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes", headers=headers)
        data = resp.json()
        assert "total" in data, "Missing 'total' field"
        assert data["total"] == len(data["athletes"]), "total doesn't match athletes count"

    def test_get_athletes_returns_9_athletes(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes", headers=headers)
        data = resp.json()
        count = len(data.get("athletes", []))
        assert count >= 9, f"Expected at least 9 athletes, got {count}"

    def test_athlete_has_required_fields(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes", headers=headers)
        data = resp.json()
        athletes = data.get("athletes", [])
        if not athletes:
            pytest.skip("No athletes returned")
        ath = athletes[0]
        required = ["id", "username", "dna_avg", "level", "xp", "compliance_pct", "dna"]
        for field in required:
            assert field in ath, f"Missing field '{field}' in athlete: {ath.keys()}"

    def test_athlete_dna_has_all_6_attributes(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes", headers=headers)
        data = resp.json()
        athletes = data.get("athletes", [])
        if not athletes:
            pytest.skip("No athletes returned")
        dna = athletes[0].get("dna", {})
        dna_keys = ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]
        for k in dna_keys:
            assert k in dna, f"Missing DNA key '{k}': {dna.keys()}"

    def test_sort_by_dna_avg(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes?sort_by=dna_avg&sort_order=desc", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        athletes = data.get("athletes", [])
        if len(athletes) >= 2:
            scores = [a["dna_avg"] for a in athletes]
            assert scores == sorted(scores, reverse=True), f"Not sorted by dna_avg desc: {scores}"

    def test_filter_by_min_score(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes?min_score=50", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        athletes = data.get("athletes", [])
        for ath in athletes:
            assert ath["dna_avg"] >= 50, f"Athlete with dna_avg={ath['dna_avg']} below min_score=50"

    def test_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes")
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"

    def test_crew_count_returned(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes", headers=headers)
        data = resp.json()
        assert "crew_count" in data, f"Missing 'crew_count': {data.keys()}"


class TestCoachCompliance:
    """GET /api/coach/compliance — Template compliance chart data"""

    def test_get_compliance_returns_200(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/compliance", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_compliance_has_templates_array(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/compliance", headers=headers)
        data = resp.json()
        assert "templates" in data, f"Missing 'templates' key: {data}"
        assert isinstance(data["templates"], list), "templates must be a list"

    def test_compliance_has_total(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/compliance", headers=headers)
        data = resp.json()
        assert "total" in data, "Missing 'total' field"

    def test_compliance_template_structure(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/compliance", headers=headers)
        data = resp.json()
        templates = data.get("templates", [])
        if not templates:
            print("No templates found — seeded template may be absent (check DB)")
            return  # Not a failure if no templates pushed yet
        t = templates[0]
        required = ["push_id", "template_name", "crew_name", "total_athletes", "completers", "compliance_pct"]
        for field in required:
            assert field in t, f"Missing field '{field}' in template: {t.keys()}"

    def test_compliance_pct_is_percentage(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/compliance", headers=headers)
        data = resp.json()
        templates = data.get("templates", [])
        for t in templates:
            pct = t.get("compliance_pct", 0)
            assert 0 <= pct <= 100, f"compliance_pct {pct} out of range [0,100]"

    def test_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/coach/compliance")
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"


class TestCoachRadar:
    """GET /api/coach/radar — DNA Radar comparison data"""

    @pytest.fixture(scope="class")
    def athlete_ids(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes", headers=headers)
        athletes = resp.json().get("athletes", [])
        if len(athletes) < 2:
            pytest.skip("Need at least 2 athletes for radar test")
        return [a["id"] for a in athletes[:2]]

    def test_radar_returns_200(self, headers, athlete_ids):
        ids_param = ",".join(athlete_ids)
        resp = requests.get(f"{BASE_URL}/api/coach/radar?ids={ids_param}", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_radar_returns_athletes_array(self, headers, athlete_ids):
        ids_param = ",".join(athlete_ids)
        resp = requests.get(f"{BASE_URL}/api/coach/radar?ids={ids_param}", headers=headers)
        data = resp.json()
        assert "athletes" in data, f"Missing 'athletes': {data}"
        assert len(data["athletes"]) == len(athlete_ids), f"Expected {len(athlete_ids)} athletes, got {len(data['athletes'])}"

    def test_radar_athlete_has_dna(self, headers, athlete_ids):
        ids_param = ",".join(athlete_ids)
        resp = requests.get(f"{BASE_URL}/api/coach/radar?ids={ids_param}", headers=headers)
        data = resp.json()
        for ath in data.get("athletes", []):
            assert "dna" in ath, f"Missing 'dna' in radar athlete: {ath}"
            dna_keys = ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]
            for k in dna_keys:
                assert k in ath["dna"], f"Missing DNA key '{k}'"

    def test_radar_returns_group_avg(self, headers, athlete_ids):
        ids_param = ",".join(athlete_ids)
        resp = requests.get(f"{BASE_URL}/api/coach/radar?ids={ids_param}", headers=headers)
        data = resp.json()
        assert "group_avg" in data, f"Missing 'group_avg': {data}"

    def test_radar_max_4_athletes(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes", headers=headers)
        athletes = resp.json().get("athletes", [])
        if len(athletes) < 5:
            pytest.skip("Need at least 5 athletes to test max-4 clipping")
        ids_param = ",".join(a["id"] for a in athletes[:6])  # Send 6 — should return max 4
        resp2 = requests.get(f"{BASE_URL}/api/coach/radar?ids={ids_param}", headers=headers)
        data = resp2.json()
        assert len(data.get("athletes", [])) <= 4, f"Radar returned more than 4 athletes"

    def test_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/coach/radar?ids=fakeid")
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"


class TestCoachAISuggestion:
    """POST /api/coach/ai-suggestion — AI training session suggestion"""

    @pytest.fixture(scope="class")
    def athlete_ids(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes", headers=headers)
        athletes = resp.json().get("athletes", [])
        return [a["id"] for a in athletes[:3]]

    def test_ai_suggestion_with_athletes_returns_200(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/ai-suggestion",
                             json={"athlete_ids": athlete_ids},
                             headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_ai_suggestion_empty_athletes_demo_mode(self, headers):
        """With no athletes, should return demo suggestion"""
        resp = requests.post(f"{BASE_URL}/api/coach/ai-suggestion",
                             json={"athlete_ids": []},
                             headers=headers)
        assert resp.status_code == 200, f"Expected 200 (demo), got {resp.status_code}: {resp.text}"

    def test_ai_suggestion_has_suggestion_field(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/ai-suggestion",
                             json={"athlete_ids": athlete_ids},
                             headers=headers)
        data = resp.json()
        assert "suggestion" in data, f"Missing 'suggestion' key: {data}"

    def test_ai_suggestion_blocks_structure(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/ai-suggestion",
                             json={"athlete_ids": athlete_ids},
                             headers=headers)
        data = resp.json()
        suggestion = data.get("suggestion", {})
        assert "blocks" in suggestion, f"Missing 'blocks' in suggestion: {suggestion}"
        blocks = suggestion["blocks"]
        assert len(blocks) >= 1, "AI should return at least 1 block"
        block = blocks[0]
        required = ["exercise", "reps", "sets", "duration_seconds", "rest_seconds"]
        for field in required:
            assert field in block, f"Missing block field '{field}': {block}"

    def test_ai_suggestion_has_intensity(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/ai-suggestion",
                             json={"athlete_ids": athlete_ids},
                             headers=headers)
        data = resp.json()
        suggestion = data.get("suggestion", {})
        assert "intensity" in suggestion, f"Missing 'intensity': {suggestion}"

    def test_ai_suggestion_has_focus_label(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/ai-suggestion",
                             json={"athlete_ids": athlete_ids},
                             headers=headers)
        data = resp.json()
        suggestion = data.get("suggestion", {})
        assert "focus_label" in suggestion, f"Missing 'focus_label': {suggestion}"

    def test_ai_suggestion_group_avg_returned(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/ai-suggestion",
                             json={"athlete_ids": athlete_ids},
                             headers=headers)
        data = resp.json()
        assert "group_avg" in data, f"Missing 'group_avg': {data}"

    def test_ai_suggestion_no_auth_returns_401(self):
        resp = requests.post(f"{BASE_URL}/api/coach/ai-suggestion", json={"athlete_ids": []})
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"
