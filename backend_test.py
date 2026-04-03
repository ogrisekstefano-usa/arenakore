#!/usr/bin/env python3
"""
QR KORE CROSS-CHECK ENGINE Testing
Testing the QR challenge creation, validation, and peer confirmation system
"""

import requests
import json
import time
from datetime import datetime

# Base URL from frontend .env
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"

# Test credentials from review request
TEST_USERS = {
    "user_a": {
        "email": "ogrisek.stefano@gmail.com",
        "password": "Founder@KORE2026!",
        "role": "Creator"
    },
    "user_b": {
        "email": "d.rose@chicago.kore", 
        "password": "Seed@Chicago1",
        "role": "Validator 1"
    },
    "user_c": {
        "email": "demo.owner@arenakore.app",
        "password": "Demo@GymOwner2026!",
        "role": "Validator 2"
    }
}

class QRTestEngine:
    def __init__(self):
        self.tokens = {}
        self.challenge_data = {}
        self.session = requests.Session()
        
    def log(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def login_user(self, user_key):
        """Login a user and store their token"""
        user = TEST_USERS[user_key]
        self.log(f"🔐 Logging in {user['role']} ({user['email']})")
        
        response = self.session.post(f"{BASE_URL}/auth/login", json={
            "email": user["email"],
            "password": user["password"]
        })
        
        if response.status_code == 200:
            data = response.json()
            self.tokens[user_key] = data["token"]
            self.log(f"✅ Login successful for {user['role']}")
            return True
        else:
            self.log(f"❌ Login failed for {user['role']}: {response.status_code} - {response.text}")
            return False
            
    def get_headers(self, user_key):
        """Get authorization headers for a user"""
        return {"Authorization": f"Bearer {self.tokens[user_key]}"}
        
    def scenario_1_create_qr_challenge(self):
        """SCENARIO 1: Create QR Challenge + Generate QR"""
        self.log("\n🎯 SCENARIO 1: Create QR Challenge + Generate QR")
        
        # Step 1: Login as User A
        if not self.login_user("user_a"):
            return False
            
        # Step 2: Create QR Challenge
        self.log("📝 Creating QR Challenge...")
        challenge_data = {
            "title": "QR TEST SQUAD",
            "exercise_type": "squat",
            "tags": ["POWER"],
            "challenge_type": "CLOSED_LIVE",
            "total_participants": 3
        }
        
        response = self.session.post(
            f"{BASE_URL}/qr/create-challenge",
            json=challenge_data,
            headers=self.get_headers("user_a")
        )
        
        if response.status_code != 200:
            self.log(f"❌ Challenge creation failed: {response.status_code} - {response.text}")
            return False
            
        challenge_result = response.json()
        self.challenge_data["challenge_id"] = challenge_result["challenge_id"]
        self.challenge_data["join_code"] = challenge_result["join_code"]
        self.challenge_data["threshold"] = challenge_result["threshold"]
        
        self.log(f"✅ Challenge created:")
        self.log(f"   - Challenge ID: {challenge_result['challenge_id']}")
        self.log(f"   - Join Code: {challenge_result['join_code']} (6 digits)")
        self.log(f"   - Threshold: {challenge_result['threshold']} (50%+1 of 2 others)")
        
        # Verify threshold calculation (50%+1 of 2 others = 2)
        expected_threshold = 2  # floor(2 * 0.5) + 1 = 2
        if challenge_result["threshold"] != expected_threshold:
            self.log(f"❌ Threshold mismatch: expected {expected_threshold}, got {challenge_result['threshold']}")
            return False
            
        # Step 3: Generate QR
        self.log("🔗 Generating QR validation...")
        qr_data = {
            "challenge_id": self.challenge_data["challenge_id"],
            "declared_reps": 15,
            "declared_seconds": 45,
            "declared_kg": 20,
            "total_participants": 3,
            "challenge_type": "CLOSED_LIVE"
        }
        
        response = self.session.post(
            f"{BASE_URL}/qr/generate",
            json=qr_data,
            headers=self.get_headers("user_a")
        )
        
        if response.status_code != 200:
            self.log(f"❌ QR generation failed: {response.status_code} - {response.text}")
            return False
            
        qr_result = response.json()
        self.challenge_data["qr_token"] = qr_result["qr_token"]
        self.challenge_data["pin_code"] = qr_result["pin_code"]
        
        self.log(f"✅ QR generated:")
        self.log(f"   - QR Token: {qr_result['qr_token'][:20]}... (base64 string)")
        self.log(f"   - PIN Code: {qr_result['pin_code']} (6 digits)")
        self.log(f"   - Status: {qr_result['status']}")
        self.log(f"   - Confirmations: {qr_result['confirmations']}")
        self.log(f"   - Threshold: {qr_result['threshold']}")
        
        # Step 4: Check initial status
        self.log("📊 Checking initial QR status...")
        response = self.session.get(
            f"{BASE_URL}/qr/status/{self.challenge_data['challenge_id']}",
            headers=self.get_headers("user_a")
        )
        
        if response.status_code != 200:
            self.log(f"❌ Status check failed: {response.status_code} - {response.text}")
            return False
            
        status_result = response.json()
        self.log(f"✅ Initial status:")
        self.log(f"   - Status: {status_result['status']}")
        self.log(f"   - Confirmations: {status_result['confirmations']}")
        self.log(f"   - Threshold: {status_result['threshold']}")
        self.log(f"   - Remaining seconds: {status_result['remaining_seconds']}")
        
        return True
        
    def scenario_2_first_peer_validation(self):
        """SCENARIO 2: First Peer Validation (+5 FLUX reward)"""
        self.log("\n🎯 SCENARIO 2: First Peer Validation (+5 FLUX reward)")
        
        # Step 1: Login as User B
        if not self.login_user("user_b"):
            return False
            
        # Step 2: Validate QR using PIN code
        self.log("🔍 User B validating QR...")
        validate_data = {
            "pin_code": self.challenge_data["pin_code"]
        }
        
        response = self.session.post(
            f"{BASE_URL}/qr/validate",
            json=validate_data,
            headers=self.get_headers("user_b")
        )
        
        if response.status_code != 200:
            self.log(f"❌ Validation failed: {response.status_code} - {response.text}")
            return False
            
        validation_result = response.json()
        self.log(f"✅ First validation completed:")
        self.log(f"   - Status: {validation_result['status']}")
        self.log(f"   - Scanner FLUX reward: {validation_result['scanner_flux_reward']}")
        self.log(f"   - Target status: {validation_result['target_status']}")
        self.log(f"   - Confirmations: {validation_result['confirmations']}")
        self.log(f"   - Target official: {validation_result['target_official']}")
        
        # Verify expected results
        if validation_result["scanner_flux_reward"] != 5:
            self.log(f"❌ Scanner FLUX reward mismatch: expected 5, got {validation_result['scanner_flux_reward']}")
            return False
            
        if validation_result["target_status"] != "provisional":
            self.log(f"❌ Target status should still be 'provisional' (only 1/2), got {validation_result['target_status']}")
            return False
            
        # Step 3: Verify User B got +5 FLUX
        self.log("💰 Checking User B's FLUX balance...")
        response = self.session.get(
            f"{BASE_URL}/auth/me",
            headers=self.get_headers("user_b")
        )
        
        if response.status_code == 200:
            user_data = response.json()
            scanner_balance = user_data.get("scanner_balance", 0)
            self.log(f"✅ User B scanner balance: {scanner_balance} FLUX")
        else:
            self.log(f"⚠️ Could not verify User B balance: {response.status_code}")
            
        return True
        
    def scenario_3_second_peer_validation(self):
        """SCENARIO 3: Second Peer Validation → OFFICIAL status"""
        self.log("\n🎯 SCENARIO 3: Second Peer Validation → OFFICIAL status")
        
        # Step 1: Login as User C
        if not self.login_user("user_c"):
            return False
            
        # Step 2: Validate QR using same PIN code
        self.log("🔍 User C validating QR (reaching threshold)...")
        validate_data = {
            "pin_code": self.challenge_data["pin_code"]
        }
        
        response = self.session.post(
            f"{BASE_URL}/qr/validate",
            json=validate_data,
            headers=self.get_headers("user_c")
        )
        
        if response.status_code != 200:
            self.log(f"❌ Second validation failed: {response.status_code} - {response.text}")
            return False
            
        validation_result = response.json()
        self.log(f"✅ Second validation completed:")
        self.log(f"   - Status: {validation_result['status']}")
        self.log(f"   - Target status: {validation_result['target_status']}")
        self.log(f"   - Confirmations: {validation_result['confirmations']}")
        self.log(f"   - Target official: {validation_result['target_official']}")
        self.log(f"   - Target FLUX awarded: {validation_result['target_flux_awarded']}")
        
        # Verify expected results (2/2 reached!)
        if validation_result["target_status"] != "official":
            self.log(f"❌ Target status should be 'official' (2/2 reached), got {validation_result['target_status']}")
            return False
            
        if not validation_result["target_official"]:
            self.log(f"❌ Target should be official now")
            return False
            
        if not validation_result["target_flux_awarded"]:
            self.log(f"❌ Target FLUX should be awarded now")
            return False
            
        return True
        
    def scenario_4_status_check_after_official(self):
        """SCENARIO 4: Status Check After Official"""
        self.log("\n🎯 SCENARIO 4: Status Check After Official")
        
        # Step 1: Login as User A again
        self.log("🔐 User A checking final status...")
        
        response = self.session.get(
            f"{BASE_URL}/qr/status/{self.challenge_data['challenge_id']}",
            headers=self.get_headers("user_a")
        )
        
        if response.status_code != 200:
            self.log(f"❌ Final status check failed: {response.status_code} - {response.text}")
            return False
            
        status_result = response.json()
        self.log(f"✅ Final status:")
        self.log(f"   - Status: {status_result['status']}")
        self.log(f"   - Confirmations: {status_result['confirmations']}")
        self.log(f"   - Threshold: {status_result['threshold']}")
        self.log(f"   - FLUX earned: {status_result['flux_earned']}")
        
        # Verify expected results
        if status_result["status"] != "official":
            self.log(f"❌ Status should be 'official', got {status_result['status']}")
            return False
            
        if status_result["confirmations"] != 2:
            self.log(f"❌ Confirmations should be 2, got {status_result['confirmations']}")
            return False
            
        if status_result["flux_earned"] <= 0:
            self.log(f"❌ FLUX earned should be > 0, got {status_result['flux_earned']}")
            return False
            
        return True
        
    def scenario_5_edge_cases(self):
        """SCENARIO 5: Edge Cases"""
        self.log("\n🎯 SCENARIO 5: Edge Cases")
        
        # Create a new QR challenge for edge case testing since the previous one is now official
        self.log("📝 Creating new QR Challenge for edge case testing...")
        challenge_data = {
            "title": "QR EDGE CASE TEST",
            "exercise_type": "squat",
            "tags": ["POWER"],
            "challenge_type": "CLOSED_LIVE",
            "total_participants": 3
        }
        
        response = self.session.post(
            f"{BASE_URL}/qr/create-challenge",
            json=challenge_data,
            headers=self.get_headers("user_a")
        )
        
        if response.status_code != 200:
            self.log(f"❌ Edge case challenge creation failed: {response.status_code} - {response.text}")
            return False
            
        edge_challenge = response.json()
        edge_challenge_id = edge_challenge["challenge_id"]
        
        # Generate QR for edge case testing
        qr_data = {
            "challenge_id": edge_challenge_id,
            "declared_reps": 10,
            "declared_seconds": 30,
            "declared_kg": 15,
            "total_participants": 3,
            "challenge_type": "CLOSED_LIVE"
        }
        
        response = self.session.post(
            f"{BASE_URL}/qr/generate",
            json=qr_data,
            headers=self.get_headers("user_a")
        )
        
        if response.status_code != 200:
            self.log(f"❌ Edge case QR generation failed: {response.status_code} - {response.text}")
            return False
            
        edge_qr = response.json()
        edge_pin_code = edge_qr["pin_code"]
        
        # Test 1: User A tries to validate own PIN
        self.log("🚫 Testing self-validation (should fail)...")
        validate_data = {
            "pin_code": edge_pin_code
        }
        
        response = self.session.post(
            f"{BASE_URL}/qr/validate",
            json=validate_data,
            headers=self.get_headers("user_a")
        )
        
        if response.status_code == 400:
            error_msg = response.json().get("detail", "")
            if "Non puoi confermare te stesso" in error_msg:
                self.log("✅ Self-validation correctly blocked")
            else:
                self.log(f"❌ Wrong error message: {error_msg}")
                return False
        else:
            self.log(f"❌ Self-validation should return 400, got {response.status_code} - {response.text}")
            return False
            
        # Test 2: User B validates the new PIN first
        self.log("🔍 User B validating new QR first...")
        response = self.session.post(
            f"{BASE_URL}/qr/validate",
            json=validate_data,
            headers=self.get_headers("user_b")
        )
        
        if response.status_code != 200:
            self.log(f"❌ User B validation failed: {response.status_code} - {response.text}")
            return False
            
        # Test 3: User B tries to validate same PIN again (duplicate validation)
        self.log("🚫 Testing duplicate validation (should fail)...")
        
        response = self.session.post(
            f"{BASE_URL}/qr/validate",
            json=validate_data,
            headers=self.get_headers("user_b")
        )
        
        if response.status_code == 400:
            error_msg = response.json().get("detail", "")
            if "Hai già confermato" in error_msg:
                self.log("✅ Duplicate validation correctly blocked")
            else:
                self.log(f"❌ Wrong error message: {error_msg}")
                return False
        else:
            self.log(f"❌ Duplicate validation should return 400, got {response.status_code} - {response.text}")
            return False
            
        return True
        
    def run_all_scenarios(self):
        """Run all QR KORE CROSS-CHECK ENGINE test scenarios"""
        self.log("🚀 Starting QR KORE CROSS-CHECK ENGINE Testing")
        self.log("=" * 60)
        
        scenarios = [
            ("SCENARIO 1", self.scenario_1_create_qr_challenge),
            ("SCENARIO 2", self.scenario_2_first_peer_validation),
            ("SCENARIO 3", self.scenario_3_second_peer_validation),
            ("SCENARIO 4", self.scenario_4_status_check_after_official),
            ("SCENARIO 5", self.scenario_5_edge_cases),
        ]
        
        results = {}
        
        for scenario_name, scenario_func in scenarios:
            try:
                result = scenario_func()
                results[scenario_name] = result
                if result:
                    self.log(f"✅ {scenario_name} PASSED")
                else:
                    self.log(f"❌ {scenario_name} FAILED")
            except Exception as e:
                self.log(f"💥 {scenario_name} ERROR: {str(e)}")
                results[scenario_name] = False
                
            self.log("-" * 40)
            
        # Summary
        self.log("\n📊 TEST SUMMARY")
        self.log("=" * 60)
        passed = sum(1 for r in results.values() if r)
        total = len(results)
        
        for scenario, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{scenario}: {status}")
            
        self.log(f"\nOVERALL: {passed}/{total} scenarios passed")
        
        if passed == total:
            self.log("🎉 ALL QR KORE CROSS-CHECK ENGINE TESTS PASSED!")
            return True
        else:
            self.log("⚠️ Some tests failed - see details above")
            return False

if __name__ == "__main__":
    engine = QRTestEngine()
    success = engine.run_all_scenarios()
    exit(0 if success else 1)