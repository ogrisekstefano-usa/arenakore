#!/usr/bin/env python3
"""
ARENAKORE Backend API Testing Script
Testing specific endpoints as requested in the review request
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Base URL from the review request
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"

# Test credentials from review request
ADMIN_EMAIL = "ogrisek.stefano@gmail.com"
ADMIN_PASSWORD = "Founder@KORE2026!"

class ArenakoreAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.test_results = []
        
    def log_test(self, test_name: str, status_code: int, response_data: Any, success: bool = True, error: str = None):
        """Log test results"""
        result = {
            "test": test_name,
            "status_code": status_code,
            "success": success,
            "response": response_data,
            "error": error
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name} - Status: {status_code}")
        if error:
            print(f"   Error: {error}")
        if isinstance(response_data, dict) and len(str(response_data)) < 200:
            print(f"   Response: {response_data}")
        elif response_data:
            print(f"   Response: {str(response_data)[:100]}...")
        print()
        
    def test_health_check(self):
        """Test 1: Health Check - GET /api/health"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            expected_response = {"status": "ok"}
            
            success = (response.status_code == 200 and 
                      response.json().get("status") == "ok")
            
            self.log_test("Health Check", response.status_code, response.json(), success)
            return success
            
        except Exception as e:
            self.log_test("Health Check", 0, None, False, str(e))
            return False
    
    def test_login(self):
        """Test 2: Login - POST /api/auth/login"""
        try:
            login_data = {
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }
            
            response = requests.post(f"{self.base_url}/auth/login", 
                                   json=login_data, timeout=10)
            
            if response.status_code == 200:
                response_data = response.json()
                if "token" in response_data:
                    self.token = response_data["token"]
                    self.log_test("Admin Login", response.status_code, 
                                {"token": "***", "user": response_data.get("user", {})}, True)
                    return True
                else:
                    self.log_test("Admin Login", response.status_code, response_data, False, "No token in response")
                    return False
            else:
                self.log_test("Admin Login", response.status_code, response.json(), False)
                return False
                
        except Exception as e:
            self.log_test("Admin Login", 0, None, False, str(e))
            return False
    
    def test_flux_balance(self):
        """Test 3: Flux Balance - GET /api/flux/balance (new endpoint)"""
        if not self.token:
            self.log_test("Flux Balance", 0, None, False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.base_url}/flux/balance", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                response_data = response.json()
                expected_fields = ["vital", "perform", "team", "total", "level", "k_flux", "progress"]
                has_all_fields = all(field in response_data for field in expected_fields)
                
                self.log_test("Flux Balance", response.status_code, response_data, has_all_fields)
                return has_all_fields
            else:
                self.log_test("Flux Balance", response.status_code, response.json(), False)
                return False
                
        except Exception as e:
            self.log_test("Flux Balance", 0, None, False, str(e))
            return False
    
    def test_live_stats(self):
        """Test 4: Live Stats - GET /api/stats/live (new endpoint)"""
        if not self.token:
            self.log_test("Live Stats", 0, None, False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.base_url}/stats/live", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                response_data = response.json()
                expected_fields = ["kore_attivi", "sessioni_oggi", "record_battuti", "sfide_attive"]
                has_all_fields = all(field in response_data for field in expected_fields)
                
                self.log_test("Live Stats", response.status_code, response_data, has_all_fields)
                return has_all_fields
            else:
                self.log_test("Live Stats", response.status_code, response.json(), False)
                return False
                
        except Exception as e:
            self.log_test("Live Stats", 0, None, False, str(e))
            return False
    
    def test_leaderboard(self):
        """Test 5: Leaderboard - GET /api/leaderboard?type=global&limit=10"""
        if not self.token:
            self.log_test("Leaderboard", 0, None, False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            params = {"type": "global", "limit": 10}
            response = requests.get(f"{self.base_url}/leaderboard", 
                                  headers=headers, params=params, timeout=10)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if response is a list or has a list of users
                users = response_data if isinstance(response_data, list) else response_data.get("users", [])
                
                if users and len(users) > 0:
                    # Check if each entry has required fields
                    first_user = users[0]
                    required_fields = ["flux", "level", "preferred_sport"]
                    has_required_fields = all(field in first_user for field in required_fields)
                    
                    self.log_test("Leaderboard", response.status_code, 
                                {"users_count": len(users), "first_user_fields": list(first_user.keys())}, 
                                has_required_fields)
                    return has_required_fields
                else:
                    self.log_test("Leaderboard", response.status_code, response_data, False, "No users in response")
                    return False
            else:
                self.log_test("Leaderboard", response.status_code, response.json(), False)
                return False
                
        except Exception as e:
            self.log_test("Leaderboard", 0, None, False, str(e))
            return False
    
    def test_my_rank(self):
        """Test 6: My Rank - GET /api/leaderboard/my-rank"""
        if not self.token:
            self.log_test("My Rank", 0, None, False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.base_url}/leaderboard/my-rank", 
                                  headers=headers, timeout=10)
            
            success = response.status_code == 200
            self.log_test("My Rank", response.status_code, response.json(), success)
            return success
                
        except Exception as e:
            self.log_test("My Rank", 0, None, False, str(e))
            return False
    
    def test_pvp_challenge_send(self):
        """Test 7: PvP Challenge Send - POST /api/pvp/challenge (critical fix)"""
        if not self.token:
            self.log_test("PvP Challenge Send", 0, None, False, "No auth token available")
            return False
        
        # First, get a list of users from leaderboard to find a valid target
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            
            # Get leaderboard to find a target user
            leaderboard_response = requests.get(f"{self.base_url}/leaderboard", 
                                              headers=headers, params={"type": "global", "limit": 5}, timeout=10)
            
            if leaderboard_response.status_code != 200:
                self.log_test("PvP Challenge Send", 0, None, False, "Could not get leaderboard for target user")
                return False
            
            leaderboard_data = leaderboard_response.json()
            users = leaderboard_data if isinstance(leaderboard_data, list) else leaderboard_data.get("users", [])
            
            if not users or len(users) < 2:
                self.log_test("PvP Challenge Send", 0, None, False, "Not enough users in leaderboard for PvP")
                return False
            
            # Find a target user (not the current user)
            target_user = None
            for user in users:
                if user.get("id") and user.get("username") != "The founder":
                    target_user = user
                    break
            
            if not target_user:
                self.log_test("PvP Challenge Send", 0, None, False, "No valid target user found")
                return False
            
            # Now send the PvP challenge - using correct endpoint /api/pvp/challenge
            challenge_data = {
                "challenged_user_id": target_user["id"],  # Fixed: use challenged_user_id instead of opponent_id
                "discipline": "power",
                "xp_stake": 50  # Fixed: use valid stake value (50, 100, 200, or 500)
            }
            
            response = requests.post(f"{self.base_url}/pvp/challenge", 
                                   json=challenge_data, headers=headers, timeout=10)
            
            # Expect 200 or 201 (NOT 500)
            success = response.status_code in [200, 201]
            
            self.log_test("PvP Challenge Send", response.status_code, 
                        {"target_user": target_user["username"], "response": response.json()}, success)
            return success
                
        except Exception as e:
            self.log_test("PvP Challenge Send", 0, None, False, str(e))
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting ARENAKORE Backend API Tests")
        print(f"Base URL: {self.base_url}")
        print(f"Admin Email: {ADMIN_EMAIL}")
        print("=" * 60)
        
        tests = [
            self.test_health_check,
            self.test_login,
            self.test_flux_balance,
            self.test_live_stats,
            self.test_leaderboard,
            self.test_my_rank,
            self.test_pvp_challenge_send
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests PASSED!")
        else:
            print(f"⚠️  {total - passed} tests FAILED")
        
        return passed == total
    
    def print_summary(self):
        """Print detailed test summary"""
        print("\n📋 DETAILED TEST SUMMARY:")
        print("=" * 60)
        
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{status} {result['test']}")
            print(f"   HTTP Status: {result['status_code']}")
            
            if result["error"]:
                print(f"   Error: {result['error']}")
            elif result["response"]:
                if isinstance(result["response"], dict):
                    print(f"   Response Keys: {list(result['response'].keys())}")
                else:
                    print(f"   Response: {str(result['response'])[:100]}...")
            print()

if __name__ == "__main__":
    tester = ArenakoreAPITester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    sys.exit(0 if success else 1)