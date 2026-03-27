#!/usr/bin/env python3
"""
ARENAKORE Backend Testing - Focus on Founder Protocol Feature
Testing the new Founder Protocol implementation and smoke testing existing endpoints
"""

import requests
import json
import time
from datetime import datetime

# Base URL for the API
BASE_URL = "https://nexus-sync-elite.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@arenadare.com"
ADMIN_PASSWORD = "Admin2026!"

class FounderProtocolTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_user_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status} - {test_name}"
        if details:
            result += f": {details}"
        self.test_results.append(result)
        print(result)
        
    def admin_login(self):
        """Login as admin user"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("token")
                self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
                self.log_result("Admin Login", True, f"Token received, is_admin: {data.get('user', {}).get('is_admin')}")
                return True
            else:
                self.log_result("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    def test_founder_protocol_registration(self):
        """Test 1: Register new user and verify is_founder field"""
        timestamp = int(time.time())
        test_email = f"founder_test_{timestamp}@arena.com"
        test_username = f"FounderTest_{timestamp}"
        
        try:
            # Create new session for registration (no auth needed)
            reg_session = requests.Session()
            response = reg_session.post(f"{BASE_URL}/auth/register", json={
                "email": test_email,
                "password": "testpass123",
                "username": test_username
            })
            
            if response.status_code in [200, 201]:
                data = response.json()
                user = data.get("user", {})
                is_founder = user.get("is_founder")
                founder_number = user.get("founder_number")
                
                if is_founder is True:
                    self.log_result("Founder Protocol Registration", True, 
                                  f"New user {test_username} has is_founder=true, founder_number={founder_number}")
                    
                    # Store token for potential future tests
                    self.test_user_token = data.get("token")
                    return True
                else:
                    self.log_result("Founder Protocol Registration", False, 
                                  f"New user {test_username} has is_founder={is_founder}, expected true")
                    return False
            else:
                self.log_result("Founder Protocol Registration", False, 
                              f"Registration failed - Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Founder Protocol Registration", False, f"Exception: {str(e)}")
            return False
    
    def test_founder_in_auth_me(self):
        """Test 2: Verify is_founder field in /auth/me endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                is_founder = data.get("is_founder")
                is_admin = data.get("is_admin")
                username = data.get("username")
                
                if is_founder is not None:
                    self.log_result("Founder in Auth/Me", True, 
                                  f"Admin user {username} has is_founder={is_founder}, is_admin={is_admin}")
                    return True
                else:
                    self.log_result("Founder in Auth/Me", False, 
                                  f"is_founder field missing from auth/me response")
                    return False
            else:
                self.log_result("Founder in Auth/Me", False, 
                              f"Auth/me failed - Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Founder in Auth/Me", False, f"Exception: {str(e)}")
            return False
    
    def test_founder_in_leaderboard(self):
        """Test 3: Verify is_founder field in leaderboard endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/leaderboard?type=global")
            
            if response.status_code == 200:
                data = response.json()
                
                # Handle both possible response formats
                if isinstance(data, list):
                    users = data
                else:
                    users = data.get("users", [])
                
                if not users:
                    self.log_result("Founder in Leaderboard", False, "No users in leaderboard response")
                    return False
                
                # Check if all users have is_founder field
                founder_count = 0
                missing_founder_field = 0
                
                for user in users[:5]:  # Check first 5 users
                    if "is_founder" in user:
                        if user.get("is_founder"):
                            founder_count += 1
                    else:
                        missing_founder_field += 1
                
                if missing_founder_field == 0:
                    self.log_result("Founder in Leaderboard", True, 
                                  f"All users have is_founder field, {founder_count} founders found in top 5")
                    return True
                else:
                    self.log_result("Founder in Leaderboard", False, 
                                  f"{missing_founder_field} users missing is_founder field")
                    return False
            else:
                self.log_result("Founder in Leaderboard", False, 
                              f"Leaderboard failed - Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Founder in Leaderboard", False, f"Exception: {str(e)}")
            return False
    
    def smoke_test_existing_endpoints(self):
        """Test 4: Smoke test existing endpoints to ensure they still work"""
        endpoints_to_test = [
            ("GET", "/sports/categories", "Sports Categories"),
            ("GET", "/leaderboard?type=crews", "Crews Leaderboard"),
            ("POST", "/nexus/session/start", "Nexus Session Start", {"exercise_type": "squat"}),
            ("GET", "/crews/my-crews", "My Crews")
        ]
        
        all_passed = True
        
        for method, endpoint, name, *payload in endpoints_to_test:
            try:
                if method == "GET":
                    response = self.session.get(f"{BASE_URL}{endpoint}")
                elif method == "POST":
                    data = payload[0] if payload else {}
                    response = self.session.post(f"{BASE_URL}{endpoint}", json=data)
                
                if response.status_code in [200, 201]:
                    self.log_result(f"Smoke Test - {name}", True, f"Status: {response.status_code}")
                else:
                    self.log_result(f"Smoke Test - {name}", False, 
                                  f"Status: {response.status_code}, Response: {response.text[:100]}")
                    all_passed = False
                    
            except Exception as e:
                self.log_result(f"Smoke Test - {name}", False, f"Exception: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def run_all_tests(self):
        """Run all Founder Protocol tests"""
        print("=" * 80)
        print("ARENAKORE BACKEND TESTING - FOUNDER PROTOCOL FOCUS")
        print("=" * 80)
        print(f"Base URL: {BASE_URL}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # Step 1: Admin login
        if not self.admin_login():
            print("❌ CRITICAL: Admin login failed, cannot proceed with authenticated tests")
            return False
        
        # Step 2: Test Founder Protocol features
        test_results = []
        test_results.append(self.test_founder_protocol_registration())
        test_results.append(self.test_founder_in_auth_me())
        test_results.append(self.test_founder_in_leaderboard())
        test_results.append(self.smoke_test_existing_endpoints())
        
        # Summary
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(test_results)
        total = len(test_results)
        
        for result in self.test_results:
            print(result)
        
        print(f"\nOVERALL: {passed}/{total} test categories passed")
        
        if passed == total:
            print("🎉 ALL FOUNDER PROTOCOL TESTS PASSED!")
            return True
        else:
            print("⚠️  SOME TESTS FAILED - See details above")
            return False

if __name__ == "__main__":
    tester = FounderProtocolTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)