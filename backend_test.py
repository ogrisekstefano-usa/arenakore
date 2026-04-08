#!/usr/bin/env python3
"""
ARENAKORE — SUPER_ADMIN API ENDPOINTS REGRESSION TEST
═══════════════════════════════════════════════════════════════════
Test ALL SUPER_ADMIN API endpoints that were recently refactored 
from monolithic server.py to modular routes/admin.py.

This is a CRITICAL regression test to ensure the refactoring 
didn't break anything.
"""

import requests
import json
import time
import random
import string
from datetime import datetime

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"

# Test Credentials
SUPER_ADMIN_EMAIL = "ogrisek.stefano@gmail.com"
SUPER_ADMIN_PASSWORD = "Founder@KORE2026!"

ATHLETE_EMAIL = "d.rose@chicago.kore"
ATHLETE_PASSWORD = "Seed@Chicago1"

class AdminAPITester:
    def __init__(self):
        self.admin_token = None
        self.athlete_token = None
        self.test_results = []
        self.created_lead_id = None
        self.created_cms_id = None
        self.campaign_id = None
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} {test_name}: {details}")
        print(f"{status} {test_name}: {details}")
        
    def login_admin(self):
        """Login as SUPER_ADMIN"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": SUPER_ADMIN_EMAIL,
                "password": SUPER_ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("token")
                self.log_result("Admin Login", True, f"Token received, is_admin={data.get('user', {}).get('is_admin', False)}")
                return True
            else:
                self.log_result("Admin Login", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception: {str(e)}")
            return False
            
    def login_athlete(self):
        """Login as standard athlete"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": ATHLETE_EMAIL,
                "password": ATHLETE_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.athlete_token = data.get("token")
                user_role = data.get("user", {}).get("role", "ATHLETE")
                self.log_result("Athlete Login", True, f"Token received, role={user_role}")
                return True
            else:
                self.log_result("Athlete Login", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Athlete Login", False, f"Exception: {str(e)}")
            return False
            
    def get_headers(self, token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
    def test_admin_dashboard(self):
        """Test GET /api/admin/dashboard"""
        try:
            response = requests.get(
                f"{BASE_URL}/admin/dashboard",
                headers=self.get_headers(self.admin_token)
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_users", "total_gyms", "total_scans", "pending_leads", "role_distribution", "top_cities"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Admin Dashboard", True, f"All KPIs returned: users={data['total_users']}, gyms={data['total_gyms']}, scans={data['total_scans']}")
                else:
                    self.log_result("Admin Dashboard", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Admin Dashboard", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Admin Dashboard", False, f"Exception: {str(e)}")
            
    def test_create_gym_lead_public(self):
        """Test POST /api/leads/gym (PUBLIC endpoint)"""
        try:
            # Generate unique test data
            timestamp = str(int(time.time()))
            test_data = {
                "gym_name": f"Test Gym {timestamp}",
                "city": "Milano",
                "address": "Via Test 123",
                "email": f"test.gym.{timestamp}@example.com",
                "phone": "+39 123 456 7890",
                "referent_name": "Mario Rossi",
                "structure_type": "Palestra",
                "message": "Test gym lead creation"
            }
            
            # No auth headers for public endpoint
            response = requests.post(f"{BASE_URL}/leads/gym", json=test_data)
            
            if response.status_code == 200:
                data = response.json()
                self.created_lead_id = data.get("id")
                self.log_result("Create Gym Lead (Public)", True, f"Lead created with ID: {self.created_lead_id}")
            else:
                self.log_result("Create Gym Lead (Public)", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Create Gym Lead (Public)", False, f"Exception: {str(e)}")
            
    def test_get_gym_leads(self):
        """Test GET /api/admin/leads"""
        try:
            # Test all leads
            response = requests.get(
                f"{BASE_URL}/admin/leads?status=all",
                headers=self.get_headers(self.admin_token)
            )
            
            if response.status_code == 200:
                data = response.json()
                leads = data.get("leads", [])
                counts = data.get("counts", {})
                self.log_result("Get All Leads", True, f"Retrieved {len(leads)} leads, counts: {counts}")
                
                # Test pending leads filter
                response_pending = requests.get(
                    f"{BASE_URL}/admin/leads?status=pending",
                    headers=self.get_headers(self.admin_token)
                )
                
                if response_pending.status_code == 200:
                    pending_data = response_pending.json()
                    pending_leads = pending_data.get("leads", [])
                    self.log_result("Get Pending Leads", True, f"Retrieved {len(pending_leads)} pending leads")
                else:
                    self.log_result("Get Pending Leads", False, f"Status {response_pending.status_code}")
            else:
                self.log_result("Get All Leads", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Get Gym Leads", False, f"Exception: {str(e)}")
            
    def test_activate_gym_lead(self):
        """Test PATCH /api/admin/leads/{lead_id}/activate"""
        if not self.created_lead_id:
            self.log_result("Activate Gym Lead", False, "No lead ID available")
            return
            
        try:
            response = requests.patch(
                f"{BASE_URL}/admin/leads/{self.created_lead_id}/activate",
                headers=self.get_headers(self.admin_token),
                json={"subscription_tier": "pro", "notes": "Test activation"}
            )
            
            if response.status_code == 200:
                data = response.json()
                gym_code = data.get("gym_code")
                gym_id = data.get("gym_id")
                self.log_result("Activate Gym Lead", True, f"Lead activated, gym_code={gym_code}, gym_id={gym_id}")
            else:
                self.log_result("Activate Gym Lead", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Activate Gym Lead", False, f"Exception: {str(e)}")
            
    def test_reject_gym_lead(self):
        """Test PATCH /api/admin/leads/{lead_id}/reject"""
        # Create another lead to reject
        try:
            timestamp = str(int(time.time()) + 1)
            test_data = {
                "gym_name": f"Reject Test Gym {timestamp}",
                "city": "Roma",
                "address": "Via Reject 456",
                "email": f"reject.test.{timestamp}@example.com",
                "phone": "+39 987 654 3210",
                "referent_name": "Luigi Verdi",
                "structure_type": "Club Sportivo",
                "message": "Test gym lead for rejection"
            }
            
            create_response = requests.post(f"{BASE_URL}/leads/gym", json=test_data)
            
            if create_response.status_code == 200:
                reject_lead_id = create_response.json().get("id")
                
                # Now reject it
                reject_response = requests.patch(
                    f"{BASE_URL}/admin/leads/{reject_lead_id}/reject",
                    headers=self.get_headers(self.admin_token),
                    json={"notes": "Test rejection"}
                )
                
                if reject_response.status_code == 200:
                    self.log_result("Reject Gym Lead", True, "Lead successfully rejected")
                else:
                    self.log_result("Reject Gym Lead", False, f"Reject status {reject_response.status_code}")
            else:
                self.log_result("Reject Gym Lead", False, f"Failed to create lead for rejection: {create_response.status_code}")
        except Exception as e:
            self.log_result("Reject Gym Lead", False, f"Exception: {str(e)}")
            
    def test_cms_content_management(self):
        """Test CMS Content Management endpoints"""
        try:
            # 1. GET /api/admin/cms - List all CMS content
            list_response = requests.get(
                f"{BASE_URL}/admin/cms",
                headers=self.get_headers(self.admin_token)
            )
            
            if list_response.status_code == 200:
                list_data = list_response.json()
                items = list_data.get("items", [])
                self.log_result("List CMS Content", True, f"Retrieved {len(items)} CMS items")
            else:
                self.log_result("List CMS Content", False, f"Status {list_response.status_code}")
                return
                
            # 2. POST /api/admin/cms - Create new CMS content
            timestamp = str(int(time.time()))
            cms_data = {
                "key": f"test_announcement_{timestamp}",
                "title": f"Test Announcement {timestamp}",
                "body": "This is a test announcement for API testing",
                "category": "announcement",
                "target_audience": "all",
                "priority": 1
            }
            
            create_response = requests.post(
                f"{BASE_URL}/admin/cms",
                headers=self.get_headers(self.admin_token),
                json=cms_data
            )
            
            if create_response.status_code == 200:
                create_data = create_response.json()
                self.created_cms_id = create_data.get("_id")
                self.log_result("Create CMS Content", True, f"CMS item created with ID: {self.created_cms_id}")
            else:
                self.log_result("Create CMS Content", False, f"Status {create_response.status_code}: {create_response.text}")
                return
                
            # 3. PATCH /api/admin/cms/{item_id} - Update CMS content
            update_response = requests.patch(
                f"{BASE_URL}/admin/cms/{self.created_cms_id}",
                headers=self.get_headers(self.admin_token),
                json={"title": "Updated Test Announcement", "is_active": False}
            )
            
            if update_response.status_code == 200:
                self.log_result("Update CMS Content", True, "CMS item updated successfully")
            else:
                self.log_result("Update CMS Content", False, f"Status {update_response.status_code}")
                
            # 4. GET /api/cms/public - Public CMS content (no auth)
            public_response = requests.get(f"{BASE_URL}/cms/public")
            
            if public_response.status_code == 200:
                public_data = public_response.json()
                public_items = public_data.get("items", [])
                self.log_result("Get Public CMS", True, f"Retrieved {len(public_items)} public CMS items")
            else:
                self.log_result("Get Public CMS", False, f"Status {public_response.status_code}")
                
        except Exception as e:
            self.log_result("CMS Content Management", False, f"Exception: {str(e)}")
            
    def test_delete_cms_content(self):
        """Test DELETE /api/admin/cms/{item_id}"""
        if not self.created_cms_id:
            self.log_result("Delete CMS Content", False, "No CMS ID available")
            return
            
        try:
            response = requests.delete(
                f"{BASE_URL}/admin/cms/{self.created_cms_id}",
                headers=self.get_headers(self.admin_token)
            )
            
            if response.status_code == 200:
                self.log_result("Delete CMS Content", True, "CMS item deleted successfully")
            else:
                self.log_result("Delete CMS Content", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Delete CMS Content", False, f"Exception: {str(e)}")
            
    def test_push_notification_engine(self):
        """Test Push Notification Engine"""
        try:
            # 1. POST /api/admin/push - Send push campaign
            campaign_data = {
                "title": "Test Push Campaign",
                "body": "This is a test push notification from API testing",
                "filter_city": "MILANO",
                "filter_min_level": 1,
                "filter_max_level": 10,
                "filter_role": "all",
                "data_payload": {"test": True, "campaign_type": "api_test"}
            }
            
            send_response = requests.post(
                f"{BASE_URL}/admin/push",
                headers=self.get_headers(self.admin_token),
                json=campaign_data
            )
            
            if send_response.status_code == 200:
                send_data = send_response.json()
                self.campaign_id = send_data.get("campaign_id")
                target_count = send_data.get("target_count", 0)
                sent_count = send_data.get("sent_count", 0)
                self.log_result("Send Push Campaign", True, f"Campaign sent: target={target_count}, sent={sent_count}, ID={self.campaign_id}")
            else:
                self.log_result("Send Push Campaign", False, f"Status {send_response.status_code}: {send_response.text}")
                
            # 2. GET /api/admin/push/history - Get campaign history
            history_response = requests.get(
                f"{BASE_URL}/admin/push/history",
                headers=self.get_headers(self.admin_token)
            )
            
            if history_response.status_code == 200:
                history_data = history_response.json()
                campaigns = history_data.get("campaigns", [])
                self.log_result("Get Push History", True, f"Retrieved {len(campaigns)} campaigns in history")
            else:
                self.log_result("Get Push History", False, f"Status {history_response.status_code}")
                
        except Exception as e:
            self.log_result("Push Notification Engine", False, f"Exception: {str(e)}")
            
    def test_push_token_registration(self):
        """Test POST /api/push/register-token"""
        try:
            # Generate a mock Expo push token
            mock_token = f"ExponentPushToken[{''.join(random.choices(string.ascii_letters + string.digits, k=22))}]"
            
            response = requests.post(
                f"{BASE_URL}/push/register-token",
                headers=self.get_headers(self.admin_token),
                json={"token": mock_token}
            )
            
            if response.status_code == 200:
                self.log_result("Register Push Token", True, f"Token registered: {mock_token[:30]}...")
            else:
                self.log_result("Register Push Token", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Register Push Token", False, f"Exception: {str(e)}")
            
    def test_rbac_enforcement(self):
        """Test RBAC - Athlete should get 403 on admin endpoints"""
        if not self.athlete_token:
            self.log_result("RBAC Enforcement", False, "No athlete token available")
            return
            
        admin_endpoints = [
            "/admin/dashboard",
            "/admin/leads",
            "/admin/cms",
            "/admin/push/history"
        ]
        
        rbac_results = []
        
        for endpoint in admin_endpoints:
            try:
                response = requests.get(
                    f"{BASE_URL}{endpoint}",
                    headers=self.get_headers(self.athlete_token)
                )
                
                if response.status_code == 403:
                    rbac_results.append(f"✅ {endpoint}: 403 (correct)")
                else:
                    rbac_results.append(f"❌ {endpoint}: {response.status_code} (should be 403)")
                    
            except Exception as e:
                rbac_results.append(f"❌ {endpoint}: Exception {str(e)}")
                
        all_correct = all("✅" in result for result in rbac_results)
        self.log_result("RBAC Enforcement", all_correct, f"Tested {len(admin_endpoints)} endpoints: {'; '.join(rbac_results)}")
        
    def test_existing_endpoints(self):
        """Test that existing endpoints still work"""
        existing_endpoints = [
            ("/auth/me", "GET"),
            ("/leaderboard?type=xp", "GET"),
            ("/kore/stats", "GET")
        ]
        
        existing_results = []
        
        for endpoint, method in existing_endpoints:
            try:
                if method == "GET":
                    response = requests.get(
                        f"{BASE_URL}{endpoint}",
                        headers=self.get_headers(self.admin_token)
                    )
                else:
                    continue  # Only testing GET for now
                    
                if response.status_code == 200:
                    existing_results.append(f"✅ {endpoint}: 200")
                else:
                    existing_results.append(f"❌ {endpoint}: {response.status_code}")
                    
            except Exception as e:
                existing_results.append(f"❌ {endpoint}: Exception")
                
        all_working = all("✅" in result for result in existing_results)
        self.log_result("Existing Endpoints", all_working, f"Cross-check: {'; '.join(existing_results)}")
        
    def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 STARTING SUPER_ADMIN API REGRESSION TEST")
        print("=" * 60)
        
        # Authentication
        if not self.login_admin():
            print("❌ CRITICAL: Admin login failed, aborting tests")
            return
            
        if not self.login_athlete():
            print("⚠️  WARNING: Athlete login failed, RBAC tests will be skipped")
            
        # Core Admin Tests
        print("\n📊 Testing Admin Dashboard...")
        self.test_admin_dashboard()
        
        print("\n🏢 Testing Inbound CRM (Leads)...")
        self.test_create_gym_lead_public()
        self.test_get_gym_leads()
        self.test_activate_gym_lead()
        self.test_reject_gym_lead()
        
        print("\n📝 Testing CMS Content Management...")
        self.test_cms_content_management()
        self.test_delete_cms_content()
        
        print("\n📱 Testing Push Notification Engine...")
        self.test_push_notification_engine()
        self.test_push_token_registration()
        
        print("\n🔒 Testing RBAC Enforcement...")
        if self.athlete_token:
            self.test_rbac_enforcement()
        else:
            self.log_result("RBAC Enforcement", False, "Skipped - no athlete token")
            
        print("\n🔄 Testing Existing Endpoints...")
        self.test_existing_endpoints()
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result)
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result)
        
        for result in self.test_results:
            print(result)
            
        print(f"\n📈 RESULTS: {passed} PASSED, {failed} FAILED")
        
        if failed == 0:
            print("🎉 ALL TESTS PASSED! Admin API refactoring successful.")
        else:
            print(f"⚠️  {failed} TESTS FAILED! Review required.")
            
        return failed == 0

if __name__ == "__main__":
    tester = AdminAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)