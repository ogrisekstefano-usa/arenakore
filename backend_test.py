#!/usr/bin/env python3
"""
ARENAKORE Challenge Engine Backend Testing
Tests all Challenge Engine endpoints with comprehensive scenarios
"""

import requests
import json
import sys
from typing import Dict, Any

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
TEST_EMAIL = "ogrisek.stefano@gmail.com"
TEST_PASSWORD = "Founder@KORE2026!"

class ChallengeEngineTest:
    def __init__(self):
        self.token = None
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def login(self) -> bool:
        """Login and get authentication token"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                if self.token:
                    self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                    self.log_test("Authentication", True, f"Logged in as {data.get('user', {}).get('username', 'Unknown')}")
                    return True
                else:
                    self.log_test("Authentication", False, "No token in response")
                    return False
            else:
                self.log_test("Authentication", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_create_power_challenge(self) -> str:
        """Test 1: Create challenge with POWER tag and MANUAL_ENTRY mode"""
        try:
            payload = {
                "title": "TEST POWER SQUAT",
                "exercise_type": "squat",
                "tags": ["POWER"],
                "validation_mode": "MANUAL_ENTRY",
                "mode": "personal"
            }
            
            response = self.session.post(f"{BASE_URL}/challenge/create", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                challenge_id = data.get("challenge_id")
                
                # Verify expected fields
                expected_checks = [
                    (data.get("dominant_tag") == "POWER", "dominant_tag should be POWER"),
                    (data.get("dominant_color") == "#FF3B30", "dominant_color should be #FF3B30"),
                    (data.get("ranked_eligible") == False, "ranked_eligible should be false for MANUAL_ENTRY"),
                    (data.get("flux_multiplier") == 0.5, "flux_multiplier should be 0.5 for MANUAL_ENTRY"),
                    (challenge_id is not None, "challenge_id should be present")
                ]
                
                failed_checks = [check[1] for check in expected_checks if not check[0]]
                
                if not failed_checks:
                    self.log_test("Create POWER Challenge", True, f"Challenge ID: {challenge_id}")
                    return challenge_id
                else:
                    self.log_test("Create POWER Challenge", False, f"Failed checks: {', '.join(failed_checks)}")
                    return None
            else:
                self.log_test("Create POWER Challenge", False, f"Status {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            self.log_test("Create POWER Challenge", False, f"Exception: {str(e)}")
            return None
    
    def test_complete_challenge(self, challenge_id: str) -> bool:
        """Test 2: Complete the challenge from step 1"""
        try:
            payload = {
                "challenge_id": challenge_id,
                "validation_mode": "MANUAL_ENTRY",
                "reps": 25,
                "seconds": 60,
                "kg": 20,
                "quality_score": 85,
                "has_video_proof": False
            }
            
            response = self.session.post(f"{BASE_URL}/challenge/complete", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                verdict = data.get("verdict", {})
                
                # Verify expected fields
                expected_checks = [
                    (data.get("status") == "completed", "status should be completed"),
                    (verdict.get("earned_flux") is not None, "earned_flux should be present"),
                    (verdict.get("ranked_eligible") == False, "ranked_eligible should be false"),
                    (verdict.get("anti_cheat_note") is not None, "anti_cheat_note should be present"),
                    ("dna_predictions" in verdict, "dna_predictions should be present"),
                    ("hero_data" in verdict, "hero_data should be present"),
                    ("forza" in verdict.get("dna_predictions", {}), "forza should be in dna_predictions"),
                    ("potenza" in verdict.get("dna_predictions", {}), "potenza should be in dna_predictions")
                ]
                
                failed_checks = [check[1] for check in expected_checks if not check[0]]
                
                if not failed_checks:
                    earned_flux = verdict.get("earned_flux")
                    # Check if earned flux is approximately 50% of base (due to MANUAL_ENTRY multiplier)
                    flux_check = earned_flux > 0 and earned_flux <= 100  # Should be reduced due to 0.5 multiplier
                    if flux_check:
                        self.log_test("Complete Challenge", True, f"Earned FLUX: {earned_flux}, DNA predictions: forza/potenza")
                        return True
                    else:
                        self.log_test("Complete Challenge", False, f"FLUX calculation issue: {earned_flux}")
                        return False
                else:
                    self.log_test("Complete Challenge", False, f"Failed checks: {', '.join(failed_checks)}")
                    return False
            else:
                self.log_test("Complete Challenge", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Complete Challenge", False, f"Exception: {str(e)}")
            return False
    
    def test_create_flow_challenge(self) -> bool:
        """Test 3: Create challenge with FLOW tag and AUTO_COUNT mode"""
        try:
            payload = {
                "title": "FLOW AUTO",
                "exercise_type": "squat",
                "tags": ["FLOW"],
                "validation_mode": "AUTO_COUNT",
                "mode": "ranked"
            }
            
            response = self.session.post(f"{BASE_URL}/challenge/create", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify expected fields
                expected_checks = [
                    (data.get("ranked_eligible") == True, "ranked_eligible should be true for AUTO_COUNT"),
                    (data.get("flux_multiplier") == 1.0, "flux_multiplier should be 1.0 for AUTO_COUNT"),
                    (data.get("dominant_color") == "#00FF87", "dominant_color should be #00FF87 for FLOW"),
                    (data.get("dominant_tag") == "FLOW", "dominant_tag should be FLOW")
                ]
                
                failed_checks = [check[1] for check in expected_checks if not check[0]]
                
                if not failed_checks:
                    self.log_test("Create FLOW Challenge", True, "All AUTO_COUNT properties correct")
                    return True
                else:
                    self.log_test("Create FLOW Challenge", False, f"Failed checks: {', '.join(failed_checks)}")
                    return False
            else:
                self.log_test("Create FLOW Challenge", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create FLOW Challenge", False, f"Exception: {str(e)}")
            return False
    
    def test_validation_empty_tags(self) -> bool:
        """Test 4: Validation - empty tags should return 400 error"""
        try:
            payload = {
                "title": "INVALID",
                "exercise_type": "squat",
                "tags": [],
                "validation_mode": "MANUAL_ENTRY"
            }
            
            response = self.session.post(f"{BASE_URL}/challenge/create", json=payload)
            
            if response.status_code == 400:
                error_text = response.text
                if "Almeno un tag obbligatorio" in error_text:
                    self.log_test("Validation Empty Tags", True, "Correctly rejected empty tags")
                    return True
                else:
                    self.log_test("Validation Empty Tags", False, f"Wrong error message: {error_text}")
                    return False
            else:
                self.log_test("Validation Empty Tags", False, f"Expected 400, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Validation Empty Tags", False, f"Exception: {str(e)}")
            return False
    
    def test_validation_invalid_challenge_id(self) -> bool:
        """Test 5: Validation - invalid challenge_id should return 404 error"""
        try:
            payload = {
                "challenge_id": "000000000000000000000000",
                "validation_mode": "MANUAL_ENTRY",
                "reps": 10
            }
            
            response = self.session.post(f"{BASE_URL}/challenge/complete", json=payload)
            
            if response.status_code == 404:
                error_text = response.text
                if "Sfida non trovata" in error_text:
                    self.log_test("Validation Invalid Challenge ID", True, "Correctly rejected invalid challenge ID")
                    return True
                else:
                    self.log_test("Validation Invalid Challenge ID", False, f"Wrong error message: {error_text}")
                    return False
            else:
                self.log_test("Validation Invalid Challenge ID", False, f"Expected 404, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Validation Invalid Challenge ID", False, f"Exception: {str(e)}")
            return False
    
    def test_get_active_challenges(self) -> bool:
        """Test 6: Get active challenges"""
        try:
            response = self.session.get(f"{BASE_URL}/challenge/user/active")
            
            if response.status_code == 200:
                data = response.json()
                
                if "challenges" in data:
                    challenges = data["challenges"]
                    self.log_test("Get Active Challenges", True, f"Retrieved {len(challenges)} active challenges")
                    return True
                else:
                    self.log_test("Get Active Challenges", False, "Missing 'challenges' field in response")
                    return False
            else:
                self.log_test("Get Active Challenges", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Active Challenges", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all Challenge Engine tests"""
        print("🚀 ARENAKORE Challenge Engine Backend Testing")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        print()
        
        # Step 2: Create POWER challenge
        challenge_id = self.test_create_power_challenge()
        if not challenge_id:
            print("❌ Cannot proceed without valid challenge ID")
            return False
        
        # Step 3: Complete the challenge
        self.test_complete_challenge(challenge_id)
        
        # Step 4: Create FLOW challenge
        self.test_create_flow_challenge()
        
        # Step 5: Test validation - empty tags
        self.test_validation_empty_tags()
        
        # Step 6: Test validation - invalid challenge ID
        self.test_validation_invalid_challenge_id()
        
        # Step 7: Get active challenges
        self.test_get_active_challenges()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
        
        print(f"\n🎯 RESULTS: {passed}/{total} tests passed")
        
        if passed == total:
            print("🏆 ALL TESTS PASSED - Challenge Engine is working correctly!")
            return True
        else:
            print(f"⚠️  {total - passed} tests failed - Issues need attention")
            return False

if __name__ == "__main__":
    tester = ChallengeEngineTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)