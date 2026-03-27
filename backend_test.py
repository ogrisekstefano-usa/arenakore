#!/usr/bin/env python3
"""
ArenaDare PULSE SPRINT Backend API Testing
Tests all new backend endpoints for the PULSE SPRINT feature bundle
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://arena-pulse-sprint.preview.emergentagent.com/api"
TEST_USER = {
    "username": "test_agent_user",
    "email": "testagent@arena.com", 
    "password": "testpassword123"
}

class BackendTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.battle_id = None
        self.results = []
        
    def log_result(self, endpoint, method, status, success, details=""):
        """Log test result"""
        result = {
            "endpoint": endpoint,
            "method": method,
            "status": status,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {method} {endpoint} - {status} - {details}")
        
    def make_request(self, method, endpoint, data=None, auth=True):
        """Make HTTP request with proper headers"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed for {method} {endpoint}: {str(e)}")
            return None
    
    def test_auth_register(self):
        """Test user registration"""
        print("\n🔐 Testing Authentication - Register")
        
        response = self.make_request("POST", "/auth/register", TEST_USER, auth=False)
        if not response:
            self.log_result("/auth/register", "POST", "FAILED", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                self.token = data["token"]
                self.user_id = data["user"]["id"]
                self.log_result("/auth/register", "POST", response.status_code, True, f"User registered: {data['user']['username']}")
                return True
            else:
                self.log_result("/auth/register", "POST", response.status_code, False, "Missing token or user in response")
                return False
        elif response.status_code == 400:
            # User might already exist, try login
            self.log_result("/auth/register", "POST", response.status_code, True, "User already exists (expected)")
            return self.test_auth_login()
        else:
            self.log_result("/auth/register", "POST", response.status_code, False, response.text)
            return False
    
    def test_auth_login(self):
        """Test user login"""
        print("\n🔐 Testing Authentication - Login")
        
        login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
        response = self.make_request("POST", "/auth/login", login_data, auth=False)
        
        if not response:
            self.log_result("/auth/login", "POST", "FAILED", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                self.token = data["token"]
                self.user_id = data["user"]["id"]
                self.log_result("/auth/login", "POST", response.status_code, True, f"User logged in: {data['user']['username']}")
                return True
            else:
                self.log_result("/auth/login", "POST", response.status_code, False, "Missing token or user in response")
                return False
        else:
            self.log_result("/auth/login", "POST", response.status_code, False, response.text)
            return False
    
    def test_onboarding(self):
        """Test onboarding completion"""
        print("\n👤 Testing Onboarding")
        
        onboarding_data = {"role": "atleta", "sport": "Basket"}
        response = self.make_request("PUT", "/auth/onboarding", onboarding_data)
        
        if not response:
            self.log_result("/auth/onboarding", "PUT", "FAILED", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get("onboarding_completed") and data.get("dna"):
                self.log_result("/auth/onboarding", "PUT", response.status_code, True, f"Onboarding completed, XP: {data.get('xp', 0)}")
                return True
            else:
                self.log_result("/auth/onboarding", "PUT", response.status_code, False, "Onboarding not properly completed")
                return False
        else:
            self.log_result("/auth/onboarding", "PUT", response.status_code, False, response.text)
            return False
    
    def test_challenge_complete(self):
        """Test challenge completion (NEW ENDPOINT)"""
        print("\n🎯 Testing Challenge Complete API (NEW)")
        
        challenge_data = {
            "performance_score": 85.5,
            "duration_seconds": 30
        }
        response = self.make_request("POST", "/challenges/complete", challenge_data)
        
        if not response:
            self.log_result("/challenges/complete", "POST", "FAILED", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            required_fields = ["status", "xp_earned", "performance_score", "duration_seconds", "new_xp", "level_up", "records_broken", "new_dna", "user"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                self.log_result("/challenges/complete", "POST", response.status_code, True, 
                              f"XP earned: {data['xp_earned']}, Level up: {data['level_up']}, Records: {len(data['records_broken'])}")
                return True
            else:
                self.log_result("/challenges/complete", "POST", response.status_code, False, f"Missing fields: {missing_fields}")
                return False
        else:
            self.log_result("/challenges/complete", "POST", response.status_code, False, response.text)
            return False
    
    def test_challenge_history(self):
        """Test challenge history (NEW ENDPOINT)"""
        print("\n📊 Testing Challenge History API (NEW)")
        
        response = self.make_request("GET", "/challenges/history")
        
        if not response:
            self.log_result("/challenges/history", "GET", "FAILED", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("/challenges/history", "GET", response.status_code, True, f"Retrieved {len(data)} challenge records")
                return True
            else:
                self.log_result("/challenges/history", "GET", response.status_code, False, "Response is not a list")
                return False
        else:
            self.log_result("/challenges/history", "GET", response.status_code, False, response.text)
            return False
    
    def test_push_token(self):
        """Test push token save (NEW ENDPOINT)"""
        print("\n📱 Testing Push Token Save API (NEW)")
        
        token_data = {"push_token": "test-token-12345"}
        response = self.make_request("POST", "/users/push-token", token_data)
        
        if not response:
            self.log_result("/users/push-token", "POST", "FAILED", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok":
                self.log_result("/users/push-token", "POST", response.status_code, True, "Push token saved successfully")
                return True
            else:
                self.log_result("/users/push-token", "POST", response.status_code, False, f"Unexpected response: {data}")
                return False
        else:
            self.log_result("/users/push-token", "POST", response.status_code, False, response.text)
            return False
    
    def test_get_battles(self):
        """Test get battles list"""
        print("\n⚔️ Testing Get Battles API")
        
        response = self.make_request("GET", "/battles")
        
        if not response:
            self.log_result("/battles", "GET", "FAILED", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Store first battle ID for participation tests
                self.battle_id = data[0]["id"]
                self.log_result("/battles", "GET", response.status_code, True, f"Retrieved {len(data)} battles")
                return True
            else:
                self.log_result("/battles", "GET", response.status_code, False, "No battles found or invalid response")
                return False
        else:
            self.log_result("/battles", "GET", response.status_code, False, response.text)
            return False
    
    def test_battle_participate(self):
        """Test battle participation (NEW ENDPOINT)"""
        print("\n⚔️ Testing Battle Participate API (NEW)")
        
        if not self.battle_id:
            self.log_result("/battles/{id}/participate", "POST", "SKIPPED", False, "No battle ID available")
            return False
        
        response = self.make_request("POST", f"/battles/{self.battle_id}/participate")
        
        if not response:
            self.log_result("/battles/{id}/participate", "POST", "FAILED", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "joined" and data.get("battle_id"):
                self.log_result("/battles/{id}/participate", "POST", response.status_code, True, f"Joined battle: {data['battle_id']}")
                return True
            else:
                self.log_result("/battles/{id}/participate", "POST", response.status_code, False, f"Unexpected response: {data}")
                return False
        elif response.status_code == 400:
            # Already participating is acceptable
            self.log_result("/battles/{id}/participate", "POST", response.status_code, True, "Already participating (expected)")
            return True
        else:
            self.log_result("/battles/{id}/participate", "POST", response.status_code, False, response.text)
            return False
    
    def test_battle_complete(self):
        """Test battle completion (NEW ENDPOINT)"""
        print("\n🏆 Testing Battle Complete API (NEW)")
        
        if not self.battle_id:
            self.log_result("/battles/{id}/complete", "POST", "SKIPPED", False, "No battle ID available")
            return False
        
        response = self.make_request("POST", f"/battles/{self.battle_id}/complete")
        
        if not response:
            self.log_result("/battles/{id}/complete", "POST", "FAILED", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            required_fields = ["status", "xp_earned", "new_xp", "level_up", "records_broken", "new_dna", "user"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                self.log_result("/battles/{id}/complete", "POST", response.status_code, True, 
                              f"Battle completed, XP: {data['xp_earned']}, Level up: {data['level_up']}")
                return True
            else:
                self.log_result("/battles/{id}/complete", "POST", response.status_code, False, f"Missing fields: {missing_fields}")
                return False
        elif response.status_code == 400:
            # Already completed or not participating
            error_msg = response.json().get("detail", "Unknown error")
            if "già completata" in error_msg or "Non sei iscritto" in error_msg:
                self.log_result("/battles/{id}/complete", "POST", response.status_code, True, f"Expected error: {error_msg}")
                return True
            else:
                self.log_result("/battles/{id}/complete", "POST", response.status_code, False, error_msg)
                return False
        else:
            self.log_result("/battles/{id}/complete", "POST", response.status_code, False, response.text)
            return False
    
    def test_battle_trigger_live(self):
        """Test battle trigger live (NEW ENDPOINT)"""
        print("\n🔴 Testing Battle Trigger Live API (NEW)")
        
        if not self.battle_id:
            self.log_result("/battles/{id}/trigger-live", "POST", "SKIPPED", False, "No battle ID available")
            return False
        
        response = self.make_request("POST", f"/battles/{self.battle_id}/trigger-live")
        
        if not response:
            self.log_result("/battles/{id}/trigger-live", "POST", "FAILED", False, "Request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "live" and "battle_title" in data:
                self.log_result("/battles/{id}/trigger-live", "POST", response.status_code, True, 
                              f"Battle triggered live: {data['battle_title']}, Notifications: {data.get('notification_targets', 0)}")
                return True
            else:
                self.log_result("/battles/{id}/trigger-live", "POST", response.status_code, False, f"Unexpected response: {data}")
                return False
        else:
            self.log_result("/battles/{id}/trigger-live", "POST", response.status_code, False, response.text)
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting ArenaDare PULSE SPRINT Backend API Tests")
        print(f"🌐 Base URL: {BASE_URL}")
        print("=" * 60)
        
        # Authentication flow
        auth_success = self.test_auth_register()
        if not auth_success:
            print("❌ Authentication failed, stopping tests")
            return False
        
        # Complete onboarding
        self.test_onboarding()
        
        # Test NEW PULSE SPRINT endpoints
        self.test_challenge_complete()
        self.test_challenge_history()
        self.test_push_token()
        
        # Battle flow tests
        battles_success = self.test_get_battles()
        if battles_success:
            self.test_battle_participate()
            self.test_battle_complete()
            self.test_battle_trigger_live()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.results)
        successful_tests = len([r for r in self.results if r["success"]])
        failed_tests = total_tests - successful_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Successful: {successful_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(successful_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if not result["success"]:
                    print(f"  - {result['method']} {result['endpoint']}: {result['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)