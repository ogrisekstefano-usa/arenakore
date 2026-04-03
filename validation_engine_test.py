#!/usr/bin/env python3
"""
ARENAKORE Advanced Validation Engine Testing
Testing the 4 new backend features for biometric correlation, audio analytics, and validation breakdown
"""

import requests
import json
import time
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
TEST_EMAIL = "d.rose@chicago.kore"
TEST_PASSWORD = "Seed@Chicago1"

class ValidationEngineTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_data = None
        
    def login(self, email: str, password: str) -> bool:
        """Login and store authentication token"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": email,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                self.user_data = data.get("user")
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                print(f"✅ Login successful for {email}")
                print(f"   User: {self.user_data.get('username', 'N/A')}")
                print(f"   User ID: {self.user_data.get('id', 'N/A')}")
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def create_challenge(self, title: str, exercise_type: str, tags: List[str], validation_mode: str, mode: str = "personal") -> Optional[str]:
        """Create a challenge and return challenge_id"""
        try:
            payload = {
                "title": title,
                "exercise_type": exercise_type,
                "tags": tags,
                "validation_mode": validation_mode,
                "mode": mode
            }
            
            response = self.session.post(f"{BASE_URL}/challenge/create", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                challenge_id = data.get("challenge_id")
                print(f"✅ Challenge created: {title}")
                print(f"   Challenge ID: {challenge_id}")
                print(f"   Exercise Type: {exercise_type}")
                print(f"   Tags: {tags}")
                print(f"   Validation Mode: {validation_mode}")
                return challenge_id
            else:
                print(f"❌ Challenge creation failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Challenge creation error: {str(e)}")
            return None
    
    def complete_challenge(self, challenge_id: str, **kwargs) -> Optional[Dict]:
        """Complete a challenge with given parameters"""
        try:
            payload = {
                "challenge_id": challenge_id,
                **kwargs
            }
            
            response = self.session.post(f"{BASE_URL}/challenge/complete", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Challenge completed successfully")
                return data
            else:
                print(f"❌ Challenge completion failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Challenge completion error: {str(e)}")
            return None
    
    def get_validation_breakdown(self) -> Optional[Dict]:
        """Get validation breakdown for the user"""
        try:
            response = self.session.get(f"{BASE_URL}/validation/breakdown")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Validation breakdown retrieved successfully")
                return data
            else:
                print(f"❌ Validation breakdown failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Validation breakdown error: {str(e)}")
            return None
    
    def test_scenario_1_suspicious_biometric(self) -> bool:
        """SCENARIO 1: BIOMETRIC CORRELATION — SUSPICIOUS (Speed-BPM Mismatch)"""
        print("\n🔍 SCENARIO 1: BIOMETRIC CORRELATION — SUSPICIOUS (Speed-BPM Mismatch)")
        print("-" * 70)
        
        # Step 1: Create challenge
        challenge_id = self.create_challenge(
            title="SPRINT SUSPICIOUS",
            exercise_type="sprint",
            tags=["PULSE"],
            validation_mode="SENSOR_IMPORT",
            mode="personal"
        )
        
        if not challenge_id:
            return False
        
        # Step 2: Complete challenge with suspicious biometric data
        completion_data = self.complete_challenge(
            challenge_id=challenge_id,
            validation_mode="SENSOR_IMPORT",
            reps=1,
            seconds=9.8,
            quality_score=95,
            speed_kmh=38,
            bpm_avg=68,
            bpm_peak=80,
            intensity_category="HIGH_INTENSITY"
        )
        
        if not completion_data:
            return False
        
        # Step 3: Verify expected results
        verdict = completion_data.get("verdict", {})
        verification_status = verdict.get("verification_status")
        bpm_correlation = verdict.get("bpm_correlation", {})
        flux_multiplier = verdict.get("flux_multiplier")
        
        print(f"   Verification Status: {verification_status}")
        print(f"   BPM Correlation Status: {bpm_correlation.get('status')}")
        print(f"   BPM Correlation Flags: {bpm_correlation.get('flags', [])}")
        print(f"   Flux Multiplier: {flux_multiplier}")
        
        # Expected: verification_status = "SUSPICIOUS", bpm_correlation.status = "SUSPICIOUS", 
        # flags contains "SPEED_BPM_MISMATCH" and "RESTING_BPM_HIGH_INTENSITY", flux_multiplier = 0.25
        expected_verification = verification_status == "SUSPICIOUS"
        expected_bmp_status = bpm_correlation.get("status") == "SUSPICIOUS"
        expected_flags = all(flag in bpm_correlation.get("flags", []) for flag in ["SPEED_BPM_MISMATCH", "RESTING_BPM_HIGH_INTENSITY"])
        expected_flux = flux_multiplier == 0.25
        
        success = expected_verification and expected_bmp_status and expected_flags and expected_flux
        
        if success:
            print("✅ SCENARIO 1 PASSED: All expected values match")
        else:
            print("❌ SCENARIO 1 FAILED: Expected values don't match")
            print(f"   Expected verification_status='SUSPICIOUS', got '{verification_status}'")
            print(f"   Expected bpm_correlation.status='SUSPICIOUS', got '{bpm_correlation.get('status')}'")
            print(f"   Expected flags to contain SPEED_BPM_MISMATCH and RESTING_BPM_HIGH_INTENSITY")
            print(f"   Expected flux_multiplier=0.25, got {flux_multiplier}")
        
        return success
    
    def test_scenario_2_clear_biometric(self) -> bool:
        """SCENARIO 2: BIOMETRIC CORRELATION — CLEAR (Legitimate)"""
        print("\n🔍 SCENARIO 2: BIOMETRIC CORRELATION — CLEAR (Legitimate)")
        print("-" * 70)
        
        # Step 1: Create challenge
        challenge_id = self.create_challenge(
            title="SQUAT CLEAN",
            exercise_type="squat",
            tags=["POWER"],
            validation_mode="SENSOR_IMPORT",
            mode="personal"
        )
        
        if not challenge_id:
            return False
        
        # Step 2: Complete challenge with legitimate biometric data
        completion_data = self.complete_challenge(
            challenge_id=challenge_id,
            validation_mode="SENSOR_IMPORT",
            reps=15,
            seconds=60,
            kg=80,
            quality_score=85,
            bmp_avg=140,
            bmp_peak=165
        )
        
        if not completion_data:
            return False
        
        # Step 3: Verify expected results
        verdict = completion_data.get("verdict", {})
        verification_status = verdict.get("verification_status")
        bpm_correlation = verdict.get("bpm_correlation", {})
        integrity_ok = verdict.get("integrity_ok")
        
        print(f"   Verification Status: {verification_status}")
        print(f"   BPM Correlation Status: {bpm_correlation.get('status')}")
        print(f"   Integrity OK: {integrity_ok}")
        
        # Expected: verification_status = "AI_VERIFIED", bpm_correlation.status = "BPM_CORRELATED" or "CLEAR", integrity_ok = true
        expected_verification = verification_status == "AI_VERIFIED"
        expected_bmp_status = bpm_correlation.get("status") in ["BPM_CORRELATED", "CLEAR"]
        expected_integrity = integrity_ok == True
        
        success = expected_verification and expected_bmp_status and expected_integrity
        
        if success:
            print("✅ SCENARIO 2 PASSED: All expected values match")
        else:
            print("❌ SCENARIO 2 FAILED: Expected values don't match")
            print(f"   Expected verification_status='AI_VERIFIED', got '{verification_status}'")
            print(f"   Expected bpm_correlation.status='BPM_CORRELATED' or 'CLEAR', got '{bpm_correlation.get('status')}'")
            print(f"   Expected integrity_ok=true, got {integrity_ok}")
        
        return success
    
    def test_scenario_3_audio_analytics_impact(self) -> bool:
        """SCENARIO 3: AUDIO ANALYTICS — Impact Exercise with Peaks"""
        print("\n🔍 SCENARIO 3: AUDIO ANALYTICS — Impact Exercise with Peaks")
        print("-" * 70)
        
        # Step 1: Create challenge
        challenge_id = self.create_challenge(
            title="DEADLIFT AUDIO",
            exercise_type="deadlift",
            tags=["POWER"],
            validation_mode="SENSOR_IMPORT",
            mode="personal"
        )
        
        if not challenge_id:
            return False
        
        # Step 2: Complete challenge with audio peaks data
        completion_data = self.complete_challenge(
            challenge_id=challenge_id,
            validation_mode="SENSOR_IMPORT",
            reps=10,
            seconds=45,
            kg=100,
            quality_score=90,
            bmp_avg=130,
            bmp_peak=155,
            audio_peaks=[3.0, 7.2, 11.5, 15.8, 20.1, 24.3, 28.6, 32.9, 37.1, 41.4]
        )
        
        if not completion_data:
            return False
        
        # Step 3: Verify expected results
        verdict = completion_data.get("verdict", {})
        audio_analysis = verdict.get("audio_analysis", {})
        
        print(f"   Audio Analysis Status: {audio_analysis.get('status')}")
        print(f"   Audio Peak Count: {audio_analysis.get('peak_count')}")
        print(f"   Rep Match Percentage: {audio_analysis.get('rep_match_pct')}")
        print(f"   Waveform Data Length: {len(audio_analysis.get('waveform_data', []))}")
        
        # Expected: audio_analysis.status = "AUDIO_CORRELATED", peak_count = 10, rep_match_pct = 100, waveform_data is non-empty array
        expected_status = audio_analysis.get("status") == "AUDIO_CORRELATED"
        expected_peak_count = audio_analysis.get("peak_count") == 10
        expected_rep_match = audio_analysis.get("rep_match_pct") == 100
        expected_waveform = len(audio_analysis.get("waveform_data", [])) > 0
        
        success = expected_status and expected_peak_count and expected_rep_match and expected_waveform
        
        if success:
            print("✅ SCENARIO 3 PASSED: All expected values match")
        else:
            print("❌ SCENARIO 3 FAILED: Expected values don't match")
            print(f"   Expected audio_analysis.status='AUDIO_CORRELATED', got '{audio_analysis.get('status')}'")
            print(f"   Expected peak_count=10, got {audio_analysis.get('peak_count')}")
            print(f"   Expected rep_match_pct=100, got {audio_analysis.get('rep_match_pct')}")
            print(f"   Expected non-empty waveform_data, got length {len(audio_analysis.get('waveform_data', []))}")
        
        return success
    
    def test_scenario_4_validation_breakdown(self) -> bool:
        """SCENARIO 4: VALIDATION BREAKDOWN"""
        print("\n🔍 SCENARIO 4: VALIDATION BREAKDOWN")
        print("-" * 70)
        
        # Get validation breakdown
        breakdown_data = self.get_validation_breakdown()
        
        if not breakdown_data:
            return False
        
        # Verify expected structure
        total_challenges = breakdown_data.get("total_challenges", 0)
        breakdown = breakdown_data.get("breakdown", {})
        trust_score = breakdown_data.get("trust_score", 0)
        primary_method = breakdown_data.get("primary_method", "")
        
        print(f"   Total Challenges: {total_challenges}")
        print(f"   Trust Score: {trust_score}")
        print(f"   Primary Method: {primary_method}")
        print(f"   Breakdown Keys: {list(breakdown.keys())}")
        
        # Check breakdown structure
        for method, data in breakdown.items():
            count = data.get("count", 0)
            pct = data.get("pct", 0)
            print(f"     {method}: {count} challenges ({pct}%)")
        
        # Expected: total_challenges >= 3, breakdown object with required keys, trust_score between 0-100, primary_method is a valid string
        expected_total = total_challenges >= 3
        expected_breakdown_keys = all(key in breakdown for key in ["NEXUS_VERIFIED", "MANUAL_ENTRY"])
        expected_trust_score = 0 <= trust_score <= 100
        expected_primary_method = isinstance(primary_method, str) and len(primary_method) > 0
        
        success = expected_total and expected_breakdown_keys and expected_trust_score and expected_primary_method
        
        if success:
            print("✅ SCENARIO 4 PASSED: All expected values match")
        else:
            print("❌ SCENARIO 4 FAILED: Expected values don't match")
            print(f"   Expected total_challenges >= 3, got {total_challenges}")
            print(f"   Expected breakdown to contain NEXUS_VERIFIED and MANUAL_ENTRY keys")
            print(f"   Expected trust_score between 0-100, got {trust_score}")
            print(f"   Expected valid primary_method string, got '{primary_method}'")
        
        return success
    
    def test_scenario_5_audio_analytics_non_impact(self) -> bool:
        """SCENARIO 5: AUDIO ANALYTICS — Non-Impact Exercise (Not eligible)"""
        print("\n🔍 SCENARIO 5: AUDIO ANALYTICS — Non-Impact Exercise (Not eligible)")
        print("-" * 70)
        
        # Step 1: Create challenge
        challenge_id = self.create_challenge(
            title="SPRINT NO AUDIO",
            exercise_type="sprint",
            tags=["PULSE"],
            validation_mode="MANUAL_ENTRY",
            mode="personal"
        )
        
        if not challenge_id:
            return False
        
        # Step 2: Complete challenge with audio peaks data (should be ignored)
        completion_data = self.complete_challenge(
            challenge_id=challenge_id,
            validation_mode="MANUAL_ENTRY",
            reps=1,
            seconds=12,
            audio_peaks=[1.0, 5.0]
        )
        
        if not completion_data:
            return False
        
        # Step 3: Verify expected results
        verdict = completion_data.get("verdict", {})
        audio_analysis = verdict.get("audio_analysis", {})
        
        print(f"   Audio Analysis Eligible: {audio_analysis.get('eligible')}")
        
        # Expected: audio_analysis.eligible = false (sprint is NOT an impact exercise)
        expected_eligible = audio_analysis.get("eligible") == False
        
        success = expected_eligible
        
        if success:
            print("✅ SCENARIO 5 PASSED: Sprint correctly marked as not eligible for audio analytics")
        else:
            print("❌ SCENARIO 5 FAILED: Expected audio_analysis.eligible=false")
            print(f"   Expected eligible=false, got {audio_analysis.get('eligible')}")
        
        return success

def main():
    """Main testing function"""
    print("🚀 ARENAKORE Advanced Validation Engine Testing")
    print("=" * 70)
    
    tester = ValidationEngineTester()
    
    # Step 1: Login
    if not tester.login(TEST_EMAIL, TEST_PASSWORD):
        print("❌ Cannot proceed without authentication")
        return
    
    # Run all test scenarios
    results = {}
    
    results["scenario_1"] = tester.test_scenario_1_suspicious_biometric()
    results["scenario_2"] = tester.test_scenario_2_clear_biometric()
    results["scenario_3"] = tester.test_scenario_3_audio_analytics_impact()
    results["scenario_4"] = tester.test_scenario_4_validation_breakdown()
    results["scenario_5"] = tester.test_scenario_5_audio_analytics_non_impact()
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    
    print(f"✅ Login: SUCCESS")
    
    for scenario, result in results.items():
        status = "✅ SUCCESS" if result else "❌ FAILED"
        print(f"{status}: {scenario.replace('_', ' ').title()}")
    
    # Overall result
    overall_success = all(results.values())
    
    print(f"\n🎯 OVERALL RESULT: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
    
    if not overall_success:
        print("\n⚠️  Failed tests require investigation")
        failed_scenarios = [k for k, v in results.items() if not v]
        print(f"   Failed scenarios: {', '.join(failed_scenarios)}")

if __name__ == "__main__":
    main()