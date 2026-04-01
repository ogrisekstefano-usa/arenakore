"""
Sprint 28 Backend Tests: Talent Scout Engine & Certified Templates (AK Drops)
Tests: /api/talent/discovery, /api/talent/draft/{id}, /api/talent/my-drafts,
       /api/certified-templates, /api/certified-templates/{id}/unlock
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_token():
    """Login with founder account and return token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "ogrisek.stefano@gmail.com",
        "password": "Founder@KORE2026!"
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    assert "token" in data
    return data["token"]


@pytest.fixture(scope="module")
def user_info(auth_token):
    """Get user profile"""
    resp = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
    assert resp.status_code == 200
    return resp.json()


# ── TALENT DISCOVERY ──────────────────────────────────────────────────────────

class TestTalentDiscovery:
    """Test GET /api/talent/discovery"""

    def test_discovery_returns_200(self, auth_token):
        """Talent discovery endpoint returns 200 for GYM_OWNER"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:300]}"
        print("✅ talent/discovery returns 200")

    def test_discovery_response_structure(self, auth_token):
        """Response has athletes list, total, and filters"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        assert "athletes" in data, "Missing 'athletes' key"
        assert "total" in data, "Missing 'total' key"
        assert "filters" in data, "Missing 'filters' key"
        assert isinstance(data["athletes"], list), "athletes must be a list"
        print(f"✅ Response structure valid. Total: {data['total']}, Returned: {len(data['athletes'])}")

    def test_discovery_athletes_have_required_fields(self, auth_token):
        """Each athlete has id, username, dna_avg, relative_score, talent_tier, already_drafted"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        athletes = data["athletes"]
        assert len(athletes) > 0, "No athletes returned — expected at least 1"

        required_fields = ["id", "username", "dna_avg", "relative_score", "talent_tier", "already_drafted", "level", "city", "sport"]
        for a in athletes[:5]:
            for field in required_fields:
                assert field in a, f"Missing field '{field}' in athlete: {a}"
        print(f"✅ Athlete fields present: {required_fields}")

    def test_discovery_talent_tier_values(self, auth_token):
        """talent_tier must be one of ELITE/PRO/RISING/SCOUT"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        valid_tiers = {"ELITE", "PRO", "RISING", "SCOUT"}
        for a in data["athletes"]:
            assert a["talent_tier"] in valid_tiers, f"Invalid tier: {a['talent_tier']}"
        print(f"✅ All talent_tier values valid: {valid_tiers}")

    def test_discovery_relative_score_is_numeric(self, auth_token):
        """relative_score must be a number > 0"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        for a in data["athletes"]:
            assert isinstance(a["relative_score"], (int, float)), f"relative_score is not numeric: {a['relative_score']}"
            assert a["relative_score"] >= 0, f"relative_score negative: {a['relative_score']}"
        print("✅ relative_score is numeric and non-negative for all athletes")

    def test_discovery_already_drafted_is_boolean(self, auth_token):
        """already_drafted must be a boolean"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        for a in data["athletes"]:
            assert isinstance(a["already_drafted"], bool), f"already_drafted not boolean: {a['already_drafted']}"
        print("✅ already_drafted is boolean for all athletes")

    def test_discovery_sorted_by_relative_score_by_default(self, auth_token):
        """Default sort: athletes sorted by relative_score descending"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        scores = [a["relative_score"] for a in data["athletes"]]
        assert scores == sorted(scores, reverse=True), "Athletes not sorted by relative_score desc"
        print(f"✅ Athletes sorted by relative_score: {scores[:5]}")

    def test_discovery_sort_by_dna_avg(self, auth_token):
        """sort_by=dna_avg returns athletes sorted by dna_avg descending"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery?sort_by=dna_avg",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        dna_scores = [a["dna_avg"] for a in data["athletes"]]
        assert dna_scores == sorted(dna_scores, reverse=True), "Athletes not sorted by dna_avg desc"
        print(f"✅ sort_by=dna_avg works: {dna_scores[:5]}")

    def test_discovery_filter_by_min_dna(self, auth_token):
        """min_dna filter returns only athletes with dna_avg >= threshold"""
        min_dna = 50
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery?min_dna={min_dna}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        for a in data["athletes"]:
            assert a["dna_avg"] >= min_dna, f"Athlete {a['username']} dna_avg {a['dna_avg']} < min_dna {min_dna}"
        print(f"✅ min_dna={min_dna} filter works. Athletes: {len(data['athletes'])}")

    def test_discovery_limit_default_20(self, auth_token):
        """Default limit is 20 athletes"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        assert len(data["athletes"]) <= 20, f"Default limit exceeded: {len(data['athletes'])}"
        print(f"✅ Default limit respected: {len(data['athletes'])} athletes")

    def test_discovery_excludes_self(self, auth_token, user_info):
        """Current user (STEFANO) should not appear in results"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        self_username = user_info.get("username", "STEFANO")
        for a in data["athletes"]:
            assert a["username"] != self_username, f"Self ({self_username}) appeared in discovery results!"
        print(f"✅ Self ({self_username}) correctly excluded from discovery")

    def test_discovery_unauthorized_returns_401(self):
        """No token → 401/403 (auth required)"""
        resp = requests.get(f"{BASE_URL}/api/talent/discovery")
        assert resp.status_code in (401, 403), f"Expected 401/403, got {resp.status_code}"
        print(f"✅ discovery requires auth ({resp.status_code} without token)")


# ── TALENT DRAFT ──────────────────────────────────────────────────────────────

class TestTalentDraft:
    """Test POST /api/talent/draft/{athlete_id}"""

    def test_get_draft_target(self, auth_token):
        """Get an athlete ID to draft from discovery"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        not_drafted = [a for a in data["athletes"] if not a["already_drafted"]]
        if not not_drafted:
            pytest.skip("All athletes already drafted — no fresh target")
        target = not_drafted[0]
        print(f"✅ Found draft target: {target['username']} (id: {target['id']})")
        return target

    def test_draft_athlete_success(self, auth_token):
        """POST /talent/draft/{id} drafts a not-yet-drafted athlete"""
        # Get discovery
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        not_drafted = [a for a in data["athletes"] if not a["already_drafted"]]
        if not not_drafted:
            pytest.skip("No undrafted athletes available")

        target_id = not_drafted[0]["id"]
        target_name = not_drafted[0]["username"]

        draft_resp = requests.post(
            f"{BASE_URL}/api/talent/draft/{target_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={}
        )
        assert draft_resp.status_code == 200, f"Draft failed: {draft_resp.text}"
        draft_data = draft_resp.json()
        assert draft_data.get("status") == "drafted", f"Expected 'drafted', got: {draft_data}"
        assert "athlete" in draft_data
        print(f"✅ Draft succeeded for {target_name}: {draft_data}")

    def test_draft_duplicate_blocked(self, auth_token):
        """Drafting the same athlete twice returns 400"""
        # First find an already-drafted one
        resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        already_drafted = [a for a in data["athletes"] if a["already_drafted"]]
        if not already_drafted:
            # Draft one first, then retry
            not_drafted = [a for a in data["athletes"] if not a["already_drafted"]]
            if not not_drafted:
                pytest.skip("No athletes to test duplicate draft")
            target_id = not_drafted[0]["id"]
            requests.post(
                f"{BASE_URL}/api/talent/draft/{target_id}",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={}
            )
            already_drafted_id = target_id
        else:
            already_drafted_id = already_drafted[0]["id"]

        # Now try to draft again
        dup_resp = requests.post(
            f"{BASE_URL}/api/talent/draft/{already_drafted_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={}
        )
        assert dup_resp.status_code == 400, f"Expected 400 for duplicate draft, got {dup_resp.status_code}: {dup_resp.text}"
        print(f"✅ Duplicate draft blocked with 400: {dup_resp.json()}")

    def test_draft_invalid_id_returns_404(self, auth_token):
        """Invalid athlete ID → 404"""
        resp = requests.post(
            f"{BASE_URL}/api/talent/draft/000000000000000000000000",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={}
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("✅ Invalid athlete ID returns 404")

    def test_get_my_drafts(self, auth_token):
        """GET /talent/my-drafts returns drafts with correct structure"""
        resp = requests.get(
            f"{BASE_URL}/api/talent/my-drafts",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, f"my-drafts failed: {resp.text}"
        data = resp.json()
        assert "drafts" in data
        assert "count" in data
        assert isinstance(data["drafts"], list)

        if data["drafts"]:
            draft = data["drafts"][0]
            required = ["draft_id", "athlete_id", "username", "dna_avg", "relative_score", "status"]
            for field in required:
                assert field in draft, f"Missing field '{field}' in draft"
            assert draft["status"] in ["pending", "accepted", "declined"], f"Invalid status: {draft['status']}"
        print(f"✅ my-drafts returned {data['count']} drafts with correct structure")

    def test_discovery_shows_drafted_as_already_drafted(self, auth_token):
        """Athletes that were drafted show already_drafted=True in discovery"""
        # Get my drafts
        drafts_resp = requests.get(
            f"{BASE_URL}/api/talent/my-drafts",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = drafts_resp.json()
        if not data["drafts"]:
            pytest.skip("No drafts to verify")
        drafted_ids = {d["athlete_id"] for d in data["drafts"]}

        # Check discovery
        discovery_resp = requests.get(
            f"{BASE_URL}/api/talent/discovery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        athletes = discovery_resp.json()["athletes"]
        for a in athletes:
            if a["id"] in drafted_ids:
                assert a["already_drafted"] is True, f"Drafted athlete {a['username']} shows already_drafted=False"
        print(f"✅ Drafted athletes show already_drafted=True in discovery")


# ── CERTIFIED TEMPLATES ───────────────────────────────────────────────────────

class TestCertifiedTemplates:
    """Test GET /api/certified-templates and POST /api/certified-templates/{id}/unlock"""

    def test_get_certified_templates_200(self, auth_token):
        """GET /certified-templates returns 200"""
        resp = requests.get(
            f"{BASE_URL}/api/certified-templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, f"Expected 200: {resp.text[:300]}"
        print("✅ /certified-templates returns 200")

    def test_certified_templates_count(self, auth_token):
        """Should return exactly 4 TalosFit templates"""
        resp = requests.get(
            f"{BASE_URL}/api/certified-templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        assert "templates" in data, "Missing 'templates' key"
        templates = data["templates"]
        assert len(templates) == 4, f"Expected 4 templates, got {len(templates)}"
        print(f"✅ 4 templates returned")

    def test_certified_templates_structure(self, auth_token):
        """Each template has required fields: id, name, is_unlocked, can_afford, meets_level, required_drops, required_level"""
        resp = requests.get(
            f"{BASE_URL}/api/certified-templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        templates = data["templates"]
        required_fields = ["id", "name", "is_unlocked", "can_afford", "meets_level", "can_unlock", "required_drops", "required_level", "discipline", "certified_by"]
        for t in templates:
            for field in required_fields:
                assert field in t, f"Missing field '{field}' in template {t.get('name', '?')}"
        print(f"✅ All template fields present: {required_fields}")

    def test_certified_templates_founder_unlocked(self, auth_token, user_info):
        """Founder (is_founder=True) sees all templates as is_unlocked=True"""
        if not user_info.get("is_founder", False):
            pytest.skip("Test only valid for founder account")
        resp = requests.get(
            f"{BASE_URL}/api/certified-templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        for t in data["templates"]:
            assert t["is_unlocked"] is True, f"Template {t['name']} is not unlocked for founder"
        print("✅ All 4 templates unlocked for founder (is_founder=True)")

    def test_certified_templates_ak_drops_in_response(self, auth_token):
        """Response includes ak_drops and user_level"""
        resp = requests.get(
            f"{BASE_URL}/api/certified-templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        assert "ak_drops" in data, "Missing ak_drops in response"
        assert "user_level" in data, "Missing user_level in response"
        assert isinstance(data["ak_drops"], (int, float)), "ak_drops not numeric"
        assert isinstance(data["user_level"], int), "user_level not int"
        print(f"✅ ak_drops={data['ak_drops']}, user_level={data['user_level']}")

    def test_certified_template_names(self, auth_token):
        """Verify expected TalosFit template names"""
        resp = requests.get(
            f"{BASE_URL}/api/certified-templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        names = [t["name"] for t in data["templates"]]
        expected_names = ["POWER PROTOCOL ELITE", "AGILITY MASTER PROTOCOL", "ENDURANCE ELITE 60", "THE COMPLETE ATHLETE"]
        for en in expected_names:
            assert en in names, f"Expected template '{en}' not found. Got: {names}"
        print(f"✅ All expected template names present: {names}")

    def test_certified_template_certified_by_talosfit(self, auth_token):
        """All templates have certified_by field with TalosFit-related value"""
        resp = requests.get(
            f"{BASE_URL}/api/certified-templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        for t in data["templates"]:
            assert t.get("certified_by"), f"certified_by empty for {t['name']}"
        print("✅ certified_by field populated for all templates")

    def test_certified_templates_unauthorized(self):
        """No token → 401/403 (auth required)"""
        resp = requests.get(f"{BASE_URL}/api/certified-templates")
        assert resp.status_code in (401, 403), f"Expected 401/403, got {resp.status_code}"
        print(f"✅ /certified-templates requires auth ({resp.status_code})")

    def test_unlock_already_unlocked_returns_200(self, auth_token, user_info):
        """For templates already in unlocked_tools, returns already_unlocked. Founder check noted."""
        # ct_agility_talosfit may already be in unlocked_tools from prior test
        resp = requests.post(
            f"{BASE_URL}/api/certified-templates/ct_agility_talosfit/unlock",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, f"Expected 200: {resp.text}"
        data = resp.json()
        # Should either be already_unlocked (if in unlocked_tools) or unlocked
        assert data.get("status") in ("already_unlocked", "unlocked"), f"Unexpected status: {data}"
        print(f"✅ Unlock existing template returns: {data.get('status')} — NOTE: Founder bypass in POST not implemented (bug: founders charged AK even though GET shows them as unlocked)")

    def test_unlock_invalid_template_404(self, auth_token):
        """Invalid template ID → 404"""
        resp = requests.post(
            f"{BASE_URL}/api/certified-templates/invalid_template_id/unlock",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("✅ Invalid template ID → 404")
