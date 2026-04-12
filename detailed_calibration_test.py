#!/usr/bin/env python3
"""
ARENAKORE Smart Calibration Engine Backend Testing Script - Detailed Version
Tests the calibration endpoints mentioned in the review request with detailed output
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
ATHLETE_EMAIL = "d.rose@chicago.kore"
ATHLETE_PASSWORD = "Seed@Chicago1"
FALLBACK_EMAIL = "ogrisek.stefano@gmail.com"
FALLBACK_PASSWORD = "Founder@KORE2026!"

class DetailedCalibrationTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, status_code, response_data, error_msg=None):
        """Log test results with detailed output"""
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
        
        # Print detailed response for analysis
        if response_data:
            print(f"   Response: {json.dumps(response_data, indent=2)}")
        print()

    def test_login(self, email, password):
        """Test login with given credentials"""
        url = f"{self.base_url}/auth/login"
        payload = {
            "email": email,
            "password": password
        }
        
        try:
            response = self.session.post(url, json=payload)
            data = response.json() if response.content else {}
            
            if response.status_code == 200 and 'token' in data:
                self.token = data['token']
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                # Remove token from logged data for security
                logged_data = {k: v for k, v in data.items() if k != 'token'}
                logged_data['token'] = '[REDACTED]'
                self.log_test(f"Login ({email})", True, response.status_code, logged_data)
                return True
            else:
                self.log_test(f"Login ({email})", False, response.status_code, data, "No token received")
                return False
                
        except Exception as e:
            self.log_test(f"Login ({email})", False, 0, {}, str(e))
            return False

    def test_all_calibration_endpoints(self):
        """Test all calibration endpoints in sequence"""
        print("🔍 Testing all calibration endpoints with detailed output...")
        print()
        
        # Test 1: Initial Protocol Check
        print("1️⃣ Testing GET /api/calibration/protocol (Initial)")
        url = f"{self.base_url}/calibration/protocol"
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            self.log_test("Initial Protocol Check", response.status_code == 200, response.status_code, data)
        except Exception as e:
            self.log_test("Initial Protocol Check", False, 0, {}, str(e))
        
        # Test 2: Initial Status Check
        print("2️⃣ Testing GET /api/calibration/status (Initial)")
        url = f"{self.base_url}/calibration/status"
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            self.log_test("Initial Status Check", response.status_code == 200, response.status_code, data)
        except Exception as e:
            self.log_test("Initial Status Check", False, 0, {}, str(e))
        
        # Test 3: Complete Calibration
        print("3️⃣ Testing POST /api/calibration/complete")
        url = f"{self.base_url}/calibration/complete"
        payload = {
            "exercises_completed": [
                {
                    "exercise_id": "squat_basic",
                    "actual_reps": 10,
                    "target_reps": 10,
                    "duration_seconds": 55,
                    "quality_score": 85
                },
                {
                    "exercise_id": "march_in_place",
                    "actual_reps": 18,
                    "target_reps": 20,
                    "duration_seconds": 40,
                    "quality_score": 72
                }
            ],
            "fluidity_score": 75.5,
            "biometric_effort": 68.0,
            "heart_rate_avg": 142,
            "time_under_tension": 95,
            "rep_regularity": 81
        }
        try:
            response = self.session.post(url, json=payload)
            data = response.json() if response.content else {}
            self.log_test("Complete Calibration", response.status_code == 200, response.status_code, data)
        except Exception as e:
            self.log_test("Complete Calibration", False, 0, {}, str(e))
        
        # Test 4: Status After Completion
        print("4️⃣ Testing GET /api/calibration/status (After Completion)")
        url = f"{self.base_url}/calibration/status"
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            self.log_test("Status After Completion", response.status_code == 200, response.status_code, data)
        except Exception as e:
            self.log_test("Status After Completion", False, 0, {}, str(e))
        
        # Test 5: Protocol After Completion
        print("5️⃣ Testing GET /api/calibration/protocol (After Completion)")
        url = f"{self.base_url}/calibration/protocol"
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            self.log_test("Protocol After Completion", response.status_code == 200, response.status_code, data)
        except Exception as e:
            self.log_test("Protocol After Completion", False, 0, {}, str(e))
        
        # Test 6: 48h Gate Prevention
        print("6️⃣ Testing POST /api/calibration/complete (48h Gate Prevention)")
        url = f"{self.base_url}/calibration/complete"
        payload = {
            "exercises_completed": [
                {
                    "exercise_id": "squat_basic",
                    "actual_reps": 5,
                    "target_reps": 10,
                    "duration_seconds": 30,
                    "quality_score": 50
                }
            ],
            "fluidity_score": 50.0,
            "biometric_effort": 40.0,
            "heart_rate_avg": 120,
            "time_under_tension": 30,
            "rep_regularity": 60
        }
        try:
            response = self.session.post(url, json=payload)
            data = response.json() if response.content else {}
            # Status 423 (Locked) is actually correct for rate limiting/time-based restrictions
            success = response.status_code in [400, 403, 409, 423]
            self.log_test("48h Gate Prevention", success, response.status_code, data)
        except Exception as e:
            self.log_test("48h Gate Prevention", False, 0, {}, str(e))

    def run_detailed_test(self):
        """Run detailed calibration test"""
        print("🚀 Starting ARENAKORE Smart Calibration Engine - DETAILED ANALYSIS")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 80)
        print()
        
        # Try athlete login first, fallback to admin
        login_success = self.test_login(ATHLETE_EMAIL, ATHLETE_PASSWORD)
        if not login_success:
            print("⚠️  Athlete login failed, trying fallback credentials...")
            login_success = self.test_login(FALLBACK_EMAIL, FALLBACK_PASSWORD)
            
        if not login_success:
            print("❌ Both login attempts failed. Cannot proceed with tests.")
            return False
        
        # Run all calibration tests
        self.test_all_calibration_endpoints()
        
        # Summary
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print("=" * 80)
        print(f"📊 DETAILED TEST RESULTS: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Calibration Engine is working correctly.")
        else:
            print(f"⚠️  {total - passed} tests failed. See detailed analysis above.")
        
        return passed == total

if __name__ == "__main__":
    tester = DetailedCalibrationTester()
    success = tester.run_detailed_test()
    
    sys.exit(0 if success else 1)