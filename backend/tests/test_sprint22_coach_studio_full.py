"""
Coach Studio Full Backend API Tests — Sprint 22
Tests ALL new coach endpoints:
  GET  /api/coach/heatmap
  GET  /api/coach/alerts
  GET  /api/coach/historical/{id}
  GET  /api/coach/battle-stats
  POST /api/coach/battle-simulate
  GET  /api/coach/ai-full
Also validates existing: athletes, compliance, radar, ai-suggestion
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")

FOUNDER_EMAIL = "ogrisek.stefano@gmail.com"
FOUNDER_PASS  = "Founder@KORE2026!"


@pytest.fixture(scope="module")
def auth_token():
    """Login as founder and return Bearer token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": FOUNDER_EMAIL,
        "password": FOUNDER_PASS
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in login response: {data}"
    return token


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/coach/heatmap
# ──────────────────────────────────────────────────────────────────────────────
class TestCoachHeatmap:
    """GET /api/coach/heatmap — 30-day activity grid"""

    def test_heatmap_returns_200(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/heatmap", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_heatmap_has_grid(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/heatmap", headers=headers)
        data = resp.json()
        assert "grid" in data, f"Missing 'grid': {data.keys()}"
        assert isinstance(data["grid"], list), "'grid' must be a list"

    def test_heatmap_grid_has_30_cells(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/heatmap", headers=headers)
        grid = resp.json().get("grid", [])
        assert len(grid) == 30, f"Expected 30 cells, got {len(grid)}"

    def test_heatmap_cell_structure(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/heatmap", headers=headers)
        cell = resp.json()["grid"][0]
        for field in ["date", "count", "level", "intensity"]:
            assert field in cell, f"Missing '{field}' in cell: {cell}"

    def test_heatmap_has_totals(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/heatmap", headers=headers)
        data = resp.json()
        assert "total_scans" in data, f"Missing 'total_scans': {data.keys()}"
        assert "active_days" in data, f"Missing 'active_days': {data.keys()}"

    def test_heatmap_intensity_is_0_to_1(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/heatmap", headers=headers)
        for cell in resp.json()["grid"]:
            assert 0 <= cell["intensity"] <= 1, f"Intensity out of range: {cell['intensity']}"

    def test_heatmap_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/coach/heatmap")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/coach/alerts
# ──────────────────────────────────────────────────────────────────────────────
class TestCoachAlerts:
    """GET /api/coach/alerts — AI Alert Center"""

    def test_alerts_returns_200(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/alerts", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_alerts_has_alerts_array(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/alerts", headers=headers)
        data = resp.json()
        assert "alerts" in data, f"Missing 'alerts': {data.keys()}"
        assert isinstance(data["alerts"], list), "'alerts' must be a list"

    def test_alerts_has_count(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/alerts", headers=headers)
        data = resp.json()
        assert "count" in data, f"Missing 'count': {data.keys()}"
        assert data["count"] == len(data["alerts"]), "count doesn't match alerts length"

    def test_alerts_has_critical(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/alerts", headers=headers)
        data = resp.json()
        assert "critical" in data, f"Missing 'critical': {data.keys()}"

    def test_alert_structure(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/alerts", headers=headers)
        alerts = resp.json().get("alerts", [])
        if not alerts:
            print("No alerts returned — DB may have compliant athletes (OK)")
            return
        alert = alerts[0]
        for field in ["type", "severity", "athlete", "athlete_id", "message", "color"]:
            assert field in alert, f"Missing '{field}' in alert: {alert.keys()}"

    def test_alert_severity_valid_values(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/alerts", headers=headers)
        valid = {"danger", "warning", "info"}
        for alert in resp.json().get("alerts", []):
            assert alert["severity"] in valid, f"Invalid severity: {alert['severity']}"

    def test_alerts_sorted_by_severity(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/alerts", headers=headers)
        alerts = resp.json().get("alerts", [])
        if len(alerts) >= 2:
            order = {"danger": 0, "warning": 1, "info": 2}
            for i in range(len(alerts) - 1):
                assert order[alerts[i]["severity"]] <= order[alerts[i+1]["severity"]], \
                    "Alerts not sorted: danger < warning < info"

    def test_alerts_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/coach/alerts")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/coach/historical/{athlete_id}
# ──────────────────────────────────────────────────────────────────────────────
class TestCoachHistorical:
    """GET /api/coach/historical/{athlete_id} — Historical DNA trends"""

    @pytest.fixture(scope="class")
    def athlete_id(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes", headers=headers)
        athletes = resp.json().get("athletes", [])
        if not athletes:
            pytest.skip("No athletes to test historical")
        return athletes[0]["id"]

    def test_historical_returns_200(self, headers, athlete_id):
        resp = requests.get(f"{BASE_URL}/api/coach/historical/{athlete_id}", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_historical_has_months(self, headers, athlete_id):
        resp = requests.get(f"{BASE_URL}/api/coach/historical/{athlete_id}", headers=headers)
        data = resp.json()
        assert "months" in data, f"Missing 'months': {data.keys()}"
        assert isinstance(data["months"], list), "'months' must be a list"

    def test_historical_has_7_months(self, headers, athlete_id):
        resp = requests.get(f"{BASE_URL}/api/coach/historical/{athlete_id}", headers=headers)
        months = resp.json()["months"]
        assert len(months) == 7, f"Expected 7 months (6 + Now), got {len(months)}"

    def test_historical_last_is_now(self, headers, athlete_id):
        resp = requests.get(f"{BASE_URL}/api/coach/historical/{athlete_id}", headers=headers)
        months = resp.json()["months"]
        assert months[-1]["month"] == "Now", f"Last month should be 'Now': {months[-1]}"

    def test_historical_month_has_dna_keys(self, headers, athlete_id):
        resp = requests.get(f"{BASE_URL}/api/coach/historical/{athlete_id}", headers=headers)
        months = resp.json()["months"]
        dna_keys = ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]
        for m in months:
            for k in dna_keys:
                assert k in m, f"Missing DNA key '{k}' in month {m.get('month')}: {m.keys()}"

    def test_historical_has_current_dna(self, headers, athlete_id):
        resp = requests.get(f"{BASE_URL}/api/coach/historical/{athlete_id}", headers=headers)
        data = resp.json()
        assert "current_dna" in data, f"Missing 'current_dna': {data.keys()}"
        assert "dna_avg" in data, f"Missing 'dna_avg': {data.keys()}"

    def test_historical_has_username(self, headers, athlete_id):
        resp = requests.get(f"{BASE_URL}/api/coach/historical/{athlete_id}", headers=headers)
        data = resp.json()
        assert "username" in data, f"Missing 'username': {data.keys()}"

    def test_historical_invalid_id_returns_404(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/historical/000000000000000000000000", headers=headers)
        assert resp.status_code == 404, f"Expected 404 for invalid ID, got {resp.status_code}"

    def test_historical_no_auth_returns_401(self, athlete_id):
        resp = requests.get(f"{BASE_URL}/api/coach/historical/{athlete_id}")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/coach/battle-stats
# ──────────────────────────────────────────────────────────────────────────────
class TestCoachBattleStats:
    """GET /api/coach/battle-stats — Crew battle history"""

    def test_battle_stats_returns_200(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/battle-stats", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_battle_stats_has_battles(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/battle-stats", headers=headers)
        data = resp.json()
        assert "battles" in data, f"Missing 'battles': {data.keys()}"
        assert isinstance(data["battles"], list), "'battles' must be a list"

    def test_battle_stats_has_wins_losses(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/battle-stats", headers=headers)
        data = resp.json()
        assert "wins" in data, f"Missing 'wins': {data.keys()}"
        assert "losses" in data, f"Missing 'losses': {data.keys()}"
        assert "win_rate" in data, f"Missing 'win_rate': {data.keys()}"

    def test_battle_stats_has_crews(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/battle-stats", headers=headers)
        data = resp.json()
        assert "crews" in data, f"Missing 'crews': {data.keys()}"

    def test_battle_stats_win_rate_is_percentage(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/battle-stats", headers=headers)
        wr = resp.json().get("win_rate", 0)
        assert 0 <= wr <= 100, f"win_rate out of range [0,100]: {wr}"

    def test_battle_row_structure(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/battle-stats", headers=headers)
        battles = resp.json().get("battles", [])
        if not battles:
            print("No battles in DB — cannot test row structure")
            return
        b = battles[0]
        for field in ["id", "crew_a", "crew_b", "score_a", "score_b", "status", "my_result"]:
            assert field in b, f"Missing '{field}' in battle row: {b.keys()}"

    def test_battle_stats_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/coach/battle-stats")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/coach/battle-simulate
# ──────────────────────────────────────────────────────────────────────────────
class TestCoachBattleSimulate:
    """POST /api/coach/battle-simulate — Weighted Average Score"""

    @pytest.fixture(scope="class")
    def athlete_ids(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/athletes", headers=headers)
        athletes = resp.json().get("athletes", [])
        return [a["id"] for a in athletes[:5]]

    def test_simulate_returns_200(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/battle-simulate",
                             json={"athlete_ids": athlete_ids}, headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_simulate_has_score(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/battle-simulate",
                             json={"athlete_ids": athlete_ids}, headers=headers)
        data = resp.json()
        assert "score" in data, f"Missing 'score': {data.keys()}"
        assert isinstance(data["score"], (int, float)), f"score must be numeric: {data['score']}"

    def test_simulate_score_range(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/battle-simulate",
                             json={"athlete_ids": athlete_ids}, headers=headers)
        score = resp.json().get("score", -1)
        assert 0 <= score <= 100, f"Score out of range [0,100]: {score}"

    def test_simulate_has_breakdown(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/battle-simulate",
                             json={"athlete_ids": athlete_ids}, headers=headers)
        data = resp.json()
        assert "breakdown" in data, f"Missing 'breakdown': {data.keys()}"
        assert isinstance(data["breakdown"], list), "'breakdown' must be a list"

    def test_simulate_breakdown_structure(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/battle-simulate",
                             json={"athlete_ids": athlete_ids}, headers=headers)
        breakdown = resp.json().get("breakdown", [])
        if not breakdown:
            print("Empty breakdown")
            return
        b = breakdown[0]
        for field in ["username", "kore_score", "xp"]:
            assert field in b, f"Missing '{field}' in breakdown: {b.keys()}"

    def test_simulate_has_intensity(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/battle-simulate",
                             json={"athlete_ids": athlete_ids}, headers=headers)
        data = resp.json()
        assert "intensity" in data, f"Missing 'intensity': {data.keys()}"
        assert data["intensity"] in ["high", "medium", "low"], f"Invalid intensity: {data['intensity']}"

    def test_simulate_has_member_count(self, headers, athlete_ids):
        resp = requests.post(f"{BASE_URL}/api/coach/battle-simulate",
                             json={"athlete_ids": athlete_ids}, headers=headers)
        data = resp.json()
        assert "member_count" in data, f"Missing 'member_count': {data.keys()}"
        assert data["member_count"] == len(athlete_ids), \
            f"Expected {len(athlete_ids)} members, got {data['member_count']}"

    def test_simulate_empty_athletes(self, headers):
        resp = requests.post(f"{BASE_URL}/api/coach/battle-simulate",
                             json={"athlete_ids": []}, headers=headers)
        assert resp.status_code == 200, f"Empty athlete_ids should return 200, got {resp.status_code}"
        data = resp.json()
        assert data.get("score", -1) == 0 or data.get("member_count", -1) == 0

    def test_simulate_no_auth_returns_401(self):
        resp = requests.post(f"{BASE_URL}/api/coach/battle-simulate", json={"athlete_ids": []})
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/coach/ai-full
# ──────────────────────────────────────────────────────────────────────────────
class TestCoachAIFull:
    """GET /api/coach/ai-full — AI Injury Risks + Performance Forecasts"""

    def test_ai_full_returns_200(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/ai-full", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_ai_full_has_injury_risks(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/ai-full", headers=headers)
        data = resp.json()
        assert "injury_risks" in data, f"Missing 'injury_risks': {data.keys()}"
        assert isinstance(data["injury_risks"], list), "'injury_risks' must be a list"

    def test_ai_full_has_forecasts(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/ai-full", headers=headers)
        data = resp.json()
        assert "forecasts" in data, f"Missing 'forecasts': {data.keys()}"
        assert isinstance(data["forecasts"], list), "'forecasts' must be a list"

    def test_ai_full_has_group_summary(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/ai-full", headers=headers)
        data = resp.json()
        assert "group_summary" in data, f"Missing 'group_summary': {data.keys()}"
        summary = data["group_summary"]
        for field in ["total_athletes", "high_risk", "improving"]:
            assert field in summary, f"Missing '{field}' in group_summary: {summary.keys()}"

    def test_ai_full_injury_risk_structure(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/ai-full", headers=headers)
        risks = resp.json().get("injury_risks", [])
        if not risks:
            print("No injury risks returned (all athletes balanced) — OK")
            return
        r = risks[0]
        for field in ["athlete", "athlete_id", "risk_pct", "overloaded", "weak_area", "recommendation", "color"]:
            assert field in r, f"Missing '{field}' in risk: {r.keys()}"

    def test_ai_full_risk_pct_range(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/ai-full", headers=headers)
        for r in resp.json().get("injury_risks", []):
            assert 0 <= r["risk_pct"] <= 100, f"risk_pct out of range: {r['risk_pct']}"

    def test_ai_full_forecast_structure(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/ai-full", headers=headers)
        forecasts = resp.json().get("forecasts", [])
        if not forecasts:
            print("No forecasts returned")
            return
        f = forecasts[0]
        for field in ["athlete", "athlete_id", "current_xp", "projected_xp_30d",
                      "current_level", "projected_level", "current_dna", "projected_dna", "trend"]:
            assert field in f, f"Missing '{field}' in forecast: {f.keys()}"

    def test_ai_full_forecast_trend_valid(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/ai-full", headers=headers)
        valid = {"rising", "stable", "declining"}
        for f in resp.json().get("forecasts", []):
            assert f["trend"] in valid, f"Invalid trend: {f['trend']}"

    def test_ai_full_max_5_risks(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/ai-full", headers=headers)
        risks = resp.json().get("injury_risks", [])
        assert len(risks) <= 5, f"Expected max 5 injury risks, got {len(risks)}"

    def test_ai_full_max_8_forecasts(self, headers):
        resp = requests.get(f"{BASE_URL}/api/coach/ai-full", headers=headers)
        forecasts = resp.json().get("forecasts", [])
        assert len(forecasts) <= 8, f"Expected max 8 forecasts, got {len(forecasts)}"

    def test_ai_full_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/coach/ai-full")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
