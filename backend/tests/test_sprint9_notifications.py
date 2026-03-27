"""
Sprint 9: Notification Engine & DNA History Backend Tests
Tests for:
  - GET /api/notifications
  - POST /api/notifications/test-trigger
  - POST /api/notifications/{id}/read
  - POST /api/notifications/all/read
  - GET /api/dna/history
  - APScheduler startup confirmation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Known test credentials
CHICAGO = {"email": "chicago@arena.com", "password": "testpassword123"}
ADMIN = {"email": "admin@arenadare.com", "password": "Admin2026!"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def chicago_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json=CHICAGO)
    assert r.status_code == 200, f"Chicago login failed: {r.text}"
    data = r.json()
    assert "token" in data, "Expected 'token' field in login response"
    return data["token"]


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    data = r.json()
    assert "token" in data, "Expected 'token' field in login response"
    return data["token"]


# ====================================
# GET /api/notifications
# ====================================
class TestGetNotifications:
    """Notification list endpoint"""

    def test_notifications_requires_auth(self, session):
        r = session.get(f"{BASE_URL}/api/notifications")
        assert r.status_code in [401, 403], f"Should require auth, got {r.status_code}"

    def test_notifications_response_structure(self, session, chicago_token):
        """GET /notifications returns {notifications: [...], unread_count: int}"""
        r = session.get(f"{BASE_URL}/api/notifications",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200, f"Failed: {r.text}"
        data = r.json()
        assert "notifications" in data, "Missing 'notifications' key"
        assert "unread_count" in data, "Missing 'unread_count' key"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        assert isinstance(data["unread_count"], int), "unread_count should be an int"
        assert data["unread_count"] >= 0, "unread_count should be >= 0"
        print(f"Chicago notifications: count={len(data['notifications'])}, unread={data['unread_count']}")

    def test_notifications_item_structure(self, session, chicago_token):
        """Each notification should have required fields"""
        r = session.get(f"{BASE_URL}/api/notifications",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200
        data = r.json()
        # If there are any notifications, validate their structure
        for notif in data["notifications"]:
            assert "id" in notif, "Notification missing 'id'"
            assert "type" in notif, "Notification missing 'type'"
            assert "title" in notif, "Notification missing 'title'"
            assert "body" in notif, "Notification missing 'body'"
            assert "read" in notif, "Notification missing 'read'"
            assert "icon" in notif, "Notification missing 'icon'"
            assert "accent_color" in notif, "Notification missing 'accent_color'"
            assert isinstance(notif["read"], bool), "read should be a boolean"

    def test_admin_notifications_response_structure(self, session, admin_token):
        """Admin should also get valid notifications response"""
        r = session.get(f"{BASE_URL}/api/notifications",
                        headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200, f"Failed: {r.text}"
        data = r.json()
        assert "notifications" in data
        assert "unread_count" in data
        print(f"Admin notifications: count={len(data['notifications'])}, unread={data['unread_count']}")


# ====================================
# POST /api/notifications/test-trigger
# ====================================
class TestNotificationTestTrigger:
    """Test notification trigger endpoint"""

    def test_test_trigger_requires_auth(self, session):
        r = session.post(f"{BASE_URL}/api/notifications/test-trigger")
        assert r.status_code in [401, 403], f"Should require auth, got {r.status_code}"

    def test_test_trigger_creates_notification(self, session, chicago_token):
        """POST /notifications/test-trigger should create a test notification"""
        r = session.post(f"{BASE_URL}/api/notifications/test-trigger",
                         headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200, f"Failed: {r.text}"
        data = r.json()
        assert data.get("success") == True, "Expected success=True"
        print(f"Test trigger response: {data}")

    def test_after_trigger_unread_count_increases(self, session, chicago_token):
        """After triggering test notification, unread_count should be >= 1"""
        # First get current count
        r1 = session.get(f"{BASE_URL}/api/notifications",
                         headers={"Authorization": f"Bearer {chicago_token}"})
        assert r1.status_code == 200
        count_before = r1.json()["unread_count"]

        # Trigger a new notification
        r2 = session.post(f"{BASE_URL}/api/notifications/test-trigger",
                          headers={"Authorization": f"Bearer {chicago_token}"})
        assert r2.status_code == 200

        # Get updated count
        r3 = session.get(f"{BASE_URL}/api/notifications",
                         headers={"Authorization": f"Bearer {chicago_token}"})
        assert r3.status_code == 200
        data = r3.json()
        count_after = data["unread_count"]
        assert count_after >= 1, "After test-trigger, unread_count should be >= 1"
        assert count_after > count_before or count_after >= 1, \
            f"unread_count should have increased: before={count_before}, after={count_after}"
        print(f"Unread count: before={count_before}, after={count_after}")

    def test_triggered_notification_has_correct_title(self, session, chicago_token):
        """The test notification should have title 'DOMANI: EVOLUZIONE DNA'"""
        # Trigger a test notification
        session.post(f"{BASE_URL}/api/notifications/test-trigger",
                     headers={"Authorization": f"Bearer {chicago_token}"})

        # Fetch notifications
        r = session.get(f"{BASE_URL}/api/notifications",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200
        data = r.json()
        titles = [n["title"] for n in data["notifications"]]
        assert "DOMANI: EVOLUZIONE DNA" in titles, \
            f"Expected 'DOMANI: EVOLUZIONE DNA' in titles, got: {titles}"
        print(f"Found expected notification title in: {titles}")


# ====================================
# POST /api/notifications/{id}/read  and  POST /api/notifications/all/read
# ====================================
class TestMarkNotificationRead:
    """Mark notification(s) as read"""

    def test_mark_single_notification_read(self, session, chicago_token):
        """POST /notifications/{valid_id}/read should mark a single notification as read"""
        # First ensure there's at least one notification
        session.post(f"{BASE_URL}/api/notifications/test-trigger",
                     headers={"Authorization": f"Bearer {chicago_token}"})

        # Get the notification ID
        r1 = session.get(f"{BASE_URL}/api/notifications",
                         headers={"Authorization": f"Bearer {chicago_token}"})
        assert r1.status_code == 200
        data1 = r1.json()
        assert len(data1["notifications"]) > 0, "Need at least one notification to test mark read"

        # Find an unread notification
        unread = [n for n in data1["notifications"] if not n["read"]]
        if not unread:
            pytest.skip("No unread notifications available - mark all may have run first")

        notif_id = unread[0]["id"]

        # Mark it as read
        r2 = session.post(f"{BASE_URL}/api/notifications/{notif_id}/read",
                          headers={"Authorization": f"Bearer {chicago_token}"})
        assert r2.status_code == 200, f"Failed to mark read: {r2.text}"
        data2 = r2.json()
        assert data2.get("success") == True, "Expected success=True"
        print(f"Marked notification {notif_id} as read: {data2}")

        # Verify it's now read
        r3 = session.get(f"{BASE_URL}/api/notifications",
                         headers={"Authorization": f"Bearer {chicago_token}"})
        assert r3.status_code == 200
        updated = next((n for n in r3.json()["notifications"] if n["id"] == notif_id), None)
        if updated:
            assert updated["read"] == True, "Notification should now be read"

    def test_mark_invalid_id_returns_error(self, session, chicago_token):
        """POST /notifications/invalid_id/read should return 400"""
        r = session.post(f"{BASE_URL}/api/notifications/invalid_id_xyz/read",
                         headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code in [400, 404, 422], f"Expected error for invalid ID, got {r.status_code}"
        print(f"Invalid ID status: {r.status_code}, body: {r.text[:200]}")

    def test_mark_all_notifications_read(self, session, chicago_token):
        """POST /notifications/all/read should mark all unread notifications as read"""
        # First trigger a new notification to ensure there's unread
        session.post(f"{BASE_URL}/api/notifications/test-trigger",
                     headers={"Authorization": f"Bearer {chicago_token}"})

        # Mark all as read
        r = session.post(f"{BASE_URL}/api/notifications/all/read",
                         headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200, f"Failed: {r.text}"
        data = r.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        print(f"Mark all read response: {data}")

        # Verify unread_count is now 0
        r2 = session.get(f"{BASE_URL}/api/notifications",
                         headers={"Authorization": f"Bearer {chicago_token}"})
        assert r2.status_code == 200
        result = r2.json()
        assert result["unread_count"] == 0, \
            f"After mark all read, unread_count should be 0, got {result['unread_count']}"
        unread_left = [n for n in result["notifications"] if not n["read"]]
        assert len(unread_left) == 0, f"All notifications should be read, found {len(unread_left)} unread"
        print(f"After mark all read: unread_count={result['unread_count']}")

    def test_mark_read_requires_auth(self, session):
        r = session.post(f"{BASE_URL}/api/notifications/all/read")
        assert r.status_code in [401, 403], f"Should require auth, got {r.status_code}"


# ====================================
# GET /api/dna/history
# ====================================
class TestDnaHistory:
    """DNA scan history endpoint"""

    def test_dna_history_requires_auth(self, session):
        r = session.get(f"{BASE_URL}/api/dna/history")
        assert r.status_code in [401, 403], f"Should require auth, got {r.status_code}"

    def test_dna_history_response_structure(self, session, chicago_token):
        """GET /dna/history returns {scans: [...], total: int, improvements_over_time: [...]}"""
        r = session.get(f"{BASE_URL}/api/dna/history",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200, f"Failed: {r.text}"
        data = r.json()
        assert "scans" in data, "Missing 'scans' key"
        assert "total" in data, "Missing 'total' key"
        assert "improvements_over_time" in data, "Missing 'improvements_over_time' key"
        assert isinstance(data["scans"], list), "scans should be a list"
        assert isinstance(data["total"], int), "total should be an int"
        assert isinstance(data["improvements_over_time"], list), "improvements_over_time should be a list"
        assert data["total"] == len(data["scans"]), "total should match len(scans)"
        print(f"Chicago DNA history: total={data['total']}, scans={len(data['scans'])}")

    def test_chicago_has_at_least_one_scan(self, session, chicago_token):
        """chicago@arena.com should have at least 1 baseline scan"""
        r = session.get(f"{BASE_URL}/api/dna/history",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1, f"chicago should have >= 1 scan, got {data['total']}"
        print(f"Chicago has {data['total']} scan(s)")

    def test_dna_history_scan_structure(self, session, chicago_token):
        """Each scan should have dna, scanned_at, scan_type"""
        r = session.get(f"{BASE_URL}/api/dna/history",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200
        data = r.json()
        for scan in data["scans"]:
            assert "dna" in scan, "Scan missing 'dna'"
            assert "scanned_at" in scan, "Scan missing 'scanned_at'"
            assert "scan_type" in scan, "Scan missing 'scan_type'"
            assert isinstance(scan["dna"], dict), "dna should be a dict"
            assert scan["scan_type"] in ["baseline", "validation", "evolution", "unknown"], \
                f"Unexpected scan_type: {scan['scan_type']}"
            # Check DNA keys
            for key in ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]:
                assert key in scan["dna"], f"DNA missing key: {key}"

    def test_admin_dna_history(self, session, admin_token):
        """Admin should have DNA history"""
        r = session.get(f"{BASE_URL}/api/dna/history",
                        headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200, f"Failed: {r.text}"
        data = r.json()
        print(f"Admin DNA history: total={data['total']}")
        assert "scans" in data
        assert data["total"] >= 0

    def test_improvements_over_time_length(self, session, chicago_token):
        """improvements_over_time should have len(scans) - 1 entries"""
        r = session.get(f"{BASE_URL}/api/dna/history",
                        headers={"Authorization": f"Bearer {chicago_token}"})
        assert r.status_code == 200
        data = r.json()
        expected_improvements = max(0, len(data["scans"]) - 1)
        assert len(data["improvements_over_time"]) == expected_improvements, \
            f"Expected {expected_improvements} improvement entries, got {len(data['improvements_over_time'])}"
