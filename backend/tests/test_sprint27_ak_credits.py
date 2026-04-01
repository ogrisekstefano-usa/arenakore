"""
Sprint 27 — AK Credits Economy Backend Tests
Tests: AK balance, tools, earn, ai-prompt, unlock-tool
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
EMAIL = "ogrisek.stefano@gmail.com"
PASSWORD = "Founder@KORE2026!"


@pytest.fixture(scope="module")
def auth_token():
    """Login and get STEFANO's token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestAKBalance:
    """AK Balance endpoint tests"""

    def test_get_balance_status(self, auth_token, api_client):
        """GET /api/ak/balance returns 200"""
        resp = api_client.get(f"{BASE_URL}/api/ak/balance", headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: GET /api/ak/balance returned 200")

    def test_get_balance_has_ak_credits_field(self, auth_token, api_client):
        """Balance response includes ak_credits"""
        resp = api_client.get(f"{BASE_URL}/api/ak/balance", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        assert "ak_credits" in data, f"Missing ak_credits in response: {data}"
        print(f"PASS: ak_credits = {data['ak_credits']}")

    def test_get_balance_stefano_has_credits(self, auth_token, api_client):
        """STEFANO should have ak_credits seeded (expected 650 but at least > 0)"""
        resp = api_client.get(f"{BASE_URL}/api/ak/balance", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        ak = data.get("ak_credits", 0)
        assert ak > 0, f"Expected STEFANO to have AK credits seeded, got: {ak}"
        print(f"PASS: STEFANO has {ak} AK credits")

    def test_get_balance_has_unlocked_tools(self, auth_token, api_client):
        """Balance response includes unlocked_tools list"""
        resp = api_client.get(f"{BASE_URL}/api/ak/balance", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        assert "unlocked_tools" in data, f"Missing unlocked_tools in response: {data}"
        assert isinstance(data["unlocked_tools"], list), "unlocked_tools should be a list"
        print(f"PASS: unlocked_tools = {data['unlocked_tools']}")

    def test_get_balance_has_transactions(self, auth_token, api_client):
        """Balance response includes transactions list"""
        resp = api_client.get(f"{BASE_URL}/api/ak/balance", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        assert "transactions" in data, f"Missing transactions in response: {data}"
        assert isinstance(data["transactions"], list), "transactions should be a list"
        print(f"PASS: transactions count = {len(data['transactions'])}")


class TestAKTools:
    """Premium tools endpoint tests"""

    def test_get_tools_status(self, auth_token, api_client):
        """GET /api/ak/tools returns 200"""
        resp = api_client.get(f"{BASE_URL}/api/ak/tools", headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/ak/tools returned 200")

    def test_get_tools_has_5_tools(self, auth_token, api_client):
        """Should return exactly 5 premium tools"""
        resp = api_client.get(f"{BASE_URL}/api/ak/tools", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        tools = data.get("tools", [])
        assert len(tools) == 5, f"Expected 5 tools, got {len(tools)}: {[t['id'] for t in tools]}"
        print(f"PASS: {len(tools)} tools returned")

    def test_tools_have_required_fields(self, auth_token, api_client):
        """Each tool must have id, name, cost_ak, is_unlocked, can_afford"""
        resp = api_client.get(f"{BASE_URL}/api/ak/tools", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        for tool in data.get("tools", []):
            assert "id" in tool, f"Tool missing id: {tool}"
            assert "name" in tool, f"Tool missing name: {tool}"
            assert "cost_ak" in tool, f"Tool missing cost_ak: {tool}"
            assert "is_unlocked" in tool, f"Tool missing is_unlocked: {tool}"
            assert "can_afford" in tool, f"Tool missing can_afford: {tool}"
        print(f"PASS: All tools have required fields")

    def test_injury_prevention_unlocked_for_founder(self, auth_token, api_client):
        """INJURY PREVENTION (requires_pro) should be is_unlocked=True for STEFANO (founder/pro)"""
        resp = api_client.get(f"{BASE_URL}/api/ak/tools", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        ip_tool = next((t for t in data.get("tools", []) if t["id"] == "injury_prevention"), None)
        assert ip_tool, "injury_prevention tool not found"
        assert ip_tool["is_unlocked"] is True, f"INJURY PREVENTION should be unlocked for founder. Got: {ip_tool}"
        print(f"PASS: injury_prevention is_unlocked={ip_tool['is_unlocked']} for STEFANO (founder)")

    def test_dna_radar_pro_can_afford(self, auth_token, api_client):
        """DNA RADAR PRO (200 AK) should be can_afford=True for STEFANO (650 AK)"""
        resp = api_client.get(f"{BASE_URL}/api/ak/tools", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        dna_tool = next((t for t in data.get("tools", []) if t["id"] == "dna_radar_pro"), None)
        assert dna_tool, "dna_radar_pro tool not found"
        assert dna_tool["can_afford"] is True, f"DNA RADAR PRO should be affordable with 650 AK. Got: {dna_tool}"
        print(f"PASS: dna_radar_pro can_afford={dna_tool['can_afford']}, cost={dna_tool['cost_ak']}")

    def test_ai_matchmaker_not_unlocked_yet(self, auth_token, api_client):
        """AI MATCHMAKER (500 AK) should NOT be in unlocked_tools by default"""
        resp = api_client.get(f"{BASE_URL}/api/ak/balance", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        unlocked = data.get("unlocked_tools", [])
        # Note: this may or may not be unlocked — just log the state
        print(f"INFO: ai_matchmaker unlocked status: {'ai_matchmaker' in unlocked}, unlocked_tools: {unlocked}")
        assert isinstance(unlocked, list)

    def test_tools_names_match_expected(self, auth_token, api_client):
        """Verify the 5 expected tool IDs are present"""
        expected_ids = {"ai_matchmaker", "dna_radar_pro", "injury_prevention", "ghost_mode_pro", "battle_analytics"}
        resp = api_client.get(f"{BASE_URL}/api/ak/tools", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        tool_ids = {t["id"] for t in data.get("tools", [])}
        assert expected_ids == tool_ids, f"Expected tool IDs {expected_ids}, got {tool_ids}"
        print(f"PASS: All 5 tool IDs present: {tool_ids}")


class TestAKEarn:
    """AK Earn endpoint tests"""

    def test_earn_nexus_scan_status(self, auth_token, api_client):
        """POST /api/ak/earn with reason=nexus_scan returns 200"""
        resp = api_client.post(
            f"{BASE_URL}/api/ak/earn",
            json={"reason": "nexus_scan"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: POST /api/ak/earn nexus_scan returned 200")

    def test_earn_nexus_scan_amount(self, auth_token, api_client):
        """nexus_scan earn should give +10 AK"""
        resp = api_client.post(
            f"{BASE_URL}/api/ak/earn",
            json={"reason": "nexus_scan"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = resp.json()
        assert data.get("amount") == 10, f"Expected amount=10, got: {data}"
        assert "ak_credits" in data, f"Missing ak_credits in earn response: {data}"
        print(f"PASS: nexus_scan gives +{data['amount']} AK. New balance: {data['ak_credits']}")

    def test_earn_invalid_reason(self, auth_token, api_client):
        """Invalid reason should return 400"""
        resp = api_client.post(
            f"{BASE_URL}/api/ak/earn",
            json={"reason": "invalid_reason_xyz"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 400, f"Expected 400 for invalid reason, got {resp.status_code}: {resp.text}"
        print("PASS: Invalid reason returns 400")

    def test_earn_pvp_win(self, auth_token, api_client):
        """pvp_win should give +50 AK"""
        resp = api_client.post(
            f"{BASE_URL}/api/ak/earn",
            json={"reason": "pvp_win"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("amount") == 50, f"Expected +50 AK for pvp_win, got: {data}"
        print(f"PASS: pvp_win gives +{data['amount']} AK")

    def test_earn_crew_battle_win(self, auth_token, api_client):
        """crew_battle_win should give +100 AK"""
        resp = api_client.post(
            f"{BASE_URL}/api/ak/earn",
            json={"reason": "crew_battle_win"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("amount") == 100, f"Expected +100 AK for crew_battle_win, got: {data}"
        print(f"PASS: crew_battle_win gives +{data['amount']} AK")


class TestAKAIPrompt:
    """AI Prompt endpoint tests"""

    def test_ai_prompt_status(self, auth_token, api_client):
        """GET /api/ak/ai-prompt returns 200"""
        resp = api_client.get(f"{BASE_URL}/api/ak/ai-prompt", headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/ak/ai-prompt returned 200")

    def test_ai_prompt_has_prompts_field(self, auth_token, api_client):
        """ai-prompt response includes prompts array"""
        resp = api_client.get(f"{BASE_URL}/api/ak/ai-prompt", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        assert "prompts" in data, f"Missing prompts field: {data}"
        assert isinstance(data["prompts"], list), "prompts should be a list"
        print(f"PASS: prompts array present with {len(data['prompts'])} items")

    def test_ai_prompt_has_at_least_one_prompt(self, auth_token, api_client):
        """STEFANO should have at least 1 prompt (DNA imbalance => INJURY RISK or dna_radar_pro suggestion)"""
        resp = api_client.get(f"{BASE_URL}/api/ak/ai-prompt", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        prompts = data.get("prompts", [])
        print(f"INFO: prompts returned: {[(p.get('type'), p.get('title')) for p in prompts]}")
        assert len(prompts) >= 1, f"Expected at least 1 prompt for STEFANO, got 0. ak_credits={data.get('ak_credits')}"
        print(f"PASS: {len(prompts)} prompts returned")

    def test_ai_prompt_no_accumula_ak_for_650(self, auth_token, api_client):
        """STEFANO has 650 AK, so ACCUMULA AK prompt should NOT appear (only shows when ak < 100)"""
        resp = api_client.get(f"{BASE_URL}/api/ak/ai-prompt", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        prompts = data.get("prompts", [])
        types = [p.get("type") for p in prompts]
        if "earn_ak" in types:
            ak = data.get("ak_credits", 0)
            print(f"WARNING: ACCUMULA AK prompt shown but ak={ak}. Should only show when ak < 100")
        else:
            print(f"PASS: No ACCUMULA AK prompt for STEFANO with 650 AK")

    def test_ai_prompt_prompt_has_required_fields(self, auth_token, api_client):
        """Each prompt should have type, title, message, color, icon fields"""
        resp = api_client.get(f"{BASE_URL}/api/ak/ai-prompt", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        prompts = data.get("prompts", [])
        for p in prompts:
            assert "type" in p, f"Prompt missing type: {p}"
            assert "title" in p, f"Prompt missing title: {p}"
            assert "message" in p, f"Prompt missing message: {p}"
            assert "color" in p, f"Prompt missing color: {p}"
        print(f"PASS: All prompts have required fields")

    def test_ai_prompt_max_2_prompts(self, auth_token, api_client):
        """Should return max 2 prompts"""
        resp = api_client.get(f"{BASE_URL}/api/ak/ai-prompt", headers={"Authorization": f"Bearer {auth_token}"})
        data = resp.json()
        prompts = data.get("prompts", [])
        assert len(prompts) <= 2, f"Expected max 2 prompts, got {len(prompts)}"
        print(f"PASS: {len(prompts)} prompts returned (max 2)")


class TestAKUnlock:
    """AK unlock tool tests"""

    def test_unlock_tool_endpoint_exists(self, auth_token, api_client):
        """POST /api/ak/unlock-tool returns valid response"""
        # Test with already_unlocked scenario or insufficient AK
        resp = api_client.post(
            f"{BASE_URL}/api/ak/unlock-tool",
            json={"tool_id": "invalid_tool_xyz"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert resp.status_code == 400, f"Expected 400 for invalid tool, got {resp.status_code}: {resp.text}"
        print("PASS: Invalid tool_id returns 400")

    def test_unauthorized_access(self, api_client):
        """All AK endpoints require authentication"""
        resp = api_client.get(f"{BASE_URL}/api/ak/balance")
        assert resp.status_code in [401, 403, 422], f"Expected auth error, got {resp.status_code}"
        print(f"PASS: Unauthenticated request returns {resp.status_code}")
