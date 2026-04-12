#!/usr/bin/env python3
"""
ARENAKORE Smart Calibration Engine Backend Testing Script
Tests the calibration endpoints mentioned in the review request
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

class CalibrationAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.session = requests.Session()
        self.test_results = []
        
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
                self.log_test(f"Login ({email})", True, response.status_code, data)
                return True
            else:
                self.log_test(f"Login ({email})", False, response.status_code, data, "No token received")
                return False
                
        except Exception as e:
            self.log_test(f"Login ({email})", False, 0, {}, str(e))
            return False

    def test_calibration_protocol(self):
        """Test 2: GET /api/calibration/protocol"""
        url = f"{self.base_url}/calibration/protocol"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                # Check for required fields based on review request
                if 'status' in data:
                    status = data.get('status')
                    if status in ['ready', 'calibrating']:
                        if status == 'ready':
                            # Should have protocol object with required fields
                            protocol = data.get('protocol', {})
                            required_fields = ['name', 'description', 'exercises', 'total_duration', 'athlete_context']
                            if all(field in protocol for field in required_fields):
                                # Check exercises array structure
                                exercises = protocol.get('exercises', [])
                                if exercises and isinstance(exercises, list):
                                    exercise = exercises[0]
                                    exercise_fields = ['id', 'name', 'description', 'target_reps', 'duration_seconds', 'complexity']
                                    if all(field in exercise for field in exercise_fields):
                                        success = True
                                    else:
                                        missing_fields = [f for f in exercise_fields if f not in exercise]
                                        error_msg = f"Exercise missing fields: {missing_fields}"
                                else:
                                    error_msg = "Protocol missing exercises array"
                            else:
                                missing_fields = [f for f in required_fields if f not in protocol]
                                error_msg = f"Protocol missing fields: {missing_fields}"
                        else:  # status == 'calibrating'
                            success = True  # For calibrating status, just need status field
                    else:
                        error_msg = f"Invalid status: {status}. Expected 'ready' or 'calibrating'"
                else:
                    error_msg = "Missing 'status' field in response"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Calibration Protocol", success, response.status_code, data, error_msg)
            return success, data
            
        except Exception as e:
            self.log_test("Calibration Protocol", False, 0, {}, str(e))
            return False, {}

    def test_calibration_status(self):
        """Test 3: GET /api/calibration/status"""
        url = f"{self.base_url}/calibration/status"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                # Check for required fields based on review request
                required_fields = ['status', 'hours_remaining', 'dna']
                if all(field in data for field in required_fields):
                    status = data.get('status')
                    if status in ['pending', 'calibrating', 'ready']:
                        success = True
                    else:
                        error_msg = f"Invalid status: {status}. Expected 'pending', 'calibrating', or 'ready'"
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    error_msg = f"Missing required fields: {missing_fields}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Calibration Status", success, response.status_code, data, error_msg)
            return success, data
            
        except Exception as e:
            self.log_test("Calibration Status", False, 0, {}, str(e))
            return False, {}

    def test_calibration_complete(self):
        """Test 4: POST /api/calibration/complete"""
        url = f"{self.base_url}/calibration/complete"
        
        # Test payload from review request
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
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                # Check for required fields based on review request
                if data.get('status') == 'calibrating':
                    calibration = data.get('calibration', {})
                    if calibration.get('hours_remaining') == 48:
                        results = data.get('results', {})
                        required_result_fields = ['dna_markers', 'total_reps', 'flux_earned']
                        if all(field in results for field in required_result_fields):
                            # Check DNA markers structure
                            dna_markers = results.get('dna_markers', {})
                            expected_dna_keys = ['power', 'endurance', 'flexibility', 'speed', 'stability']
                            if all(key in dna_markers for key in expected_dna_keys):
                                # Check if all DNA values are 0-100
                                if all(0 <= dna_markers[key] <= 100 for key in expected_dna_keys):
                                    success = True
                                else:
                                    error_msg = "DNA marker values should be 0-100"
                            else:
                                missing_dna = [k for k in expected_dna_keys if k not in dna_markers]
                                error_msg = f"Missing DNA markers: {missing_dna}"
                        else:
                            missing_fields = [f for f in required_result_fields if f not in results]
                            error_msg = f"Missing result fields: {missing_fields}"
                    else:
                        error_msg = f"Expected hours_remaining=48, got {calibration.get('hours_remaining')}"
                else:
                    error_msg = f"Expected status='calibrating', got '{data.get('status')}'"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Calibration Complete", success, response.status_code, data, error_msg)
            return success, data
            
        except Exception as e:
            self.log_test("Calibration Complete", False, 0, {}, str(e))
            return False, {}

    def test_calibration_status_after_complete(self):
        """Test 5: GET /api/calibration/status after completion"""
        url = f"{self.base_url}/calibration/status"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                # Should now return status: "calibrating" with hours_remaining close to 48
                if data.get('status') == 'calibrating':
                    hours_remaining = data.get('hours_remaining')
                    if hours_remaining is not None and 47 <= hours_remaining <= 48:
                        success = True
                    else:
                        error_msg = f"Expected hours_remaining close to 48, got {hours_remaining}"
                else:
                    error_msg = f"Expected status='calibrating', got '{data.get('status')}'"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Calibration Status (After Complete)", success, response.status_code, data, error_msg)
            return success, data
            
        except Exception as e:
            self.log_test("Calibration Status (After Complete)", False, 0, {}, str(e))
            return False, {}

    def test_calibration_protocol_after_complete(self):
        """Test 6: GET /api/calibration/protocol after completion"""
        url = f"{self.base_url}/calibration/protocol"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                # Should now show status: "calibrating" with countdown
                if data.get('status') == 'calibrating':
                    success = True
                else:
                    error_msg = f"Expected status='calibrating', got '{data.get('status')}'"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Calibration Protocol (After Complete)", success, response.status_code, data, error_msg)
            return success, data
            
        except Exception as e:
            self.log_test("Calibration Protocol (After Complete)", False, 0, {}, str(e))
            return False, {}

    def test_48h_gate_prevention(self):
        """Test 7: Verify 48h gate prevents recalibration"""
        url = f"{self.base_url}/calibration/complete"
        
        # Try to complete calibration again
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
            
            success = False
            error_msg = None
            
            # Should be rejected due to 48h gate
            if response.status_code in [400, 403, 409]:
                # Check if error message mentions calibration in progress or time restriction
                message = data.get('message', '').lower()
                if any(keyword in message for keyword in ['calibrating', '48', 'hours', 'wait', 'progress']):
                    success = True
                else:
                    error_msg = f"Expected calibration restriction message, got: {data.get('message')}"
            elif response.status_code == 200:
                error_msg = "Expected rejection due to 48h gate, but calibration was allowed"
            else:
                error_msg = f"Expected status 400/403/409, got {response.status_code}"
                
            self.log_test("48h Gate Prevention", success, response.status_code, data, error_msg)
            return success, data
            
        except Exception as e:
            self.log_test("48h Gate Prevention", False, 0, {}, str(e))
            return False, {}

    def run_all_tests(self):
        """Run all calibration tests in sequence"""
        print("🚀 Starting ARENAKORE Smart Calibration Engine Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        print()
        
        # Try athlete login first, fallback to admin
        login_success = self.test_login(ATHLETE_EMAIL, ATHLETE_PASSWORD)
        if not login_success:
            print("⚠️  Athlete login failed, trying fallback credentials...")
            login_success = self.test_login(FALLBACK_EMAIL, FALLBACK_PASSWORD)
            
        if not login_success:
            print("❌ Both login attempts failed. Cannot proceed with tests.")
            return False
        
        # Test sequence
        tests = [
            self.test_calibration_protocol,
            self.test_calibration_status,
            self.test_calibration_complete,
            self.test_calibration_status_after_complete,
            self.test_calibration_protocol_after_complete,
            self.test_48h_gate_prevention
        ]
        
        passed = 1  # Login already passed
        total = len(tests) + 1  # +1 for login
        
        for test in tests:
            result = test()
            if isinstance(result, tuple):
                if result[0]:  # success
                    passed += 1
            elif result:  # boolean success
                passed += 1
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Calibration Engine is working correctly.")
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
                # Show key response data for successful tests
                elif result['success']:
                    if 'status' in result['response']:
                        print(f"   Status: {result['response']['status']}")
                    if 'hours_remaining' in result['response']:
                        print(f"   Hours Remaining: {result['response']['hours_remaining']}")
            print()

if __name__ == "__main__":
    tester = CalibrationAPITester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    sys.exit(0 if success else 1)