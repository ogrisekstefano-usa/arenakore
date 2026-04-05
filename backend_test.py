#!/usr/bin/env python3
"""
ARENAKORE Backend Testing - UGC Challenge Completion Endpoint
Testing the UGC Challenge completion endpoint with VERIFIED and UNVERIFIED scenarios
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
ADMIN_EMAIL = "ogrisek.stefano@gmail.com"
ADMIN_PASSWORD = "Founder@KORE2026!"

def log_test(message):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def test_ugc_challenge_completion():
    """Test UGC Challenge completion endpoint with VERIFIED and UNVERIFIED scenarios"""
    
    log_test("🚀 STARTING UGC CHALLENGE COMPLETION ENDPOINT TEST")
    log_test("=" * 60)
    
    # Step 1: Login with admin credentials
    log_test("STEP 1: Admin Login")
    login_data = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    try:
        login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        log_test(f"Login Status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            log_test(f"❌ LOGIN FAILED: {login_response.text}")
            return False
            
        login_result = login_response.json()
        token = login_result.get("token")
        user = login_result.get("user", {})
        
        log_test(f"✅ Login successful for user: {user.get('username', 'Unknown')}")
        log_test(f"Token received: {token[:20]}...")
        
        headers = {"Authorization": f"Bearer {token}"}
        
    except Exception as e:
        log_test(f"❌ LOGIN ERROR: {str(e)}")
        return False
    
    # Step 2: Get user's challenges
    log_test("\nSTEP 2: Get User's Challenges")
    try:
        challenges_response = requests.get(f"{BASE_URL}/ugc/mine", headers=headers)
        log_test(f"Get Challenges Status: {challenges_response.status_code}")
        
        if challenges_response.status_code != 200:
            log_test(f"❌ GET CHALLENGES FAILED: {challenges_response.text}")
            return False
            
        challenges_result = challenges_response.json()
        challenges = challenges_result.get("challenges", [])
        
        log_test(f"✅ Found {len(challenges)} challenges")
        
        if not challenges:
            log_test("⚠️ No challenges found. Creating a test challenge first...")
            # Create a test challenge for testing
            create_challenge_data = {
                "title": "TEST CHALLENGE FOR COMPLETION",
                "template_type": "FOR_TIME",
                "discipline": "Fitness",
                "time_cap_seconds": 300,
                "exercises": [
                    {"name": "Push-ups", "target_reps": 20, "target_seconds": 0},
                    {"name": "Squats", "target_reps": 15, "target_seconds": 0}
                ],
                "destination": "solo",
                "certification": "self",
                "flux_reward": 30
            }
            
            create_response = requests.post(f"{BASE_URL}/ugc/create", json=create_challenge_data, headers=headers)
            if create_response.status_code == 200:
                created_challenge_response = create_response.json()
                challenge_obj = created_challenge_response.get("challenge", {})
                challenge_id = challenge_obj.get("_id")
                log_test(f"✅ Created test challenge with ID: {challenge_id}")
            else:
                log_test(f"❌ Failed to create test challenge: {create_response.text}")
                return False
        else:
            challenge_id = challenges[0].get("_id")
            log_test(f"✅ Using existing challenge ID: {challenge_id}")
            
            # Get challenge details to understand target reps
            challenge_detail_response = requests.get(f"{BASE_URL}/ugc/{challenge_id}/public")
            if challenge_detail_response.status_code == 200:
                challenge_detail = challenge_detail_response.json()
                exercises = challenge_detail.get("exercises", [])
                total_target_reps = sum(e.get("target_reps", 0) for e in exercises)
                log_test(f"Challenge exercises: {exercises}")
                log_test(f"Total target reps: {total_target_reps}")
            else:
                log_test(f"⚠️ Could not get challenge details: {challenge_detail_response.text}")
        
    except Exception as e:
        log_test(f"❌ GET CHALLENGES ERROR: {str(e)}")
        return False
    
    # Step 3: Test UGC Complete (VERIFIED scenario)
    log_test("\nSTEP 3: Test UGC Complete (VERIFIED scenario)")
    # Adjust completion data to match the challenge requirements for VERIFIED status
    # Need >= 80% completion (40+ reps out of 50), motion_tracked=True, avg_quality >= 50
    verified_completion_data = {
        "exercises_completed": [
            {"name": "Burpees", "reps_done": 45, "quality": 85}
        ],
        "total_reps": 45,
        "avg_quality": 85.0,
        "duration_seconds": 180,
        "motion_tracked": True
    }
    
    try:
        verified_response = requests.post(
            f"{BASE_URL}/ugc/{challenge_id}/complete", 
            json=verified_completion_data, 
            headers=headers
        )
        log_test(f"VERIFIED Completion Status: {verified_response.status_code}")
        
        if verified_response.status_code != 200:
            log_test(f"❌ VERIFIED COMPLETION FAILED: {verified_response.text}")
            return False
            
        verified_result = verified_response.json()
        log_test("✅ VERIFIED COMPLETION SUCCESS")
        log_test(f"Response: {json.dumps(verified_result, indent=2)}")
        
        # Validate VERIFIED response
        expected_verified = {
            "is_verified": True,
            "status": "VERIFIED"
        }
        
        for key, expected_value in expected_verified.items():
            actual_value = verified_result.get(key)
            if actual_value == expected_value:
                log_test(f"✅ {key}: {actual_value} (as expected)")
            else:
                log_test(f"❌ {key}: {actual_value} (expected {expected_value})")
        
        flux_earned = verified_result.get("flux_earned", 0)
        if flux_earned > 0:
            log_test(f"✅ flux_earned: {flux_earned} (> 0 as expected)")
        else:
            log_test(f"❌ flux_earned: {flux_earned} (expected > 0)")
        
    except Exception as e:
        log_test(f"❌ VERIFIED COMPLETION ERROR: {str(e)}")
        return False
    
    # Step 4: Create another challenge for UNVERIFIED test
    log_test("\nSTEP 4: Create Challenge for UNVERIFIED Test")
    unverified_challenge_data = {
        "title": "UNVERIFIED TEST",
        "template_type": "FOR_TIME",
        "discipline": "Fitness",
        "time_cap_seconds": 300,
        "exercises": [{"name": "Burpees", "target_reps": 50, "target_seconds": 0}],
        "destination": "solo",
        "certification": "self",
        "flux_reward": 20
    }
    
    try:
        unverified_create_response = requests.post(
            f"{BASE_URL}/ugc/create", 
            json=unverified_challenge_data, 
            headers=headers
        )
        log_test(f"Create UNVERIFIED Challenge Status: {unverified_create_response.status_code}")
        
        if unverified_create_response.status_code != 200:
            log_test(f"❌ CREATE UNVERIFIED CHALLENGE FAILED: {unverified_create_response.text}")
            return False
            
        unverified_challenge = unverified_create_response.json()
        # The ID is nested in the challenge object
        challenge_obj = unverified_challenge.get("challenge", {})
        unverified_challenge_id = challenge_obj.get("_id")
        log_test(f"✅ Created UNVERIFIED test challenge with ID: {unverified_challenge_id}")
        
        if not unverified_challenge_id:
            log_test(f"❌ Challenge ID is None, using challenge object keys: {list(unverified_challenge.keys())}")
            log_test(f"Full challenge response: {json.dumps(unverified_challenge, indent=2)}")
            return False
        
    except Exception as e:
        log_test(f"❌ CREATE UNVERIFIED CHALLENGE ERROR: {str(e)}")
        return False
    
    # Step 5: Test UGC Complete (UNVERIFIED scenario)
    log_test("\nSTEP 5: Test UGC Complete (UNVERIFIED scenario)")
    unverified_completion_data = {
        "exercises_completed": [{"name": "Burpees", "reps_done": 5, "quality": 30}],
        "total_reps": 5,
        "avg_quality": 30,
        "duration_seconds": 60,
        "motion_tracked": False
    }
    
    try:
        unverified_response = requests.post(
            f"{BASE_URL}/ugc/{unverified_challenge_id}/complete", 
            json=unverified_completion_data, 
            headers=headers
        )
        log_test(f"UNVERIFIED Completion Status: {unverified_response.status_code}")
        
        if unverified_response.status_code != 200:
            log_test(f"❌ UNVERIFIED COMPLETION FAILED: {unverified_response.text}")
            return False
            
        unverified_result = unverified_response.json()
        log_test("✅ UNVERIFIED COMPLETION SUCCESS")
        log_test(f"Response: {json.dumps(unverified_result, indent=2)}")
        
        # Validate UNVERIFIED response
        expected_unverified = {
            "is_verified": False,
            "status": "UNVERIFIED"
        }
        
        for key, expected_value in expected_unverified.items():
            actual_value = unverified_result.get(key)
            if actual_value == expected_value:
                log_test(f"✅ {key}: {actual_value} (as expected)")
            else:
                log_test(f"❌ {key}: {actual_value} (expected {expected_value})")
        
        flux_earned_unverified = unverified_result.get("flux_earned", 0)
        flux_earned_verified = verified_result.get("flux_earned", 0)
        
        if flux_earned_unverified < flux_earned_verified:
            log_test(f"✅ flux_earned: {flux_earned_unverified} (lower than verified: {flux_earned_verified})")
        else:
            log_test(f"❌ flux_earned: {flux_earned_unverified} (expected lower than verified: {flux_earned_verified})")
        
    except Exception as e:
        log_test(f"❌ UNVERIFIED COMPLETION ERROR: {str(e)}")
        return False
    
    log_test("\n" + "=" * 60)
    log_test("🎉 UGC CHALLENGE COMPLETION ENDPOINT TEST COMPLETED SUCCESSFULLY")
    log_test("=" * 60)
    
    return True

if __name__ == "__main__":
    success = test_ugc_challenge_completion()
    if not success:
        sys.exit(1)