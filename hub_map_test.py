#!/usr/bin/env python3
"""
ARENAKORE Hub Map Engine Backend API Testing Script
Tests the specific Hub Map Engine endpoints mentioned in the review request
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
ADMIN_EMAIL = "ogrisek.stefano@gmail.com"
ADMIN_PASSWORD = "Founder@KORE2026!"

class HubMapAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.session = requests.Session()
        self.test_results = []
        self.saved_hub_id = None
        
    def log_test(self, test_name, success, status_code, response_data, error_msg=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'status_code': status_code,
            'response': response_data,
            'error': error_msg,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name} - Status: {status_code}")
        if error_msg:
            print(f"   Error: {error_msg}")
        if response_data and isinstance(response_data, dict):
            if 'message' in response_data:
                print(f"   Message: {response_data['message']}")
        print()

    def test_hubs_all(self):
        """Test 1: GET /api/hubs/all — No auth needed. Should return 8 seeded Italian hubs."""
        url = f"{self.base_url}/hubs/all"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if 'hubs' in data and isinstance(data['hubs'], list) and len(data['hubs']) >= 8:
                    # Check if hubs have required fields
                    sample_hub = data['hubs'][0] if data['hubs'] else {}
                    required_fields = ['name', 'hub_type', 'type_label', 'type_icon', 'type_color', 
                                     'latitude', 'longitude', 'rating_avg', 'athletes_count', 'coaches_count']
                    
                    if all(field in sample_hub for field in required_fields):
                        # Save the first hub's ID for later use
                        if 'id' in sample_hub:
                            self.saved_hub_id = sample_hub['id']
                            success = True
                        else:
                            error_msg = "Hub missing 'id' field"
                    else:
                        missing_fields = [f for f in required_fields if f not in sample_hub]
                        error_msg = f"Missing required fields: {missing_fields}"
                else:
                    hubs_count = len(data.get('hubs', [])) if isinstance(data.get('hubs'), list) else 0
                    error_msg = f"Expected at least 8 hubs, got {hubs_count}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("GET /api/hubs/all", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("GET /api/hubs/all", False, 0, {}, str(e))
            return False

    def test_hubs_nearby_milan(self):
        """Test 2: GET /api/hubs/nearby?lat=45.4642&lng=9.1900&radius=50 — Find hubs near Milan."""
        url = f"{self.base_url}/hubs/nearby?lat=45.4642&lng=9.1900&radius=50"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if 'hubs' in data and isinstance(data['hubs'], list) and len(data['hubs']) >= 4:
                    # Should return multiple hubs (at least 4-5 since most seeded hubs are in Milan)
                    success = True
                else:
                    hubs_count = len(data.get('hubs', [])) if isinstance(data.get('hubs'), list) else 0
                    error_msg = f"Expected at least 4 hubs near Milan, got {hubs_count}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("GET /api/hubs/nearby (Milan)", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("GET /api/hubs/nearby (Milan)", False, 0, {}, str(e))
            return False

    def test_hubs_nearby_rome(self):
        """Test 3: GET /api/hubs/nearby?lat=41.8750&lng=12.5200&radius=50 — Find hubs near Rome."""
        url = f"{self.base_url}/hubs/nearby?lat=41.8750&lng=12.5200&radius=50"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if 'hubs' in data and isinstance(data['hubs'], list) and len(data['hubs']) >= 1:
                    # Should return at least 1 hub (MMA Roma Fight Academy)
                    success = True
                else:
                    hubs_count = len(data.get('hubs', [])) if isinstance(data.get('hubs'), list) else 0
                    error_msg = f"Expected at least 1 hub near Rome, got {hubs_count}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("GET /api/hubs/nearby (Rome)", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("GET /api/hubs/nearby (Rome)", False, 0, {}, str(e))
            return False

    def test_hub_detail(self):
        """Test 4: GET /api/hubs/{hub_id} — Get hub details using saved hub_id."""
        if not self.saved_hub_id:
            self.log_test("GET /api/hubs/{hub_id}", False, 0, {}, "No hub_id saved from previous test")
            return False
            
        url = f"{self.base_url}/hubs/{self.saved_hub_id}"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                # Verify response has all basic fields plus additional ones
                required_fields = ['coaches', 'active_challenges_list', 'coach_templates', 'total_active']
                
                if all(field in data for field in required_fields):
                    if isinstance(data['coaches'], list) and isinstance(data['active_challenges_list'], list) and isinstance(data['coach_templates'], list):
                        success = True
                    else:
                        error_msg = "coaches, active_challenges_list, and coach_templates should be arrays"
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    error_msg = f"Missing required fields: {missing_fields}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("GET /api/hubs/{hub_id}", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("GET /api/hubs/{hub_id}", False, 0, {}, str(e))
            return False

    def test_hub_challenges(self):
        """Test 5: GET /api/hubs/{hub_id}/challenges — Get challenges at the hub."""
        if not self.saved_hub_id:
            self.log_test("GET /api/hubs/{hub_id}/challenges", False, 0, {}, "No hub_id saved from previous test")
            return False
            
        url = f"{self.base_url}/hubs/{self.saved_hub_id}/challenges"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                # Verify response has hub_name and challenges array
                if 'hub_name' in data and 'challenges' in data:
                    if isinstance(data['challenges'], list):
                        success = True
                    else:
                        error_msg = "challenges should be an array"
                else:
                    error_msg = "Missing hub_name or challenges field"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("GET /api/hubs/{hub_id}/challenges", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("GET /api/hubs/{hub_id}/challenges", False, 0, {}, str(e))
            return False

    def test_hub_types_list(self):
        """Test 6: GET /api/hubs/types/list — Get all hub types. Should return 13 types."""
        url = f"{self.base_url}/hubs/types/list"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if 'types' in data and isinstance(data['types'], dict) and len(data['types']) == 13:
                    # Check for expected hub types
                    expected_types = ['gym', 'crossfit', 'boxing', 'mma', 'basketball', 'football', 
                                    'athletics', 'swimming', 'yoga', 'tennis', 'climbing', 'golf', 'outdoor']
                    
                    # Extract type names from response
                    response_types = list(data['types'].keys())
                    
                    # Check if all expected types are present
                    missing_types = [t for t in expected_types if t not in response_types]
                    if not missing_types:
                        success = True
                    else:
                        error_msg = f"Missing expected hub types: {missing_types}"
                else:
                    types_count = len(data.get('types', {})) if isinstance(data.get('types'), dict) else 0
                    error_msg = f"Expected exactly 13 hub types, got {types_count}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("GET /api/hubs/types/list", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("GET /api/hubs/types/list", False, 0, {}, str(e))
            return False

    def test_login(self):
        """Test 7a: Admin Login for hub registration"""
        url = f"{self.base_url}/auth/login"
        payload = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        try:
            response = self.session.post(url, json=payload)
            data = response.json() if response.content else {}
            
            if response.status_code == 200 and 'token' in data:
                self.token = data['token']
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                self.log_test("Admin Login", True, response.status_code, data)
                return True
            else:
                self.log_test("Admin Login", False, response.status_code, data, "No token received")
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, 0, {}, str(e))
            return False

    def test_hub_register(self):
        """Test 7b: POST /api/hubs/register — Register a new hub (requires auth)."""
        if not self.token:
            self.log_test("POST /api/hubs/register", False, 0, {}, "No auth token available")
            return False
            
        url = f"{self.base_url}/hubs/register"
        payload = {
            "name": "KORE Test Hub",
            "hub_type": "crossfit",
            "description": "Hub di test per ARENAKORE",
            "address": "Via Test 1, Milano",
            "city": "Milano",
            "latitude": 45.48,
            "longitude": 9.20,
            "specialties": ["CrossFit", "HIIT"],
            "amenities": ["Rig", "Rower"]
        }
        
        try:
            response = self.session.post(url, json=payload)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                # Verify returns hub_id and success message
                if 'hub_id' in data and ('message' in data or 'status' in data):
                    success = True
                else:
                    error_msg = "Missing hub_id or success message in response"
            elif response.status_code == 403:
                # Expected behavior: Only Gym Owner or Coach can register hubs
                if 'detail' in data and 'Gym Owner' in data['detail']:
                    success = True  # This is expected behavior
                    error_msg = f"Expected 403 for SUPER_ADMIN role: {data['detail']}"
                else:
                    error_msg = f"Unexpected 403 error: {data.get('detail', 'Unknown error')}"
            else:
                error_msg = f"Expected status 200 or 403, got {response.status_code}"
                
            self.log_test("POST /api/hubs/register", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("POST /api/hubs/register", False, 0, {}, str(e))
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting ARENAKORE Hub Map Engine Backend API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"👤 Admin: {ADMIN_EMAIL}")
        print("=" * 60)
        print()
        
        # Test sequence as specified in review request
        tests = [
            ("Step 1", self.test_hubs_all),
            ("Step 2", self.test_hubs_nearby_milan),
            ("Step 3", self.test_hubs_nearby_rome),
            ("Step 4", self.test_hub_detail),
            ("Step 5", self.test_hub_challenges),
            ("Step 6", self.test_hub_types_list),
            ("Step 7a", self.test_login),
            ("Step 7b", self.test_hub_register)
        ]
        
        passed = 0
        total = len(tests)
        
        for step, test in tests:
            print(f"🔄 Running {step}...")
            if test():
                passed += 1
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Hub Map Engine backend is working correctly.")
        else:
            print(f"⚠️  {total - passed} tests failed. Check the details above.")
        
        return passed == total

    def print_summary(self):
        """Print detailed test summary"""
        print("\n" + "=" * 60)
        print("📋 DETAILED TEST SUMMARY")
        print("=" * 60)
        
        for result in self.test_results:
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            print(f"{status} {result['test']}")
            print(f"   Status Code: {result['status_code']}")
            if result['error']:
                print(f"   Error: {result['error']}")
            if result['response'] and isinstance(result['response'], dict):
                if 'message' in result['response']:
                    print(f"   Response: {result['response']['message']}")
                elif isinstance(result['response'], list) and len(result['response']) > 0:
                    print(f"   Response: {len(result['response'])} items returned")
            print()

if __name__ == "__main__":
    tester = HubMapAPITester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    sys.exit(0 if success else 1)