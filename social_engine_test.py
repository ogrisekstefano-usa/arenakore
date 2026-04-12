#!/usr/bin/env python3
"""
ARENAKORE Social Engine Backend API Testing Script
Tests the social engine endpoints mentioned in the review request
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
ADMIN_EMAIL = "ogrisek.stefano@gmail.com"
ADMIN_PASSWORD = "Founder@KORE2026!"

class SocialEngineAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.session = requests.Session()
        self.test_results = []
        self.activity_id = None
        self.share_id = None
        
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

    def test_admin_login(self):
        """Test 1: Admin Login with credentials"""
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

    def test_get_activity_log(self):
        """Test 2: Get activity log to find an activity_id"""
        url = f"{self.base_url}/activity/log"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if isinstance(data, dict) and 'records' in data:
                    records = data['records']
                    if isinstance(records, list) and len(records) > 0:
                        # Get the first record's id
                        first_record = records[0]
                        if 'id' in first_record:
                            self.activity_id = first_record['id']
                            success = True
                            print(f"   Found activity_id: {self.activity_id}")
                        else:
                            error_msg = "First record missing 'id' field"
                    else:
                        error_msg = "No records found in response"
                elif isinstance(data, dict) and 'activities' in data:
                    activities = data['activities']
                    if isinstance(activities, list) and len(activities) > 0:
                        # Get the first activity's id
                        first_activity = activities[0]
                        if 'id' in first_activity:
                            self.activity_id = first_activity['id']
                            success = True
                            print(f"   Found activity_id: {self.activity_id}")
                        else:
                            error_msg = "First activity missing 'id' field"
                    else:
                        error_msg = "No activities found in response"
                elif isinstance(data, list) and len(data) > 0:
                    # Handle case where response is directly an array
                    first_activity = data[0]
                    if 'id' in first_activity:
                        self.activity_id = first_activity['id']
                        success = True
                        print(f"   Found activity_id: {self.activity_id}")
                    else:
                        error_msg = "First activity missing 'id' field"
                else:
                    error_msg = "Invalid response format or no records/activities found"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Get Activity Log", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("Get Activity Log", False, 0, {}, str(e))
            return False

    def test_generate_social_share(self):
        """Test 3: Generate social share card"""
        if not self.activity_id:
            self.log_test("Generate Social Share", False, 0, {}, "No activity_id available")
            return False
            
        url = f"{self.base_url}/social/generate-share"
        payload = {
            "activity_id": self.activity_id,
            "card_type": "social_card",
            "include_qr": True,
            "include_telemetry": False
        }
        
        try:
            response = self.session.post(url, json=payload)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                required_fields = ['share_id', 'deep_link', 'qr_url', 'badge', 'user', 'activity']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Check badge structure
                    badge = data.get('badge', {})
                    if all(key in badge for key in ['text', 'color', 'hex']):
                        # Check K-Flux tier color logic
                        activity = data.get('activity', {})
                        flux = activity.get('flux_earned', 0)
                        expected_color = 'gold' if flux >= 200 else 'cyan' if flux >= 100 else 'green'
                        
                        if badge.get('color') == expected_color:
                            self.share_id = data['share_id']
                            success = True
                            print(f"   Generated share_id: {self.share_id}")
                            print(f"   Badge color: {badge.get('color')} (flux: {flux})")
                            print(f"   Deep link: {data.get('deep_link')}")
                        else:
                            error_msg = f"Badge color mismatch. Expected {expected_color} for flux {flux}, got {badge.get('color')}"
                    else:
                        error_msg = "Badge missing required fields (text, color, hex)"
                else:
                    error_msg = f"Missing required fields: {missing_fields}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Generate Social Share", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("Generate Social Share", False, 0, {}, str(e))
            return False

    def test_get_public_card(self):
        """Test 4: Get public card (NO auth token needed)"""
        if not self.share_id:
            self.log_test("Get Public Card", False, 0, {}, "No share_id available")
            return False
            
        url = f"{self.base_url}/social/card/{self.share_id}"
        
        # Create a new session without auth token for public endpoint
        public_session = requests.Session()
        
        try:
            response = public_session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if 'views' in data and data['views'] >= 1:
                    success = True
                    print(f"   Views: {data.get('views')}")
                else:
                    error_msg = f"Expected views >= 1, got {data.get('views')}"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Get Public Card", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("Get Public Card", False, 0, {}, str(e))
            return False

    def test_track_cta_tap(self):
        """Test 5: Track CTA tap (no auth needed)"""
        if not self.share_id:
            self.log_test("Track CTA Tap", False, 0, {}, "No share_id available")
            return False
            
        url = f"{self.base_url}/social/card/{self.share_id}/tap"
        
        # Create a new session without auth token for public endpoint
        public_session = requests.Session()
        
        try:
            response = public_session.post(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if data.get('status') == 'tracked':
                    success = True
                    print(f"   Status: {data.get('status')}")
                else:
                    error_msg = f"Expected status='tracked', got '{data.get('status')}'"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Track CTA Tap", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("Track CTA Tap", False, 0, {}, str(e))
            return False

    def test_get_my_shares(self):
        """Test 6: Get my shares (with auth token)"""
        url = f"{self.base_url}/social/my-shares"
        
        try:
            response = self.session.get(url)
            data = response.json() if response.content else {}
            
            success = False
            error_msg = None
            
            if response.status_code == 200:
                if isinstance(data, list) or (isinstance(data, dict) and 'shares' in data):
                    shares = data if isinstance(data, list) else data.get('shares', [])
                    
                    # Check if our created share appears in the list
                    if self.share_id:
                        share_found = any(share.get('share_id') == self.share_id for share in shares)
                        if share_found:
                            success = True
                            print(f"   Found {len(shares)} shares including our created share")
                            
                            # Check if shares have views and taps
                            for share in shares:
                                if share.get('share_id') == self.share_id:
                                    print(f"   Our share - Views: {share.get('views', 0)}, Taps: {share.get('taps', 0)}")
                                    break
                        else:
                            error_msg = f"Created share {self.share_id} not found in my-shares list"
                    else:
                        success = True  # If no share_id, just check the endpoint works
                        print(f"   Found {len(shares)} shares")
                else:
                    error_msg = "Invalid response format"
            else:
                error_msg = f"Expected status 200, got {response.status_code}"
                
            self.log_test("Get My Shares", success, response.status_code, data, error_msg)
            return success
            
        except Exception as e:
            self.log_test("Get My Shares", False, 0, {}, str(e))
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting ARENAKORE Social Engine Backend API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"👤 Admin: {ADMIN_EMAIL}")
        print("=" * 60)
        print()
        
        # Test sequence as specified in review request
        tests = [
            self.test_admin_login,
            self.test_get_activity_log,
            self.test_generate_social_share,
            self.test_get_public_card,
            self.test_track_cta_tap,
            self.test_get_my_shares
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            else:
                # If a critical test fails, we might want to continue but note the dependency
                if test == self.test_admin_login:
                    print("❌ Critical failure: Admin login failed. Stopping tests.")
                    break
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL SOCIAL ENGINE TESTS PASSED! Backend is working correctly.")
        else:
            print(f"⚠️  {total - passed} tests failed. Check the details above.")
        
        return passed == total

    def print_summary(self):
        """Print detailed test summary"""
        print("\n" + "=" * 60)
        print("📋 DETAILED SOCIAL ENGINE TEST SUMMARY")
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
    tester = SocialEngineAPITester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    sys.exit(0 if success else 1)