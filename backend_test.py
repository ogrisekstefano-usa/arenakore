#!/usr/bin/env python3
"""
ARENAKORE Trust Engine Backend Testing
Testing the 3 specific scenarios as requested:
1. Pre-flight Sanity Check
2. Complete Challenge with Verification Status  
3. Peer Confirmation

Test credentials:
- Primary: ogrisek.stefano@gmail.com / Founder@KORE2026!
- Secondary: d.rose@chicago.kore / Seed@Chicago1
"""

import requests
import json
import sys
from typing import Dict, Any

# Backend URL from frontend/.env
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"

# Test credentials
PRIMARY_USER = {
    "email": "ogrisek.stefano@gmail.com", 
    "password": "Founder@KORE2026!"
}

SECONDARY_USER = {
    "email": "d.rose@chicago.kore",
    "password": "Seed@Chicago1"
}

class TrustEngineTest:
    def __init__(self):
        self.session = requests.Session()
        self.primary_token = None
        self.secondary_token = None
        self.challenge_ids = []
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def login_user(self, credentials: Dict[str, str], user_type: str = "primary") -> str:
        """Login user and return token"""
        self.log(f"🔐 Logging in {user_type} user: {credentials['email']}")
        
        response = self.session.post(
            f"{BASE_URL}/auth/login",
            json=credentials,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            self.log(f"❌ Login failed for {user_type} user: {response.status_code} - {response.text}", "ERROR")
            return None
            
        data = response.json()
        token = data.get("token")
        user_info = data.get("user", {})
        
        self.log(f"✅ Login successful for {user_type} user")
        self.log(f"   User ID: {user_info.get('id', 'N/A')}")
        self.log(f"   Username: {user_info.get('username', 'N/A')}")
        self.log(f"   Is Admin: {user_info.get('is_admin', False)}")
        self.log(f"   Is Founder: {user_info.get('is_founder', False)}")
        
        return token
        
    def make_authenticated_request(self, method: str, endpoint: str, token: str, data: Dict = None) -> requests.Response:
        """Make authenticated request"""
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        url = f"{BASE_URL}{endpoint}"
        
        if method.upper() == "GET":
            return self.session.get(url, headers=headers)
        elif method.upper() == "POST":
            return self.session.post(url, json=data, headers=headers)
        elif method.upper() == "PUT":
            return self.session.put(url, json=data, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")
    
    def test_scenario_1_sanity_check(self):
        """SCENARIO 1: Pre-flight Sanity Check"""
        self.log("\n" + "="*60)
        self.log("🧪 SCENARIO 1: Pre-flight Sanity Check")
        self.log("="*60)
        
        if not self.primary_token:
            self.log("❌ No primary token available", "ERROR")
            return False
            
        # Test 1: Exceeds world record (should fail)
        self.log("\n📋 Test 1.1: Sanity check with excessive reps (500 squats)")
        test_data = {
            "exercise_type": "squat",
            "reps": 500,
            "seconds": 0,
            "kg": 0
        }
        
        response = self.make_authenticated_request("POST", "/challenge/sanity-check", self.primary_token, test_data)
        
        if response.status_code != 200:
            self.log(f"❌ Sanity check failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        result = response.json()
        self.log(f"📊 Response: {json.dumps(result, indent=2)}")
        
        # Verify expected results
        expected_passed = False
        expected_requires_video = True
        expected_flag = "EXCEEDS_WORLD_RECORD_REPS"
        
        if result.get("passed") != expected_passed:
            self.log(f"❌ Expected passed={expected_passed}, got {result.get('passed')}", "ERROR")
            return False
            
        if result.get("requires_video") != expected_requires_video:
            self.log(f"❌ Expected requires_video={expected_requires_video}, got {result.get('requires_video')}", "ERROR")
            return False
            
        if expected_flag not in result.get("flags", []):
            self.log(f"❌ Expected flag '{expected_flag}' not found in {result.get('flags')}", "ERROR")
            return False
            
        self.log("✅ Test 1.1 PASSED: Excessive reps correctly flagged")
        
        # Test 2: Normal values (should pass)
        self.log("\n📋 Test 1.2: Sanity check with normal values")
        test_data = {
            "exercise_type": "squat",
            "reps": 10,
            "seconds": 30,
            "kg": 20
        }
        
        response = self.make_authenticated_request("POST", "/challenge/sanity-check", self.primary_token, test_data)
        
        if response.status_code != 200:
            self.log(f"❌ Sanity check failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        result = response.json()
        self.log(f"📊 Response: {json.dumps(result, indent=2)}")
        
        # Verify expected results
        expected_passed = True
        expected_requires_video = False
        
        if result.get("passed") != expected_passed:
            self.log(f"❌ Expected passed={expected_passed}, got {result.get('passed')}", "ERROR")
            return False
            
        if result.get("requires_video") != expected_requires_video:
            self.log(f"❌ Expected requires_video={expected_requires_video}, got {result.get('requires_video')}", "ERROR")
            return False
            
        if result.get("flags"):
            self.log(f"❌ Expected empty flags, got {result.get('flags')}", "ERROR")
            return False
            
        self.log("✅ Test 1.2 PASSED: Normal values correctly validated")
        self.log("✅ SCENARIO 1 COMPLETED SUCCESSFULLY")
        return True
        
    def test_scenario_2_challenge_verification(self):
        """SCENARIO 2: Complete Challenge with Verification Status"""
        self.log("\n" + "="*60)
        self.log("🧪 SCENARIO 2: Complete Challenge with Verification Status")
        self.log("="*60)
        
        if not self.primary_token:
            self.log("❌ No primary token available", "ERROR")
            return False
            
        # Test 1: Create and complete challenge with MANUAL_ENTRY (no video)
        self.log("\n📋 Test 2.1: Create TRUST TEST MANUAL challenge")
        challenge_data = {
            "title": "TRUST TEST MANUAL",
            "exercise_type": "squat",
            "tags": ["POWER"],
            "validation_mode": "MANUAL_ENTRY",
            "mode": "personal"
        }
        
        response = self.make_authenticated_request("POST", "/challenge/create", self.primary_token, challenge_data)
        
        if response.status_code != 200:
            self.log(f"❌ Challenge creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        result = response.json()
        challenge_id_1 = result.get("challenge_id")
        self.log(f"✅ Challenge created with ID: {challenge_id_1}")
        self.challenge_ids.append(challenge_id_1)
        
        # Complete the challenge
        self.log("\n📋 Test 2.2: Complete challenge without video proof")
        complete_data = {
            "challenge_id": challenge_id_1,
            "validation_mode": "MANUAL_ENTRY",
            "reps": 10,
            "seconds": 30,
            "kg": 20,
            "quality_score": 80,
            "has_video_proof": False,
            "proof_type": "NONE"
        }
        
        response = self.make_authenticated_request("POST", "/challenge/complete", self.primary_token, complete_data)
        
        if response.status_code != 200:
            self.log(f"❌ Challenge completion failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        result = response.json()
        self.log(f"📊 Completion Response: {json.dumps(result, indent=2)}")
        
        # Verify expected results
        verdict = result.get("verdict", {})
        expected_verification_status = "UNVERIFIED"
        expected_proof_type = "NONE"
        expected_flux_multiplier = 0.5
        
        if verdict.get("verification_status") != expected_verification_status:
            self.log(f"❌ Expected verification_status={expected_verification_status}, got {verdict.get('verification_status')}", "ERROR")
            return False
            
        if verdict.get("proof_type") != expected_proof_type:
            self.log(f"❌ Expected proof_type={expected_proof_type}, got {verdict.get('proof_type')}", "ERROR")
            return False
            
        if "integrity_ok" not in verdict:
            self.log("❌ Expected integrity_ok field in verdict", "ERROR")
            return False
            
        if "sanity_check" not in verdict:
            self.log("❌ Expected sanity_check field in verdict", "ERROR")
            return False
            
        # Check flux_multiplier in verdict
        actual_flux_multiplier = verdict.get("flux_multiplier")
        if actual_flux_multiplier != expected_flux_multiplier:
            self.log(f"❌ Expected flux_multiplier={expected_flux_multiplier}, got {actual_flux_multiplier}", "ERROR")
            return False
            
        self.log("✅ Test 2.2 PASSED: Manual entry without video correctly marked as UNVERIFIED")
        
        # Test 3: Create and complete challenge with video proof
        self.log("\n📋 Test 2.3: Create TRUST TEST VIDEO challenge")
        challenge_data = {
            "title": "TRUST TEST VIDEO",
            "exercise_type": "squat",
            "tags": ["FLOW"],
            "validation_mode": "MANUAL_ENTRY",
            "mode": "personal"
        }
        
        response = self.make_authenticated_request("POST", "/challenge/create", self.primary_token, challenge_data)
        
        if response.status_code != 200:
            self.log(f"❌ Challenge creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        result = response.json()
        challenge_id_2 = result.get("challenge_id")
        self.log(f"✅ Challenge created with ID: {challenge_id_2}")
        self.challenge_ids.append(challenge_id_2)
        
        # Complete the challenge with video proof
        self.log("\n📋 Test 2.4: Complete challenge with video proof")
        complete_data = {
            "challenge_id": challenge_id_2,
            "validation_mode": "MANUAL_ENTRY",
            "reps": 15,
            "seconds": 45,
            "kg": 0,
            "quality_score": 85,
            "has_video_proof": True,
            "proof_type": "VIDEO_TIME_CHECK"
        }
        
        response = self.make_authenticated_request("POST", "/challenge/complete", self.primary_token, complete_data)
        
        if response.status_code != 200:
            self.log(f"❌ Challenge completion failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        result = response.json()
        self.log(f"📊 Completion Response: {json.dumps(result, indent=2)}")
        
        # Verify expected results
        verdict = result.get("verdict", {})
        expected_verification_status = "PROOF_PENDING"
        expected_flux_multiplier = 0.75
        
        if verdict.get("verification_status") != expected_verification_status:
            self.log(f"❌ Expected verification_status={expected_verification_status}, got {verdict.get('verification_status')}", "ERROR")
            return False
            
        # Check flux_multiplier in verdict
        actual_flux_multiplier = verdict.get("flux_multiplier")
        if actual_flux_multiplier != expected_flux_multiplier:
            self.log(f"❌ Expected flux_multiplier={expected_flux_multiplier}, got {actual_flux_multiplier}", "ERROR")
            return False
            
        self.log("✅ Test 2.4 PASSED: Manual entry with video correctly marked as PROOF_PENDING")
        self.log("✅ SCENARIO 2 COMPLETED SUCCESSFULLY")
        
        # Store challenge_id_2 for scenario 3
        self.video_challenge_id = challenge_id_2
        return True
        
    def test_scenario_3_peer_confirmation(self):
        """SCENARIO 3: Peer Confirmation"""
        self.log("\n" + "="*60)
        self.log("🧪 SCENARIO 3: Peer Confirmation")
        self.log("="*60)
        
        if not self.primary_token or not hasattr(self, 'video_challenge_id'):
            self.log("❌ Missing prerequisites for scenario 3", "ERROR")
            return False
            
        # Test 1: Confirm the video challenge from scenario 2
        self.log("\n📋 Test 3.1: Peer confirm video challenge (confirmed=true)")
        confirm_data = {
            "challenge_id": self.video_challenge_id,
            "confirmed": True
        }
        
        response = self.make_authenticated_request("POST", "/challenge/peer-confirm", self.primary_token, confirm_data)
        
        if response.status_code != 200:
            self.log(f"❌ Peer confirmation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        result = response.json()
        self.log(f"📊 Confirmation Response: {json.dumps(result, indent=2)}")
        
        # Verify expected results
        expected_verification_status = "AI_VERIFIED"
        
        if result.get("verification_status") != expected_verification_status:
            self.log(f"❌ Expected verification_status={expected_verification_status}, got {result.get('verification_status')}", "ERROR")
            return False
            
        self.log("✅ Test 3.1 PASSED: Peer confirmation correctly updated status to AI_VERIFIED")
        
        # Test 2: Create another challenge and dispute it
        self.log("\n📋 Test 3.2: Create challenge for dispute test")
        challenge_data = {
            "title": "TRUST TEST DISPUTE",
            "exercise_type": "squat",
            "tags": ["PULSE"],
            "validation_mode": "MANUAL_ENTRY",
            "mode": "personal"
        }
        
        response = self.make_authenticated_request("POST", "/challenge/create", self.primary_token, challenge_data)
        
        if response.status_code != 200:
            self.log(f"❌ Challenge creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        result = response.json()
        dispute_challenge_id = result.get("challenge_id")
        self.log(f"✅ Challenge created with ID: {dispute_challenge_id}")
        
        # Complete with peer confirmation proof type
        self.log("\n📋 Test 3.3: Complete challenge with PEER_CONFIRMATION proof")
        complete_data = {
            "challenge_id": dispute_challenge_id,
            "validation_mode": "MANUAL_ENTRY",
            "reps": 20,
            "seconds": 60,
            "kg": 25,
            "quality_score": 90,
            "has_video_proof": False,
            "proof_type": "PEER_CONFIRMATION"
        }
        
        response = self.make_authenticated_request("POST", "/challenge/complete", self.primary_token, complete_data)
        
        if response.status_code != 200:
            self.log(f"❌ Challenge completion failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        result = response.json()
        self.log(f"📊 Completion Response: {json.dumps(result, indent=2)}")
        
        # Verify it's PROOF_PENDING
        verdict = result.get("verdict", {})
        if verdict.get("verification_status") != "PROOF_PENDING":
            self.log(f"❌ Expected PROOF_PENDING, got {verdict.get('verification_status')}", "ERROR")
            return False
            
        # Test 4: Dispute the challenge
        self.log("\n📋 Test 3.4: Peer dispute challenge (confirmed=false)")
        dispute_data = {
            "challenge_id": dispute_challenge_id,
            "confirmed": False
        }
        
        response = self.make_authenticated_request("POST", "/challenge/peer-confirm", self.primary_token, dispute_data)
        
        if response.status_code != 200:
            self.log(f"❌ Peer dispute failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        result = response.json()
        self.log(f"📊 Dispute Response: {json.dumps(result, indent=2)}")
        
        # Verify expected results
        expected_verification_status = "UNVERIFIED"
        
        if result.get("verification_status") != expected_verification_status:
            self.log(f"❌ Expected verification_status={expected_verification_status}, got {result.get('verification_status')}", "ERROR")
            return False
            
        self.log("✅ Test 3.4 PASSED: Peer dispute correctly updated status to UNVERIFIED")
        self.log("✅ SCENARIO 3 COMPLETED SUCCESSFULLY")
        return True
        
    def run_all_tests(self):
        """Run all test scenarios"""
        self.log("🚀 Starting ARENAKORE Trust Engine Backend Testing")
        self.log(f"🌐 Backend URL: {BASE_URL}")
        
        # Login primary user
        self.primary_token = self.login_user(PRIMARY_USER, "primary")
        if not self.primary_token:
            self.log("❌ Failed to login primary user - aborting tests", "ERROR")
            return False
            
        # Try to login secondary user (may not exist)
        self.secondary_token = self.login_user(SECONDARY_USER, "secondary")
        if not self.secondary_token:
            self.log("⚠️ Secondary user login failed - continuing with primary user only", "WARN")
            
        # Run test scenarios
        scenario_1_passed = self.test_scenario_1_sanity_check()
        scenario_2_passed = self.test_scenario_2_challenge_verification()
        scenario_3_passed = self.test_scenario_3_peer_confirmation()
        
        # Summary
        self.log("\n" + "="*60)
        self.log("📊 TRUST ENGINE TEST SUMMARY")
        self.log("="*60)
        self.log(f"✅ Scenario 1 (Sanity Check): {'PASSED' if scenario_1_passed else 'FAILED'}")
        self.log(f"✅ Scenario 2 (Challenge Verification): {'PASSED' if scenario_2_passed else 'FAILED'}")
        self.log(f"✅ Scenario 3 (Peer Confirmation): {'PASSED' if scenario_3_passed else 'FAILED'}")
        
        all_passed = scenario_1_passed and scenario_2_passed and scenario_3_passed
        self.log(f"\n🎯 OVERALL RESULT: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
        
        if self.challenge_ids:
            self.log(f"\n📝 Created Challenge IDs: {', '.join(self.challenge_ids)}")
            
        return all_passed

if __name__ == "__main__":
    tester = TrustEngineTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)