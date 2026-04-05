#!/usr/bin/env python3
"""
ARENAKORE Backend API Testing Suite
Testing UGC Challenge endpoints as requested in review_request:
1. POST /api/auth/login (admin credentials)
2. POST /api/ugc/create (create UGC challenge)
3. GET /api/ugc/{challenge_id}/public (no auth)
4. POST /api/ugc/{challenge_id}/import (same user token)
5. GET /api/ugc/mine (Bearer token)
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
ADMIN_EMAIL = "ogrisek.stefano@gmail.com"
ADMIN_PASSWORD = "Founder@KORE2026!"

def log_test(step, description, success=True):
    """Log test step with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status = "✅" if success else "❌"
    print(f"[{timestamp}] {status} {step}: {description}")

def log_response(response, step_name):
    """Log response details"""
    print(f"\n--- {step_name} Response ---")
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    try:
        response_json = response.json()
        print(f"Response Body: {json.dumps(response_json, indent=2)}")
        return response_json
    except:
        print(f"Response Text: {response.text}")
        return None

def test_ugc_challenge_flow():
    """Test the complete UGC Challenge flow as specified in review request"""
    
    print("🚀 Starting ARENAKORE UGC Challenge Flow Testing")
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Credentials: {ADMIN_EMAIL}")
    print("=" * 60)
    
    # Step 1: Admin Login
    print("\n📝 STEP 1: Admin Login")
    login_data = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        login_result = log_response(response, "Admin Login")
        
        if response.status_code == 200 and login_result and "token" in login_result:
            token = login_result["token"]
            log_test("1", f"Admin login successful, token received")
            print(f"Token: {token[:50]}...")
        else:
            log_test("1", f"Admin login failed - Status: {response.status_code}", False)
            return False
            
    except Exception as e:
        log_test("1", f"Admin login error: {str(e)}", False)
        return False
    
    # Step 2: Create UGC Challenge
    print("\n📝 STEP 2: Create UGC Challenge")
    headers = {"Authorization": f"Bearer {token}"}
    challenge_data = {
        "title": "TEST SHARE FLOW",
        "template_type": "AMRAP",
        "discipline": "Fitness",
        "time_cap_seconds": 600,
        "exercises": [
            {"name": "Push-ups", "target_reps": 20, "target_seconds": 0},
            {"name": "Squats", "target_reps": 15, "target_seconds": 0}
        ],
        "destination": "solo",
        "certification": "self",
        "flux_reward": 25
    }
    
    try:
        response = requests.post(f"{BASE_URL}/ugc/create", json=challenge_data, headers=headers)
        create_result = log_response(response, "Create UGC Challenge")
        
        if response.status_code == 200 and create_result:
            # Handle different response formats
            if "challenge_id" in create_result:
                challenge_id = create_result["challenge_id"]
            elif "challenge" in create_result and "_id" in create_result["challenge"]:
                challenge_id = create_result["challenge"]["_id"]
            else:
                log_test("2", f"UGC Challenge creation failed - No challenge ID found", False)
                return False
            log_test("2", f"UGC Challenge created successfully, ID: {challenge_id}")
        else:
            log_test("2", f"UGC Challenge creation failed - Status: {response.status_code}", False)
            return False
            
    except Exception as e:
        log_test("2", f"UGC Challenge creation error: {str(e)}", False)
        return False
    
    # Step 3: Test Public Challenge Endpoint (NO AUTH)
    print("\n📝 STEP 3: Get Public Challenge Details (No Auth)")
    try:
        response = requests.get(f"{BASE_URL}/ugc/{challenge_id}/public")
        public_result = log_response(response, "Public Challenge Details")
        
        if response.status_code == 200 and public_result:
            log_test("3", f"Public challenge details retrieved successfully")
            # Check for required fields
            required_fields = ["title", "template_type", "discipline", "exercises", "flux_reward", "creator_name"]
            missing_fields = [field for field in required_fields if field not in public_result]
            if missing_fields:
                log_test("3", f"Missing required fields: {missing_fields}", False)
            else:
                log_test("3", f"All required fields present in public response")
        else:
            log_test("3", f"Public challenge retrieval failed - Status: {response.status_code}", False)
            
    except Exception as e:
        log_test("3", f"Public challenge retrieval error: {str(e)}", False)
    
    # Step 4: Test Challenge Import (Same User)
    print("\n📝 STEP 4: Import Challenge (Same User)")
    try:
        response = requests.post(f"{BASE_URL}/ugc/{challenge_id}/import", headers=headers)
        import_result = log_response(response, "Challenge Import")
        
        if response.status_code == 200 and import_result:
            log_test("4", f"Challenge import completed")
            if "status" in import_result:
                status = import_result["status"]
                if status in ["imported", "already_imported"]:
                    log_test("4", f"Import status: {status} (expected for same user)")
                else:
                    log_test("4", f"Unexpected import status: {status}", False)
        else:
            log_test("4", f"Challenge import failed - Status: {response.status_code}", False)
            
    except Exception as e:
        log_test("4", f"Challenge import error: {str(e)}", False)
    
    # Step 5: Test Get My Challenges
    print("\n📝 STEP 5: Get My Challenges")
    try:
        response = requests.get(f"{BASE_URL}/ugc/mine", headers=headers)
        mine_result = log_response(response, "My Challenges")
        
        if response.status_code == 200 and mine_result:
            log_test("5", f"My challenges retrieved successfully")
            # Handle different response formats
            challenges_list = mine_result
            if isinstance(mine_result, dict) and "challenges" in mine_result:
                challenges_list = mine_result["challenges"]
            
            if isinstance(challenges_list, list):
                log_test("5", f"Found {len(challenges_list)} challenges in user's list")
                # Check if our created challenge is in the list
                found_challenge = any(c.get("_id") == challenge_id for c in challenges_list)
                if found_challenge:
                    log_test("5", f"Created challenge found in user's challenge list")
                else:
                    log_test("5", f"Created challenge NOT found in user's challenge list", False)
            else:
                log_test("5", f"Unexpected response format for my challenges", False)
        else:
            log_test("5", f"My challenges retrieval failed - Status: {response.status_code}", False)
            
    except Exception as e:
        log_test("5", f"My challenges retrieval error: {str(e)}", False)
    
    print("\n" + "=" * 60)
    print("🏁 UGC Challenge Flow Testing Complete")
    return True

if __name__ == "__main__":
    test_ugc_challenge_flow()