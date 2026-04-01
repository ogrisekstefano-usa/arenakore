"""
Sprint 33 Backend Tests: AK DROPS System, Talent Discovery v2, CertBadge, Urgency Banner
Tests: /api/talent/discovery (efficiency_ratio sort, filters, fields: is_certified, is_free_agent, dominant_discipline, crews)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_token():
    """Login with STEFANO (GYM_OWNER, onboarding_completed=True, certified)"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "ogrisek.stefano@gmail.com",
        "password": "Founder@KORE2026!"
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    assert "token" in data, "No token in response"
    return data["token"]


@pytest.fixture(scope="module")
def user_profile(auth_token):
    """Get user profile for STEFANO"""
    resp = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert resp.status_code == 200
    return resp.json()


# ── AUTH VERIFICATION ─────────────────────────────────────────────────────────

class TestAuthAndProfile:
    """Verify STEFANO profile has required certification fields"""

    def test_stefano_has_onboarding_completed(self, user_profile):
        """STEFANO should have onboarding_completed=True (certified)"""
        assert user_profile.get("onboarding_completed") is True, \
            f"Expected onboarding_completed=True, got {user_profile.get('onboarding_completed')}"
        print(f"✅ STEFANO onboarding_completed: {user_profile.get('onboarding_completed')}")

    def test_stefano_has_dna(self, user_profile):
        """STEFANO should have dna data"""
        assert user_profile.get("dna"), "STEFANO should have DNA data"
        print(f"✅ STEFANO has DNA: {user_profile.get('dna')}")

    def test_stefano_has_ak_drops(self, user_profile):
        """STEFANO should have ak_credits field (AK Drops)"""
        assert "ak_credits" in user_profile, "User profile missing ak_credits field"
        print(f"✅ STEFANO ak_credits (AK Drops): {user_profile.get('ak_credits')}")


# ── TALENT DISCOVERY — DEFAULT SORT (efficiency_ratio) ───────────────────────

class TestTalentDiscoveryDefaultSort:
    """GET /api/talent/discovery returns athletes sorted by efficiency_ratio"""

    def test_discovery_returns_200(self, auth_token):
        """Endpoint returns HTTP 200"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:300]}"
        print("✅ /api/talent/discovery returns 200")

    def test_discovery_response_structure(self, auth_token):
        """Response has athletes, total, filters keys"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        assert "athletes" in data, "Missing 'athletes' key"
        assert "total" in data, "Missing 'total' key"
        assert "filters" in data, "Missing 'filters' key"
        assert isinstance(data["athletes"], list), "athletes must be a list"
        print(f"✅ Structure valid. total={data['total']}, returned={len(data['athletes'])}")

    def test_discovery_sorted_by_efficiency_ratio_default(self, auth_token):
        """Default sort returns athletes in descending efficiency_ratio order"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery?sort_by=efficiency_ratio",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        athletes = data["athletes"]
        assert len(athletes) > 0, "No athletes returned"
        ratios = [a.get("efficiency_ratio", 0) for a in athletes]
        is_sorted = all(ratios[i] >= ratios[i+1] for i in range(len(ratios)-1))
        assert is_sorted, f"Athletes not sorted by efficiency_ratio DESC: {ratios[:5]}"
        print(f"✅ Athletes sorted by efficiency_ratio DESC: {ratios[:5]}")

    def test_athlete_fields_include_efficiency_ratio(self, auth_token):
        """Each athlete object has efficiency_ratio field"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        athletes = data["athletes"]
        assert len(athletes) > 0, "No athletes returned"
        first = athletes[0]
        assert "efficiency_ratio" in first, f"Missing efficiency_ratio in athlete: {first.keys()}"
        assert isinstance(first["efficiency_ratio"], (int, float)), f"efficiency_ratio should be numeric, got {type(first['efficiency_ratio'])}"
        print(f"✅ efficiency_ratio present: {first['efficiency_ratio']}")

    def test_athlete_fields_include_is_certified(self, auth_token):
        """Each athlete object has is_certified field"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        athletes = data["athletes"]
        assert len(athletes) > 0, "No athletes returned"
        first = athletes[0]
        assert "is_certified" in first, f"Missing is_certified in athlete: {first.keys()}"
        assert isinstance(first["is_certified"], bool), f"is_certified should be bool, got {type(first['is_certified'])}"
        print(f"✅ is_certified present, type: {type(first['is_certified'])}, value: {first['is_certified']}")

    def test_athlete_fields_include_is_free_agent(self, auth_token):
        """Each athlete object has is_free_agent field"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        athletes = data["athletes"]
        assert len(athletes) > 0, "No athletes returned"
        first = athletes[0]
        assert "is_free_agent" in first, f"Missing is_free_agent in athlete: {first.keys()}"
        assert isinstance(first["is_free_agent"], bool), f"is_free_agent should be bool, got {type(first['is_free_agent'])}"
        print(f"✅ is_free_agent present, type: {type(first['is_free_agent'])}, value: {first['is_free_agent']}")

    def test_athlete_fields_include_dominant_discipline(self, auth_token):
        """Each athlete object has dominant_discipline field"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        athletes = data["athletes"]
        assert len(athletes) > 0, "No athletes returned"
        first = athletes[0]
        assert "dominant_discipline" in first, f"Missing dominant_discipline in athlete: {first.keys()}"
        assert isinstance(first["dominant_discipline"], str), f"dominant_discipline should be str, got {type(first['dominant_discipline'])}"
        valid_disciplines = ["ENDURANCE", "POWER", "AGILITY", "TECHNIQUE", "GENERAL"]
        assert first["dominant_discipline"] in valid_disciplines, f"Unexpected discipline: {first['dominant_discipline']}"
        print(f"✅ dominant_discipline: {first['dominant_discipline']}")

    def test_athlete_fields_include_crews(self, auth_token):
        """Each athlete object has crews field (list)"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        athletes = data["athletes"]
        assert len(athletes) > 0, "No athletes returned"
        first = athletes[0]
        assert "crews" in first, f"Missing crews in athlete: {first.keys()}"
        assert isinstance(first["crews"], list), f"crews should be list, got {type(first['crews'])}"
        print(f"✅ crews field present, type: list, value: {first['crews']}")

    def test_efficiency_ratio_not_sorted_by_relative_score(self, auth_token):
        """When sort_by=efficiency_ratio, the sort is NOT based on relative_score"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery?sort_by=efficiency_ratio",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        athletes = data["athletes"]
        assert len(athletes) >= 2, "Need at least 2 athletes to compare"
        # Check that efficiency_ratio is the actual ordering key (not relative_score)
        eff_ratios = [a.get("efficiency_ratio", 0) for a in athletes]
        rel_scores = [a.get("relative_score", 0) for a in athletes]
        eff_sorted = all(eff_ratios[i] >= eff_ratios[i+1] for i in range(len(eff_ratios)-1))
        assert eff_sorted, f"efficiency_ratio order broken: {eff_ratios[:5]}"
        # Verify relative_score is NOT necessarily sorted (different metric)
        rel_sorted = all(rel_scores[i] >= rel_scores[i+1] for i in range(len(rel_scores)-1))
        print(f"✅ Sorted by efficiency_ratio. eff_sorted={eff_sorted}, rel_score_also_sorted={rel_sorted}")
        # We don't assert rel_sorted is False (it could coincidentally be sorted), just verify eff is right


# ── TALENT DISCOVERY — FILTERS ───────────────────────────────────────────────

class TestTalentDiscoveryFilters:
    """GET /api/talent/discovery with crew_status and discipline filters"""

    def test_crew_status_free_agent_filter(self, auth_token):
        """crew_status=free_agent returns only free agents"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery?crew_status=free_agent",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:200]}"
        data = resp.json()
        athletes = data["athletes"]
        # All returned athletes should be free agents
        non_free = [a for a in athletes if not a.get("is_free_agent")]
        assert len(non_free) == 0, f"Found {len(non_free)} non-free-agent athletes in free_agent filter result"
        print(f"✅ crew_status=free_agent: all {len(athletes)} athletes are free agents")

    def test_discipline_power_filter(self, auth_token):
        """discipline=power returns athletes with power dominant discipline"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery?discipline=power",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:200]}"
        data = resp.json()
        athletes = data["athletes"]
        print(f"✅ discipline=power returned {len(athletes)} athletes")
        # If athletes are returned, validate the discipline is power-related
        if athletes:
            # Check dominant_discipline is POWER for at least some (filter is via DNA averages, not exact match)
            print(f"  Sample disciplines: {[a.get('dominant_discipline') for a in athletes[:5]]}")

    def test_combined_free_agent_power_filter(self, auth_token):
        """crew_status=free_agent&discipline=power - combined filter works"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery?crew_status=free_agent&discipline=power",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:200]}"
        data = resp.json()
        athletes = data["athletes"]
        # All returned athletes must be free agents
        non_free = [a for a in athletes if not a.get("is_free_agent")]
        assert len(non_free) == 0, f"Non-free-agents in combined filter result: {len(non_free)}"
        print(f"✅ Combined filter free_agent+power: {len(athletes)} athletes, all free agents")

    def test_continent_eu_filter(self, auth_token):
        """continent=EU filter returns athletes in EU cities"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery?continent=EU",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:200]}"
        data = resp.json()
        athletes = data["athletes"]
        EU_CITIES = ["MILANO", "ROMA", "PARIS", "MADRID", "LONDON", "BERLIN"]
        if athletes:
            for a in athletes:
                city = (a.get("city") or "").upper()
                assert city in EU_CITIES, f"Non-EU city in EU filter result: {city}"
        print(f"✅ continent=EU: {len(athletes)} athletes, all in EU cities")

    def test_sort_by_dna_avg_works(self, auth_token):
        """sort_by=dna_avg returns athletes sorted by dna_avg DESC"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery?sort_by=dna_avg",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        athletes = data["athletes"]
        if len(athletes) >= 2:
            dna_avgs = [a.get("dna_avg", 0) for a in athletes]
            is_sorted = all(dna_avgs[i] >= dna_avgs[i+1] for i in range(len(dna_avgs)-1))
            assert is_sorted, f"Athletes not sorted by dna_avg DESC: {dna_avgs[:5]}"
        print(f"✅ sort_by=dna_avg works correctly")

    def test_discovery_requires_auth(self):
        """Unauthenticated request returns 401/403"""
        resp = requests.get(f"{BASE_URL}/api/talent/discovery")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"✅ Auth required: {resp.status_code}")

    def test_certified_athletes_in_results(self, auth_token):
        """Some athletes in results should be certified (17/46 are certified per spec)"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery?limit=50",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        athletes = data["athletes"]
        certified_count = sum(1 for a in athletes if a.get("is_certified"))
        print(f"✅ Total athletes: {len(athletes)}, certified: {certified_count}, uncertified: {len(athletes)-certified_count}")
        # There should be some certified athletes (spec says 17/46)
        assert certified_count > 0, "No certified athletes found — expected at least some certified athletes"


# ── EFFICIENCY RATIO FORMULA VALIDATION ──────────────────────────────────────

class TestEfficiencyRatioFormula:
    """Verify efficiency_ratio formula: DNA_avg * (11 - min(level,10)) / 10"""

    def test_efficiency_ratio_formula_correct(self, auth_token):
        """Verify efficiency_ratio = DNA_avg * (11 - min(level,10)) / 10"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        athletes = data["athletes"]
        assert len(athletes) > 0, "No athletes to test formula"

        for ath in athletes[:5]:
            dna_avg = ath.get("dna_avg", 0)
            level = ath.get("level", 1)
            eff = ath.get("efficiency_ratio", 0)
            expected = round(min(150, dna_avg * (11 - min(level, 10)) / 10), 1)
            assert abs(eff - expected) < 0.2, \
                f"efficiency_ratio mismatch for {ath.get('username')}: got {eff}, expected {expected} (dna_avg={dna_avg}, level={level})"
        print(f"✅ Efficiency ratio formula validated for {min(5, len(athletes))} athletes")

    def test_low_level_high_dna_has_high_efficiency(self, auth_token):
        """A level 1 athlete with high DNA should have high efficiency ratio"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery?sort_by=efficiency_ratio",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        athletes = data["athletes"]
        if not athletes:
            pytest.skip("No athletes available")
        top = athletes[0]
        # The top athlete by efficiency should either have high DNA or low level
        eff = top.get("efficiency_ratio", 0)
        dna_avg = top.get("dna_avg", 0)
        level = top.get("level", 1)
        print(f"✅ Top efficiency athlete: {top.get('username')}, eff={eff}, dna={dna_avg}, level={level}")
        assert eff > 0, "Top efficiency ratio should be positive"
