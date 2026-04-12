#!/usr/bin/env python3
"""
ARENAKORE Backend API Testing Script
Tests the specific template endpoints mentioned in the review request
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
ADMIN_EMAIL = "ogrisek.stefano@gmail.com"
ADMIN_PASSWORD = "Founder@KORE2026!"

class ArenakoreAPITester:
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

    def test_login(self):
        """Test 1: Admin Login"""
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

    def test_system_templates(self):
        """Test 2: System Templates API"""
        url = f"{self.base_url}/templates/v2/system"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if isinstance(data, list) and len(data) >= 8:
                    # Check if templates have required fields
                    sample_template = data[0] if data else {}
                    required_fields = ['code', 'name', 'discipline', 'requires_nexus_bio', 'kpi_metrics', 'certified_by', 'source']
                    
                    if all(field in sample_template for field in required_fields):
                        if sample_template.get('source') == 'system':
                            success = True
                        else:
                            error_msg = f"Expected source='system', got '{sample_template.get('source')}'"
                    else:
                        missing_fields = [f for f in required_fields if f not in sample_template]
                        error_msg = f"Missing required fields: {missing_fields}"
                else:
                    error_msg = f"Expected at least 8 templates, got {len(data) if isinstance(data, list) else 0}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("System Templates", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("System Templates", False, 0, {}, str(e))
            return False

    def test_base_templates(self):
        """Test 3: Base Templates API"""
        url = f"{self.base_url}/templates/v2/base"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if isinstance(data, list) and len(data) >= 5:
                    # Check if templates have required fields
                    sample_template = data[0] if data else {}
                    
                    if sample_template.get('requires_nexus_bio') == False and sample_template.get('source') == 'base':
                        success = True
                    else:
                        error_msg = f"Expected requires_nexus_bio=false and source='base', got requires_nexus_bio={sample_template.get('requires_nexus_bio')}, source='{sample_template.get('source')}'"
                else:
                    error_msg = f"Expected at least 5 templates, got {len(data) if isinstance(data, list) else 0}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Base Templates", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("Base Templates", False, 0, {}, str(e))
            return False

    def test_all_templates_unified(self):
        """Test 4: All Templates Unified API"""
        url = f"{self.base_url}/templates/v2/all"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                required_keys = ['system', 'base', 'coach', 'total']
                if all(key in data for key in required_keys):
                    if isinstance(data['system'], list) and isinstance(data['base'], list) and isinstance(data['coach'], list):
                        if isinstance(data['total'], int) and data['total'] > 0:
                            success = True
                        else:
                            error_msg = f"Expected total to be positive integer, got {data['total']}"
                    else:
                        error_msg = "Expected system, base, and coach to be arrays"
                else:
                    missing_keys = [k for k in required_keys if k not in data]
                    error_msg = f"Missing required keys: {missing_keys}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("All Templates Unified", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("All Templates Unified", False, 0, {}, str(e))
            return False

    def test_bio_check_system_template(self):
        """Test 5: Bio Check for System Template Requiring Bio"""
        url = f"{self.base_url}/templates/v2/check-bio/SYS_BIO_SYNC?source=system"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if 'allowed' in data:
                    # Should return allowed: true/false with scan status and countdown
                    success = True
                else:
                    error_msg = "Missing 'allowed' field in response"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Bio Check (System Template)", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("Bio Check (System Template)", False, 0, {}, str(e))
            return False

    def test_bio_check_base_template(self):
        """Test 6: Bio Check for Base Template NOT Requiring Bio"""
        url = f"{self.base_url}/templates/v2/check-bio/BASE_CORDA_1MIN?source=base"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if data.get('allowed') == True and data.get('requires_nexus_bio') == False:
                    success = True
                else:
                    error_msg = f"Expected allowed=true and requires_nexus_bio=false, got allowed={data.get('allowed')}, requires_nexus_bio={data.get('requires_nexus_bio')}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Bio Check (Base Template)", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("Bio Check (Base Template)", False, 0, {}, str(e))
            return False

    def test_coach_onboarding(self):
        """Test 7: Coach Onboarding"""
        url = f"{self.base_url}/coach/onboarding"
        payload = {
            "professional_bio": "Allenatore certificato con 10 anni di esperienza nel functional fitness e preparazione atletica.",
            "specialties": ["Functional Training", "HIIT", "Basket Performance"],
            "certifications": ["CONI Livello 2", "CrossFit L1", "NASM CPT"],
            "years_experience": 10,
            "coaching_tier": "premium"
        }
        
        try:
            response = self.session.post(url, json=payload)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if data.get('status') == 'onboarding_completed' and 'coach_data' in data:
                    success = True
                else:
                    error_msg = f"Expected status='onboarding_completed' with coach_data, got status='{data.get('status')}'"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Coach Onboarding", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("Coach Onboarding", False, 0, {}, str(e))
            return False

    def test_coach_profile(self):
        """Test 8: Coach Profile"""
        url = f"{self.base_url}/coach/profile"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if (data.get('has_coach_profile') == True and 
                    data.get('onboarding_completed') == True and 
                    'coach_data' in data):
                    success = True
                else:
                    error_msg = f"Expected has_coach_profile=true, onboarding_completed=true with coach_data"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Coach Profile", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("Coach Profile", False, 0, {}, str(e))
            return False

    def test_create_coach_template(self):
        """Test 9: Create Coach Template"""
        url = f"{self.base_url}/templates/v2/coach"
        payload = {
            "name": "POWER PROTOCOL ELITE - COACH",
            "discipline": "Fitness",
            "exercise_type": "squat",
            "description": "Protocollo di potenza da coach certificato",
            "target_reps": 20,
            "target_time_seconds": 60,
            "difficulty": "hard",
            "video_url": "https://youtube.com/watch?v=example",
            "kpi_metrics": ["reps_per_minute", "peak_force"],
            "requires_nexus_bio": True,
            "xp_reward": 200,
            "tags": ["forza", "power"]
        }
        
        try:
            response = self.session.post(url, json=payload)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if (data.get('source') == 'coach' and 
                    'video_url' in data and 
                    'kpi_metrics' in data):
                    success = True
                else:
                    error_msg = f"Expected source='coach' with video_url and kpi_metrics fields"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Create Coach Template", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("Create Coach Template", False, 0, {}, str(e))
            return False

    def test_my_coach_templates(self):
        """Test 10: My Coach Templates"""
        url = f"{self.base_url}/templates/v2/mine"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if isinstance(data, list) and len(data) >= 1:
                    success = True
                else:
                    error_msg = f"Expected at least 1 template, got {len(data) if isinstance(data, list) else 0}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("My Coach Templates", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("My Coach Templates", False, 0, {}, str(e))
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting ARENAKORE Backend API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"👤 Admin: {ADMIN_EMAIL}")
        print("=" * 60)
        print()
        
        # Test sequence
        tests = [
            self.test_login,
            self.test_system_templates,
            self.test_base_templates,
            self.test_all_templates_unified,
            self.test_bio_check_system_template,
            self.test_bio_check_base_template,
            self.test_coach_onboarding,
            self.test_coach_profile,
            self.test_create_coach_template,
            self.test_my_coach_templates
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Backend is working correctly.")
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
            print()

if __name__ == "__main__":
    tester = ArenakoreAPITester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    sys.exit(0 if success else 1)