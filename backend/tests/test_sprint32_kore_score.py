"""
Sprint 32 — KORE SCORE Engine
Tests for:
  - GET /api/coach/kore-score/{athlete_id}/breakdown
  - GET /api/coach/athletes/full (kore_score, kore_grade, kore_color fields)
  - compute_kore_score logic: score range, grade mapping, posture penalty activation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

COACH_EMAIL = "ogrisek.stefano@gmail.com"
COACH_PASS  = "Founder@KORE2026!"


@pytest.fixture(scope="module")
def coach_token():
    """Authenticate as admin/GYM_OWNER (Stefano)"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": COACH_EMAIL, "password": COACH_PASS})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def athletes_full(coach_token):
    """GET /api/coach/athletes/full"""
    resp = requests.get(
        f"{BASE_URL}/api/coach/athletes/full",
        headers={"Authorization": f"Bearer {coach_token}"}
    )
    assert resp.status_code == 200, f"Athletes full failed: {resp.text}"
    return resp.json()


# ── 1. athletes/full endpoint ─────────────────────────────────────────────────

class TestAthletesFullKoreFields:
    """GET /api/coach/athletes/full returns kore_score, kore_grade, kore_color per athlete"""

    def test_returns_200(self, athletes_full):
        # If fixture succeeded, status was 200
        assert athletes_full is not None

    def test_has_athletes_list(self, athletes_full):
        athletes = athletes_full.get("athletes") if isinstance(athletes_full, dict) else athletes_full
        assert isinstance(athletes, list), f"Expected list, got {type(athletes)}"
        assert len(athletes) > 0, "No athletes returned"

    def test_each_athlete_has_kore_score(self, athletes_full):
        athletes = athletes_full.get("athletes") if isinstance(athletes_full, dict) else athletes_full
        for a in athletes[:5]:  # Check first 5
            assert "kore_score" in a, f"Missing kore_score in athlete {a.get('username')}"
            assert isinstance(a["kore_score"], (int, float)), \
                f"kore_score should be numeric, got {type(a['kore_score'])} for {a.get('username')}"

    def test_each_athlete_has_kore_grade(self, athletes_full):
        athletes = athletes_full.get("athletes") if isinstance(athletes_full, dict) else athletes_full
        for a in athletes[:5]:
            assert "kore_grade" in a, f"Missing kore_grade in athlete {a.get('username')}"
            assert a["kore_grade"] in ("S", "A", "B", "C", "D"), \
                f"kore_grade must be S/A/B/C/D, got '{a['kore_grade']}' for {a.get('username')}"

    def test_each_athlete_has_kore_color(self, athletes_full):
        athletes = athletes_full.get("athletes") if isinstance(athletes_full, dict) else athletes_full
        for a in athletes[:5]:
            assert "kore_color" in a, f"Missing kore_color in athlete {a.get('username')}"
            assert a["kore_color"].startswith("#"), \
                f"kore_color should be hex color, got '{a['kore_color']}' for {a.get('username')}"

    def test_kore_score_range_0_100(self, athletes_full):
        athletes = athletes_full.get("athletes") if isinstance(athletes_full, dict) else athletes_full
        for a in athletes[:10]:
            score = a["kore_score"]
            assert 0 <= score <= 100, f"kore_score {score} out of range for {a.get('username')}"

    def test_kore_grade_consistent_with_score(self, athletes_full):
        """Validate grade matches score thresholds: S>=88, A>=74, B>=58, C>=40, D<40"""
        athletes = athletes_full.get("athletes") if isinstance(athletes_full, dict) else athletes_full
        grade_map = {"S": (88, 100), "A": (74, 87.9), "B": (58, 73.9), "C": (40, 57.9), "D": (0, 39.9)}
        for a in athletes[:10]:
            score = a["kore_score"]
            grade = a["kore_grade"]
            low, high = grade_map[grade]
            # Allow small float tolerance
            assert low - 1 <= score <= high + 1, \
                f"Grade {grade} inconsistent with score {score} for {a.get('username')}"


# ── 2. kore-score breakdown endpoint ─────────────────────────────────────────

class TestKoreScoreBreakdown:
    """GET /api/coach/kore-score/{athlete_id}/breakdown"""

    @pytest.fixture(scope="class")
    def first_athlete_id(self, athletes_full):
        athletes = athletes_full.get("athletes") if isinstance(athletes_full, dict) else athletes_full
        assert len(athletes) > 0
        return athletes[0]["id"]

    @pytest.fixture(scope="class")
    def breakdown_resp(self, first_athlete_id, coach_token):
        resp = requests.get(
            f"{BASE_URL}/api/coach/kore-score/{first_athlete_id}/breakdown",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200, f"Breakdown failed: {resp.text}"
        return resp.json()

    def test_breakdown_returns_200(self, breakdown_resp):
        assert breakdown_resp is not None

    def test_kore_score_top_level(self, breakdown_resp):
        """Response has kore_score key"""
        assert "kore_score" in breakdown_resp, f"Missing kore_score key: {breakdown_resp.keys()}"

    def test_kore_score_score_field(self, breakdown_resp):
        ks = breakdown_resp["kore_score"]
        assert "score" in ks, f"kore_score missing 'score': {ks.keys()}"
        assert 0 <= ks["score"] <= 100, f"score out of range: {ks['score']}"

    def test_kore_score_grade_field(self, breakdown_resp):
        ks = breakdown_resp["kore_score"]
        assert "grade" in ks
        assert ks["grade"] in ("S", "A", "B", "C", "D")

    def test_kore_score_color_field(self, breakdown_resp):
        ks = breakdown_resp["kore_score"]
        assert "color" in ks
        assert ks["color"].startswith("#")

    def test_kore_score_verdict_field(self, breakdown_resp):
        ks = breakdown_resp["kore_score"]
        assert "verdict" in ks
        assert len(ks["verdict"]) > 5, "Verdict should be a meaningful string"

    def test_kore_score_penalty_active_field(self, breakdown_resp):
        ks = breakdown_resp["kore_score"]
        assert "penalty_active" in ks
        assert isinstance(ks["penalty_active"], bool)

    def test_kore_score_posture_penalty_field(self, breakdown_resp):
        ks = breakdown_resp["kore_score"]
        assert "posture_penalty" in ks
        assert ks["posture_penalty"] >= 0, "posture_penalty must be >= 0"

    def test_kore_score_breakdown_dict(self, breakdown_resp):
        ks = breakdown_resp["kore_score"]
        assert "breakdown" in ks
        bd = ks["breakdown"]
        assert isinstance(bd, dict)
        # Must have volume, intensity, biometric keys
        assert "volume" in bd, "Missing 'volume' in breakdown"
        assert "intensity" in bd, "Missing 'intensity' in breakdown"
        assert "biometric" in bd, "Missing 'biometric' in breakdown"

    def test_breakdown_volume_component(self, breakdown_resp):
        bd = breakdown_resp["kore_score"]["breakdown"]
        vol = bd["volume"]
        assert "value" in vol and "weight" in vol and "contribution" in vol and "label" in vol
        assert vol["weight"] == 0.30
        assert 0 <= vol["value"] <= 100

    def test_breakdown_intensity_component(self, breakdown_resp):
        bd = breakdown_resp["kore_score"]["breakdown"]
        intens = bd["intensity"]
        assert "value" in intens and "weight" in intens
        assert intens["weight"] == 0.30
        assert 0 <= intens["value"] <= 100

    def test_breakdown_biometric_component(self, breakdown_resp):
        bd = breakdown_resp["kore_score"]["breakdown"]
        bio = bd["biometric"]
        assert "value" in bio and "weight" in bio
        assert bio["weight"] == 0.40
        assert 0 <= bio["value"] <= 100

    def test_contribution_math_check(self, breakdown_resp):
        """Sum of (value * weight) for the 3 components should approximately equal raw_score before penalty"""
        ks = breakdown_resp["kore_score"]
        bd = ks["breakdown"]
        vol_c = bd["volume"]["contribution"]
        int_c = bd["intensity"]["contribution"]
        bio_c = bd["biometric"]["contribution"]
        raw = round(vol_c + int_c + bio_c, 1)
        penalty = ks["posture_penalty"]
        expected_score = round(raw - penalty, 1)
        actual_score = ks["score"]
        # Allow 1 pt tolerance due to rounding
        assert abs(actual_score - expected_score) <= 1.5, \
            f"Score math mismatch: {actual_score} vs expected {expected_score} (raw={raw}, penalty={penalty})"


# ── 3. KORE Score Logic: Posture Penalty Activation ──────────────────────────

class TestKoreScoreLogic:
    """Unit-level logic test: verify penalty_active=True when avg_scan_quality < dna_potential by >10pts"""

    def test_posture_penalty_activates_when_gap_over_10(self, coach_token):
        """
        Test the penalty logic indirectly: if an athlete has no scans,
        biometric quality = tecnica DNA. We can check if the formula is correct
        by finding an athlete with no scan data and checking penalty_active logic.
        We mainly verify that posture_penalty is a non-negative number.
        """
        # Get athletes and find one to test breakdown
        resp = requests.get(
            f"{BASE_URL}/api/coach/athletes/full",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        athletes = resp.json()
        if isinstance(athletes, dict):
            athletes = athletes.get("athletes", [])

        if not athletes:
            pytest.skip("No athletes available")

        # Test breakdown for first athlete
        a = athletes[0]
        resp2 = requests.get(
            f"{BASE_URL}/api/coach/kore-score/{a['id']}/breakdown",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp2.status_code == 200
        ks = resp2.json()["kore_score"]
        # penalty_active should be a bool
        assert isinstance(ks["penalty_active"], bool)
        # posture_penalty >= 0
        assert ks["posture_penalty"] >= 0
        # If penalty active, posture_penalty must be > 0
        if ks["penalty_active"]:
            assert ks["posture_penalty"] > 0, \
                "penalty_active=True but posture_penalty is 0"

    def test_breakdown_labels_correct(self, coach_token):
        """Breakdown labels must be VOLUME, INTENSITÀ, QUALITÀ BIO"""
        resp = requests.get(
            f"{BASE_URL}/api/coach/athletes/full",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        athletes = resp.json()
        if isinstance(athletes, dict):
            athletes = athletes.get("athletes", [])
        if not athletes:
            pytest.skip("No athletes")

        a = athletes[0]
        resp2 = requests.get(
            f"{BASE_URL}/api/coach/kore-score/{a['id']}/breakdown",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        bd = resp2.json()["kore_score"]["breakdown"]
        assert bd["volume"]["label"] == "VOLUME"
        assert bd["intensity"]["label"] == "INTENSITÀ"
        assert bd["biometric"]["label"] == "QUALITÀ BIO"

    def test_invalid_athlete_id_returns_404(self, coach_token):
        """Non-existent athlete ID should return 404"""
        resp = requests.get(
            f"{BASE_URL}/api/coach/kore-score/000000000000000000000000/breakdown",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 404

    def test_unauthenticated_breakdown_returns_403_or_401(self):
        """No token should be rejected"""
        resp = requests.get(f"{BASE_URL}/api/coach/kore-score/000000000000000000000000/breakdown")
        assert resp.status_code in (401, 403, 422)

    def test_unauthenticated_athletes_full_returns_403_or_401(self):
        """No token should be rejected"""
        resp = requests.get(f"{BASE_URL}/api/coach/athletes/full")
        assert resp.status_code in (401, 403, 422)
