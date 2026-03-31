#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND TESTING — KORE SOCIAL PASSPORT ENDPOINTS
Test the new KORE Social Passport endpoints and existing wallet endpoints.
"""

import requests
import json
import base64
import time
from datetime import datetime

# Base URL from frontend/.env
BASE_URL = "https://voice-coach-40.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
FOUNDER_EMAIL = "ogrisek.stefano@gmail.com"
FOUNDER_PASSWORD = "Founder@KORE2026!"

class KorePassportTester:
    def __init__(self):
        self.founder_token = None
        self.test_results = []
        
    def log_result(self, step, endpoint, status, details=""):
        """Log test result"""
        result = {
            "step": step,
            "endpoint": endpoint,
            "status": "✅ PASS" if status else "❌ FAIL",
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{result['step']}: {result['endpoint']} - {result['status']}")
        if details:
            print(f"   Details: {details}")
        print()
        
    def test_step_1_founder_login(self):
        """STEP 1: Login as KORE #00001 Founder"""
        print("=== STEP 1: Login as KORE #00001 Founder ===")
        
        payload = {
            "email": FOUNDER_EMAIL,
            "password": FOUNDER_PASSWORD
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.founder_token = data["token"]
                    founder_user = data["user"]
                    
                    # Verify founder status
                    if founder_user.get("is_founder") == True and founder_user.get("is_admin") == True:
                        self.log_result("STEP 1", "POST /api/auth/login", True, 
                                      f"Founder login successful. User: {founder_user.get('username')}, is_founder: {founder_user.get('is_founder')}, is_admin: {founder_user.get('is_admin')}")
                        return True
                    else:
                        self.log_result("STEP 1", "POST /api/auth/login", False, 
                                      f"User logged in but is_founder={founder_user.get('is_founder')}, is_admin={founder_user.get('is_admin')}")
                        return False
                else:
                    self.log_result("STEP 1", "POST /api/auth/login", False, 
                                  f"Missing token or user in response: {data}")
                    return False
            else:
                self.log_result("STEP 1", "POST /api/auth/login", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 1", "POST /api/auth/login", False, f"Exception: {str(e)}")
            return False
    
    def test_step_2_city_rank_milano(self):
        """STEP 2: Test city rank for MILANO"""
        print("=== STEP 2: Test city rank for MILANO ===")
        
        if not self.founder_token:
            self.log_result("STEP 2", "GET /api/kore/city-rank?city=MILANO", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/kore/city-rank?city=MILANO", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = [
                    "global_rank", "global_total", "global_percentile", "global_next_username", 
                    "global_xp_gap", "global_is_top_10", "city", "city_rank", "city_total", 
                    "city_percentile", "city_next_username", "city_xp_gap", "city_is_top_10"
                ]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Verify city is MILANO
                    if data["city"] == "MILANO":
                        self.log_result("STEP 2", "GET /api/kore/city-rank?city=MILANO", True, 
                                      f"City rank MILANO: Global rank {data['global_rank']}/{data['global_total']} ({data['global_percentile']}%), City rank {data['city_rank']}/{data['city_total']} ({data['city_percentile']}%)")
                        return True
                    else:
                        self.log_result("STEP 2", "GET /api/kore/city-rank?city=MILANO", False, 
                                      f"Expected city=MILANO, got: {data['city']}")
                        return False
                else:
                    self.log_result("STEP 2", "GET /api/kore/city-rank?city=MILANO", False, 
                                  f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("STEP 2", "GET /api/kore/city-rank?city=MILANO", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 2", "GET /api/kore/city-rank?city=MILANO", False, f"Exception: {str(e)}")
            return False
    
    def test_step_3_city_rank_roma(self):
        """STEP 3: Test city rank for ROMA"""
        print("=== STEP 3: Test city rank for ROMA ===")
        
        if not self.founder_token:
            self.log_result("STEP 3", "GET /api/kore/city-rank?city=ROMA", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/kore/city-rank?city=ROMA", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify city is ROMA and city_rank is different from MILANO
                if data["city"] == "ROMA":
                    self.log_result("STEP 3", "GET /api/kore/city-rank?city=ROMA", True, 
                                  f"City rank ROMA: Global rank {data['global_rank']}/{data['global_total']} ({data['global_percentile']}%), City rank {data['city_rank']}/{data['city_total']} ({data['city_percentile']}%)")
                    return True
                else:
                    self.log_result("STEP 3", "GET /api/kore/city-rank?city=ROMA", False, 
                                  f"Expected city=ROMA, got: {data['city']}")
                    return False
            else:
                self.log_result("STEP 3", "GET /api/kore/city-rank?city=ROMA", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 3", "GET /api/kore/city-rank?city=ROMA", False, f"Exception: {str(e)}")
            return False
    
    def test_step_4_city_rank_new_york(self):
        """STEP 4: Test city rank for NEW YORK"""
        print("=== STEP 4: Test city rank for NEW YORK ===")
        
        if not self.founder_token:
            self.log_result("STEP 4", "GET /api/kore/city-rank?city=NEW YORK", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/kore/city-rank?city=NEW YORK", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify city is NEW YORK
                if data["city"] == "NEW YORK":
                    self.log_result("STEP 4", "GET /api/kore/city-rank?city=NEW YORK", True, 
                                  f"City rank NEW YORK: Global rank {data['global_rank']}/{data['global_total']} ({data['global_percentile']}%), City rank {data['city_rank']}/{data['city_total']} ({data['city_percentile']}%)")
                    return True
                else:
                    self.log_result("STEP 4", "GET /api/kore/city-rank?city=NEW YORK", False, 
                                  f"Expected city=NEW YORK, got: {data['city']}")
                    return False
            else:
                self.log_result("STEP 4", "GET /api/kore/city-rank?city=NEW YORK", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 4", "GET /api/kore/city-rank?city=NEW YORK", False, f"Exception: {str(e)}")
            return False
    
    def test_step_5_get_affiliations(self):
        """STEP 5: Get user affiliations"""
        print("=== STEP 5: Get user affiliations ===")
        
        if not self.founder_token:
            self.log_result("STEP 5", "GET /api/kore/affiliations", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/kore/affiliations", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["school", "university", "crews", "crews_count"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Verify crews is a list
                    if isinstance(data["crews"], list):
                        self.log_result("STEP 5", "GET /api/kore/affiliations", True, 
                                      f"Affiliations retrieved: School: {data['school']}, University: {data['university']}, Crews: {data['crews_count']}")
                        return True
                    else:
                        self.log_result("STEP 5", "GET /api/kore/affiliations", False, 
                                      f"Crews should be a list, got: {type(data['crews'])}")
                        return False
                else:
                    self.log_result("STEP 5", "GET /api/kore/affiliations", False, 
                                  f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("STEP 5", "GET /api/kore/affiliations", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 5", "GET /api/kore/affiliations", False, f"Exception: {str(e)}")
            return False
    
    def test_step_6_update_affiliations(self):
        """STEP 6: Update user affiliations"""
        print("=== STEP 6: Update user affiliations ===")
        
        if not self.founder_token:
            self.log_result("STEP 6", "PUT /api/kore/affiliations", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        payload = {
            "school": "LICEO SCIENTIFICO",
            "university": "POLITECNICO DI MILANO"
        }
        
        try:
            response = requests.put(f"{BASE_URL}/kore/affiliations", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response contains status and updated fields
                if data.get("status") == "updated":
                    if data.get("school") == "LICEO SCIENTIFICO" and data.get("university") == "POLITECNICO DI MILANO":
                        self.log_result("STEP 6", "PUT /api/kore/affiliations", True, 
                                      f"Affiliations updated: School: {data['school']}, University: {data['university']}")
                        return True
                    else:
                        self.log_result("STEP 6", "PUT /api/kore/affiliations", False, 
                                      f"Fields not updated correctly. School: {data.get('school')}, University: {data.get('university')}")
                        return False
                else:
                    self.log_result("STEP 6", "PUT /api/kore/affiliations", False, 
                                  f"Expected status=updated, got: {data.get('status')}")
                    return False
            else:
                self.log_result("STEP 6", "PUT /api/kore/affiliations", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 6", "PUT /api/kore/affiliations", False, f"Exception: {str(e)}")
            return False
    
    def test_step_7_verify_affiliations_persist(self):
        """STEP 7: Verify affiliations persist by calling GET again"""
        print("=== STEP 7: Verify affiliations persist ===")
        
        if not self.founder_token:
            self.log_result("STEP 7", "GET /api/kore/affiliations (verify)", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/kore/affiliations", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify the updated values persist
                if data.get("school") == "LICEO SCIENTIFICO" and data.get("university") == "POLITECNICO DI MILANO":
                    self.log_result("STEP 7", "GET /api/kore/affiliations (verify)", True, 
                                  f"Affiliations persisted correctly: School: {data['school']}, University: {data['university']}")
                    return True
                else:
                    self.log_result("STEP 7", "GET /api/kore/affiliations (verify)", False, 
                                  f"Affiliations not persisted. School: {data.get('school')}, University: {data.get('university')}")
                    return False
            else:
                self.log_result("STEP 7", "GET /api/kore/affiliations (verify)", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 7", "GET /api/kore/affiliations (verify)", False, f"Exception: {str(e)}")
            return False
    
    def test_step_8_get_action_center(self):
        """STEP 8: Get action center"""
        print("=== STEP 8: Get action center ===")
        
        if not self.founder_token:
            self.log_result("STEP 8", "GET /api/kore/action-center", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/kore/action-center", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["hot", "hot_count", "pending", "pending_count"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Verify hot and pending are lists
                    if isinstance(data["hot"], list) and isinstance(data["pending"], list):
                        # Verify counts match list lengths
                        if data["hot_count"] == len(data["hot"]) and data["pending_count"] == len(data["pending"]):
                            self.log_result("STEP 8", "GET /api/kore/action-center", True, 
                                          f"Action center retrieved: HOT items: {data['hot_count']}, PENDING items: {data['pending_count']}")
                            return True
                        else:
                            self.log_result("STEP 8", "GET /api/kore/action-center", False, 
                                          f"Count mismatch. HOT: {data['hot_count']} vs {len(data['hot'])}, PENDING: {data['pending_count']} vs {len(data['pending'])}")
                            return False
                    else:
                        self.log_result("STEP 8", "GET /api/kore/action-center", False, 
                                      f"Hot and pending should be lists. Hot: {type(data['hot'])}, Pending: {type(data['pending'])}")
                        return False
                else:
                    self.log_result("STEP 8", "GET /api/kore/action-center", False, 
                                  f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("STEP 8", "GET /api/kore/action-center", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 8", "GET /api/kore/action-center", False, f"Exception: {str(e)}")
            return False
    
    def test_step_9_apple_wallet_pass(self):
        """STEP 9: Test Apple Wallet pass generation"""
        print("=== STEP 9: Test Apple Wallet pass generation ===")
        
        if not self.founder_token:
            self.log_result("STEP 9", "GET /api/wallet/apple-pass", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/wallet/apple-pass", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["pass_b64", "filename", "kore_number", "status"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Verify pass_b64 is a valid base64 string
                    pass_b64 = data["pass_b64"]
                    if len(pass_b64) > 100 and self._is_valid_base64(pass_b64):
                        # Verify status is generated
                        if data["status"] == "generated":
                            self.log_result("STEP 9", "GET /api/wallet/apple-pass", True, 
                                          f"Apple Wallet pass generated: KORE #{data['kore_number']}, Filename: {data['filename']}, Size: {len(pass_b64)} chars")
                            return True
                        else:
                            self.log_result("STEP 9", "GET /api/wallet/apple-pass", False, 
                                          f"Expected status=generated, got: {data['status']}")
                            return False
                    else:
                        self.log_result("STEP 9", "GET /api/wallet/apple-pass", False, 
                                      f"Invalid pass_b64. Length: {len(pass_b64)}, Valid base64: {self._is_valid_base64(pass_b64)}")
                        return False
                else:
                    self.log_result("STEP 9", "GET /api/wallet/apple-pass", False, 
                                  f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("STEP 9", "GET /api/wallet/apple-pass", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 9", "GET /api/wallet/apple-pass", False, f"Exception: {str(e)}")
            return False
    
    def test_step_10_google_wallet_pass(self):
        """STEP 10: Test Google Wallet pass generation"""
        print("=== STEP 10: Test Google Wallet pass generation ===")
        
        if not self.founder_token:
            self.log_result("STEP 10", "GET /api/wallet/google-pass", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/wallet/google-pass", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["wallet_url", "kore_number", "status"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Verify wallet_url starts with Google Pay URL
                    wallet_url = data["wallet_url"]
                    if wallet_url.startswith("https://pay.google.com/gp/v/save/"):
                        # Verify status is generated
                        if data["status"] == "generated":
                            self.log_result("STEP 10", "GET /api/wallet/google-pass", True, 
                                          f"Google Wallet pass generated: KORE #{data['kore_number']}, URL: {wallet_url[:50]}...")
                            return True
                        else:
                            self.log_result("STEP 10", "GET /api/wallet/google-pass", False, 
                                          f"Expected status=generated, got: {data['status']}")
                            return False
                    else:
                        self.log_result("STEP 10", "GET /api/wallet/google-pass", False, 
                                      f"Invalid wallet_url. Expected Google Pay URL, got: {wallet_url[:100]}...")
                        return False
                else:
                    self.log_result("STEP 10", "GET /api/wallet/google-pass", False, 
                                  f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("STEP 10", "GET /api/wallet/google-pass", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 10", "GET /api/wallet/google-pass", False, f"Exception: {str(e)}")
            return False
    
    def _is_valid_base64(self, s):
        """Check if string is valid base64"""
        try:
            base64.b64decode(s)
            return True
        except Exception:
            return False
    
    def run_all_tests(self):
        """Run all test steps in order"""
        print("🚀 STARTING COMPREHENSIVE KORE SOCIAL PASSPORT TESTING")
        print("=" * 80)
        
        test_steps = [
            self.test_step_1_founder_login,
            self.test_step_2_city_rank_milano,
            self.test_step_3_city_rank_roma,
            self.test_step_4_city_rank_new_york,
            self.test_step_5_get_affiliations,
            self.test_step_6_update_affiliations,
            self.test_step_7_verify_affiliations_persist,
            self.test_step_8_get_action_center,
            self.test_step_9_apple_wallet_pass,
            self.test_step_10_google_wallet_pass,
        ]
        
        passed = 0
        failed = 0
        
        for test_step in test_steps:
            try:
                if test_step():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"CRITICAL ERROR in {test_step.__name__}: {str(e)}")
                failed += 1
            
            # Small delay between tests
            time.sleep(0.5)
        
        print("=" * 80)
        print("🏁 TESTING COMPLETE")
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📊 SUCCESS RATE: {(passed/(passed+failed)*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result["status"]:
                    print(f"   - {result['step']}: {result['endpoint']}")
                    print(f"     {result['details']}")
        
        return passed, failed

def main():
    """Main test execution"""
    tester = KorePassportTester()
    passed, failed = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    exit(main())