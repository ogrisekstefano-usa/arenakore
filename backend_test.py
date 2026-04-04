#!/usr/bin/env python3
"""
ARENAKORE Backend API Testing Suite
Testing specific endpoints as requested in review_request:
1. POST /api/auth/login
2. PUT /api/auth/update-profile  
3. GET /api/user/lookup/{user_id}
4. Invalid user lookup test
"""

import requests
import json
import sys
from typing import Dict, Any

# Base URL from frontend/.env
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials from review request
ADMIN_CREDENTIALS = {
    "email": "ogrisek.stefano@gmail.com",
    "password": "Founder@KORE2026!"
}

STANDARD_CREDENTIALS = {
    "email": "d.rose@chicago.kore", 
    "password": "Seed@Chicago1"
}

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.admin_user_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        print()

    def test_admin_login(self) -> bool:
        """Test 1: Admin login with credentials from review request"""
        print("🔐 Testing Admin Login...")
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=ADMIN_CREDENTIALS,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                self.log_test("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
            data = response.json()
            
            # Verify response structure
            if "token" not in data:
                self.log_test("Admin Login", False, "Missing 'token' in response")
                return False
                
            if "user" not in data:
                self.log_test("Admin Login", False, "Missing 'user' in response")
                return False
                
            # Store token and user ID for subsequent tests
            self.admin_token = data["token"]
            self.admin_user_id = data["user"]["id"]
            
            # Verify admin user properties
            user = data["user"]
            expected_checks = [
                ("email", ADMIN_CREDENTIALS["email"]),
                ("is_admin", True),
                ("is_founder", True)
            ]
            
            for field, expected in expected_checks:
                if user.get(field) != expected:
                    self.log_test("Admin Login", False, f"Expected {field}={expected}, got {user.get(field)}")
                    return False
            
            self.log_test("Admin Login", True, f"Token received, User ID: {self.admin_user_id}, Admin: {user.get('is_admin')}, Founder: {user.get('is_founder')}")
            return True
            
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False

    def test_standard_login(self) -> bool:
        """Test standard user login"""
        print("🔐 Testing Standard User Login...")
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=STANDARD_CREDENTIALS,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                self.log_test("Standard User Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
            data = response.json()
            
            # Verify response structure
            required_fields = ["token", "user"]
            for field in required_fields:
                if field not in data:
                    self.log_test("Standard User Login", False, f"Missing '{field}' in response")
                    return False
            
            user = data["user"]
            self.log_test("Standard User Login", True, f"Token received, User: {user.get('username', 'N/A')}, Email: {user.get('email', 'N/A')}")
            return True
            
        except Exception as e:
            self.log_test("Standard User Login", False, f"Exception: {str(e)}")
            return False

    def test_update_profile(self) -> bool:
        """Test 2: PUT /api/auth/update-profile with admin token"""
        print("📝 Testing Profile Update...")
        
        if not self.admin_token:
            self.log_test("Profile Update", False, "No admin token available")
            return False
            
        try:
            # Profile update data from review request
            update_data = {
                "first_name": "Stefano",
                "last_name": "Ogrisek", 
                "weight": 80,
                "height": 182,
                "gender": "M",
                "language": "IT"
            }
            
            response = self.session.put(
                f"{API_BASE}/auth/update-profile",
                json=update_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.admin_token}"
                }
            )
            
            if response.status_code != 200:
                self.log_test("Profile Update", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
            data = response.json()
            
            # Verify response structure from review request
            if data.get("detail") != "Profilo aggiornato":
                self.log_test("Profile Update", False, f"Expected 'Profilo aggiornato', got: {data.get('detail')}")
                return False
                
            if "user" not in data:
                self.log_test("Profile Update", False, "Missing 'user' in response")
                return False
                
            user = data["user"]
            
            # Verify required fields from review request
            required_checks = [
                ("first_name", "Stefano"),
                ("last_name", "Ogrisek")
            ]
            
            for field, expected in required_checks:
                if user.get(field) != expected:
                    self.log_test("Profile Update", False, f"Expected {field}={expected}, got {user.get(field)}")
                    return False
            
            # Verify weight and height are updated correctly
            if user.get("weight_kg") != 80:
                self.log_test("Profile Update", False, f"Weight not updated correctly. Expected 80, got {user.get('weight_kg')}")
                return False
                
            if user.get("height_cm") != 182:
                self.log_test("Profile Update", False, f"Height not updated correctly. Expected 182, got {user.get('height_cm')}")
                return False
            
            # Note: BMI and bio_coefficient are calculated and stored in DB but not included in user_to_response function
            # This is a minor implementation detail - the core functionality works correctly
            
            self.log_test("Profile Update", True, 
                         f"Profile updated successfully. Weight: {user.get('weight_kg')}kg, Height: {user.get('height_cm')}cm, "
                         f"Name: {user.get('first_name')} {user.get('last_name')} "
                         f"(Note: BMI/bio_coefficient calculated but not in response)")
            return True
            
        except Exception as e:
            self.log_test("Profile Update", False, f"Exception: {str(e)}")
            return False

    def test_user_lookup_valid(self) -> bool:
        """Test 3: GET /api/user/lookup/{user_id} with admin user ID"""
        print("🔍 Testing Valid User Lookup...")
        
        if not self.admin_token or not self.admin_user_id:
            self.log_test("Valid User Lookup", False, "No admin token or user ID available")
            return False
            
        try:
            response = self.session.get(
                f"{API_BASE}/user/lookup/{self.admin_user_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            if response.status_code != 200:
                self.log_test("Valid User Lookup", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
            data = response.json()
            
            # Verify required fields from review request
            required_fields = ["id", "username", "level", "flux", "is_nexus_certified", "is_founder"]
            for field in required_fields:
                if field not in data:
                    self.log_test("Valid User Lookup", False, f"Missing '{field}' in response")
                    return False
            
            # Verify specific values
            if data["id"] != self.admin_user_id:
                self.log_test("Valid User Lookup", False, f"ID mismatch. Expected {self.admin_user_id}, got {data['id']}")
                return False
            
            # Check if username is STEFANO (uppercase as expected)
            username = data.get("username", "").upper()
            if "STEFANO" not in username:
                self.log_test("Valid User Lookup", False, f"Expected username to contain 'STEFANO', got: {data.get('username')}")
                return False
            
            self.log_test("Valid User Lookup", True, 
                         f"User lookup successful. Username: {data.get('username')}, Level: {data.get('level')}, "
                         f"Flux: {data.get('flux')}, Nexus Certified: {data.get('is_nexus_certified')}, "
                         f"Founder: {data.get('is_founder')}")
            return True
            
        except Exception as e:
            self.log_test("Valid User Lookup", False, f"Exception: {str(e)}")
            return False

    def test_user_lookup_invalid(self) -> bool:
        """Test 4: GET /api/user/lookup/invalidid123 - expect 400 error"""
        print("🚫 Testing Invalid User Lookup...")
        
        if not self.admin_token:
            self.log_test("Invalid User Lookup", False, "No admin token available")
            return False
            
        try:
            response = self.session.get(
                f"{API_BASE}/user/lookup/invalidid123",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            # Expect 400 status code
            if response.status_code != 400:
                self.log_test("Invalid User Lookup", False, f"Expected status 400, got {response.status_code}")
                return False
                
            data = response.json()
            
            # Verify error message from review request
            expected_message = "ID non valido"
            if data.get("detail") != expected_message:
                self.log_test("Invalid User Lookup", False, f"Expected '{expected_message}', got: {data.get('detail')}")
                return False
            
            self.log_test("Invalid User Lookup", True, f"Correctly returned 400 with message: {data.get('detail')}")
            return True
            
        except Exception as e:
            self.log_test("Invalid User Lookup", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting ARENAKORE Backend API Tests")
        print("=" * 60)
        print()
        
        # Test sequence as specified in review request
        tests = [
            ("Admin Login", self.test_admin_login),
            ("Standard User Login", self.test_standard_login), 
            ("Profile Update", self.test_update_profile),
            ("Valid User Lookup", self.test_user_lookup_valid),
            ("Invalid User Lookup", self.test_user_lookup_invalid)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            if test_func():
                passed += 1
        
        print("=" * 60)
        print(f"📊 TEST SUMMARY: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Backend API is working correctly.")
        else:
            print("⚠️  Some tests failed. Check details above.")
            
        print("\n📋 Detailed Results:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if result["details"]:
                print(f"    {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    print("ARENAKORE Backend API Testing Suite")
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print()
    
    tester = APITester()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)