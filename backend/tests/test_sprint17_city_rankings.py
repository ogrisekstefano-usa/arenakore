"""
Sprint 17 — City Rankings Dinamici
Tests: GET /api/rankings/city, PUT /api/profile/city
Seed athletes: T.BUTLER, M.JORDAN, L.GRANT, C.HAYES, D.ROSE, K.PAYNE
Founder (Stefano Ogrisek) should be KORE #1 in CHICAGO
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/') or 'https://voice-coach-40.preview.emergentagent.com'

FOUNDER_EMAIL = "ogrisek.stefano@gmail.com"
FOUNDER_PASSWORD = "Founder@KORE2026!"

SEED_USERNAMES = {"T.BUTLER", "M.JORDAN", "L.GRANT", "C.HAYES", "D.ROSE", "K.PAYNE"}

EXPECTED_SCORES = {
    "T.BUTLER": 75,
    "M.JORDAN": 73,
    "L.GRANT": 69,
    "C.HAYES": 65,
    "D.ROSE": 64,
    "K.PAYNE": 58,
}


@pytest.fixture(scope="module")
def founder_token():
    """Login as Stefano Ogrisek (Founder/Admin)"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": FOUNDER_EMAIL,
        "password": FOUNDER_PASSWORD
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    token = data.get("token")
    assert token, "No token returned"
    print(f"\n✅ Founder login OK — user: {data['user']['username']}, XP: {data['user']['xp']}")
    return token


class TestCityRankingEndpoint:
    """GET /api/rankings/city — core endpoint tests"""

    def test_chicago_ranking_returns_200(self, founder_token):
        """Basic: endpoint returns 200 with valid structure"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text}"
        data = resp.json()
        print(f"\n✅ GET /api/rankings/city?city=CHICAGO → 200")
        print(f"   city={data.get('city')}, total_athletes={data.get('total_athletes')}, top10_count={len(data.get('top10', []))}")

    def test_chicago_response_structure(self, founder_token):
        """Response has required top-level fields"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        required_fields = ["city", "total_athletes", "top10", "my_rank", "my_kore_score"]
        for f in required_fields:
            assert f in data, f"Missing field: {f}"
        print(f"\n✅ Top-level fields present: {required_fields}")

    def test_chicago_athlete_row_fields(self, founder_token):
        """Each athlete in top10 has required fields"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        top10 = data.get("top10", [])
        assert len(top10) > 0, "top10 is empty"
        required_athlete_fields = ["rank", "user_id", "username", "kore_score", "dna_avg", "xp", "level", "is_me", "is_founder"]
        for athlete in top10:
            for f in required_athlete_fields:
                assert f in athlete, f"Athlete row missing field: {f} (athlete: {athlete.get('username')})"
        print(f"\n✅ All {len(top10)} athlete rows have required fields")

    def test_chicago_has_min_7_athletes(self, founder_token):
        """CHICAGO should have at least 7 athletes (Stefano + 6 seeds)"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        total = data.get("total_athletes", 0)
        assert total >= 7, f"Expected ≥7 athletes in CHICAGO, got {total}"
        print(f"\n✅ CHICAGO has {total} athletes (expected ≥7)")

    def test_stefano_is_rank_1(self, founder_token):
        """Stefano Ogrisek must be #1 in CHICAGO (my_rank=1, is_me=True)"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        my_rank = data.get("my_rank")
        assert my_rank == 1, f"Expected Stefano at rank 1, got rank {my_rank}"
        print(f"\n✅ Stefano is rank #{my_rank} in CHICAGO")

    def test_stefano_is_me_in_top10(self, founder_token):
        """Stefano's row in top10 must have is_me=True"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        top10 = data.get("top10", [])
        me_rows = [a for a in top10 if a.get("is_me")]
        assert len(me_rows) == 1, f"Expected exactly 1 is_me row, got {len(me_rows)}"
        me = me_rows[0]
        assert me["rank"] == 1, f"is_me row should be rank 1, got rank {me['rank']}"
        print(f"\n✅ Stefano row: rank={me['rank']}, kore_score={me['kore_score']}, is_me={me['is_me']}")

    def test_stefano_kore_score_approx_89(self, founder_token):
        """Stefano KORE_SCORE should be around 89 (DNA avg 87 * 0.85 + XP bonus ≈15)"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        my_score = data.get("my_kore_score")
        assert my_score is not None, "my_kore_score is None"
        # Allow generous range: 70–100 (DNA avg depends on current DB state)
        assert 70 <= my_score <= 100, f"KORE_SCORE out of expected range: {my_score}"
        # Specifically, Stefano should outperform seeds (seeds top is ~75)
        assert my_score > 75, f"Expected Stefano's score > 75, got {my_score}"
        print(f"\n✅ Stefano KORE_SCORE={my_score} (expected ~89)")

    def test_stefano_is_founder_in_top10(self, founder_token):
        """Stefano's row must have is_founder=True"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        top10 = data.get("top10", [])
        me = next((a for a in top10 if a.get("is_me")), None)
        assert me is not None, "Stefano not found in top10"
        assert me.get("is_founder") is True, f"is_founder expected True, got {me.get('is_founder')}"
        print(f"\n✅ Stefano is_founder=True in ranking row")

    def test_all_seed_athletes_present(self, founder_token):
        """All 6 Chicago seed athletes appear in ranking"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        top10 = data.get("top10", [])
        found_names = {a["username"] for a in top10}
        for seed in SEED_USERNAMES:
            assert seed in found_names, f"Seed athlete '{seed}' not found in ranking (found: {found_names})"
        print(f"\n✅ All 6 seed athletes found: {SEED_USERNAMES}")

    def test_ranking_sorted_by_kore_score(self, founder_token):
        """top10 must be sorted by kore_score descending"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        top10 = data.get("top10", [])
        scores = [a["kore_score"] for a in top10]
        assert scores == sorted(scores, reverse=True), f"Ranking not sorted by kore_score: {scores}"
        print(f"\n✅ top10 correctly sorted descending: {scores}")

    def test_rank_numbers_sequential(self, founder_token):
        """rank field must be sequential 1,2,3,..."""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        top10 = data.get("top10", [])
        ranks = [a["rank"] for a in top10]
        expected = list(range(1, len(top10) + 1))
        assert ranks == expected, f"Ranks not sequential: {ranks}"
        print(f"\n✅ Ranks sequential: {ranks}")

    def test_seed_athlete_scores_approximate(self, founder_token):
        """Seed athletes' kore_scores should be close to expected values"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        top10 = data.get("top10", [])
        athlete_map = {a["username"]: a["kore_score"] for a in top10}
        for name, expected in EXPECTED_SCORES.items():
            actual = athlete_map.get(name)
            assert actual is not None, f"{name} not found in ranking"
            # Allow ±3 tolerance for floating point / rounding
            assert abs(actual - expected) <= 3, f"{name}: expected ~{expected}, got {actual}"
            print(f"   {name}: expected~{expected}, got {actual} ✅")
        print(f"\n✅ All seed athlete scores within tolerance")


class TestTokyoRankingEmpty:
    """GET /api/rankings/city?city=TOKYO should return empty"""

    def test_tokyo_returns_200(self, founder_token):
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=TOKYO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text}"
        print(f"\n✅ TOKYO ranking returns 200")

    def test_tokyo_has_zero_athletes(self, founder_token):
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=TOKYO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        total = data.get("total_athletes", -1)
        assert total == 0, f"Expected 0 athletes in TOKYO, got {total}"
        top10 = data.get("top10", None)
        assert top10 == [], f"Expected empty top10 for TOKYO, got {top10}"
        print(f"\n✅ TOKYO has 0 athletes, empty top10 ✅")

    def test_tokyo_my_rank_is_none(self, founder_token):
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=TOKYO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        my_rank = data.get("my_rank")
        assert my_rank is None, f"Expected my_rank=None for TOKYO, got {my_rank}"
        print(f"\n✅ my_rank=None for TOKYO (user not in city) ✅")


class TestProfileCityUpdate:
    """PUT /api/profile/city — city update endpoint"""

    def test_update_city_returns_200(self, founder_token):
        """Successfully update user city"""
        resp = requests.put(
            f"{BASE_URL}/api/profile/city",
            json={"city": "CHICAGO"},
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "updated", f"Expected status='updated', got {data}"
        assert data.get("city") == "CHICAGO", f"Expected city='CHICAGO', got {data.get('city')}"
        print(f"\n✅ PUT /api/profile/city → {data}")

    def test_update_city_normalizes_case(self, founder_token):
        """City input should be normalized to uppercase"""
        resp = requests.put(
            f"{BASE_URL}/api/profile/city",
            json={"city": "chicago"},
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("city") == "CHICAGO", f"Expected 'CHICAGO' (uppercase), got {data.get('city')}"
        print(f"\n✅ City normalized to uppercase: {data.get('city')}")

    def test_update_city_empty_fails(self, founder_token):
        """Empty city should return 400"""
        resp = requests.put(
            f"{BASE_URL}/api/profile/city",
            json={"city": ""},
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        print(f"\n✅ Empty city correctly returns 400")

    def test_update_city_requires_auth(self):
        """Endpoint requires Bearer token"""
        resp = requests.put(f"{BASE_URL}/api/profile/city", json={"city": "CHICAGO"})
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"\n✅ Unauthenticated request correctly rejected: {resp.status_code}")

    def test_update_city_and_verify_in_ranking(self, founder_token):
        """Update city to CHICAGO and verify user appears in CHICAGO ranking"""
        # Ensure Stefano is in CHICAGO
        put_resp = requests.put(
            f"{BASE_URL}/api/profile/city",
            json={"city": "CHICAGO"},
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        assert put_resp.status_code == 200

        # Verify appears in CHICAGO ranking
        rank_resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = rank_resp.json()
        me_in_ranking = any(a.get("is_me") for a in data.get("top10", []))
        assert me_in_ranking, "After updating city to CHICAGO, user should appear in CHICAGO ranking"
        print(f"\n✅ After PUT city=CHICAGO, user appears in CHICAGO ranking with is_me=True")


class TestCityRankingAuth:
    """Authentication enforcement"""

    def test_ranking_requires_auth(self):
        """Unauthenticated request should fail"""
        resp = requests.get(f"{BASE_URL}/api/rankings/city?city=CHICAGO")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}: {resp.text}"
        print(f"\n✅ Unauthenticated /api/rankings/city correctly returns {resp.status_code}")


class TestKoreScoreFormula:
    """Verify KORE_SCORE formula integrity: DNA_avg * 0.85 + XP_bonus (max 15)"""

    def test_kore_score_within_valid_range(self, founder_token):
        """All kore_score values must be in [0, 100]"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        for athlete in data.get("top10", []):
            score = athlete["kore_score"]
            assert 0 <= score <= 100, f"{athlete['username']}: score {score} out of [0,100]"
        print(f"\n✅ All KORE_SCORE values in [0, 100]")

    def test_kore_score_formula_stefano(self, founder_token):
        """Stefano's KORE_SCORE = DNA_avg * 0.85 + XP_bonus (max 15)"""
        resp = requests.get(
            f"{BASE_URL}/api/rankings/city?city=CHICAGO",
            headers={"Authorization": f"Bearer {founder_token}"}
        )
        data = resp.json()
        me = next((a for a in data.get("top10", []) if a.get("is_me")), None)
        if not me:
            pytest.skip("Stefano not in top10, cannot verify formula")
        score = me["kore_score"]
        dna_avg = me["dna_avg"]
        xp = me["xp"]
        xp_bonus = min(15.0, (xp / 10000.0) * 15.0)
        expected = round(dna_avg * 0.85 + xp_bonus, 1)
        assert abs(score - expected) <= 0.2, f"Formula mismatch: got {score}, expected {expected} (DNA_avg={dna_avg}, XP={xp}, xp_bonus={xp_bonus})"
        print(f"\n✅ Stefano KORE_SCORE formula verified: {dna_avg}*0.85 + {round(xp_bonus,1)} = {expected} (got {score})")
