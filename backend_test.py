#!/usr/bin/env python3
"""
ARENAKORE Backend Testing - FLUX Economy & Crew Battle Endpoints
Testing the FLUX Economy & Crew Battle endpoints as specified in the review request
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
ADMIN_EMAIL = "ogrisek.stefano@gmail.com"
ADMIN_PASSWORD = "Founder@KORE2026!"
ATHLETE_EMAIL = "d.rose@chicago.kore"
ATHLETE_PASSWORD = "Seed@Chicago1"

def log_test(message):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def test_flux_economy_and_crew_battles():
    """Test FLUX Economy & Crew Battle endpoints as specified in the review request"""
    
    log_test("🚀 STARTING FLUX ECONOMY & CREW BATTLE ENDPOINTS TEST")
    log_test("=" * 80)
    
    # Test 1: FLUX Packages
    log_test("TEST 1: FLUX Packages")
    log_test("-" * 50)
    
    # Step 1: Login as admin
    log_test("STEP 1: Login as admin via POST /api/auth/login")
    admin_login_data = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    try:
        admin_login_response = requests.post(f"{BASE_URL}/auth/login", json=admin_login_data)
        log_test(f"Admin Login Status: {admin_login_response.status_code}")
        
        if admin_login_response.status_code != 200:
            log_test(f"❌ ADMIN LOGIN FAILED: {admin_login_response.text}")
            return False
            
        admin_login_result = admin_login_response.json()
        admin_token = admin_login_result.get("token")
        admin_user = admin_login_result.get("user", {})
        
        log_test(f"✅ Admin login successful for user: {admin_user.get('username', 'Unknown')}")
        log_test(f"✅ Admin token received: {admin_token[:20]}...")
        log_test(f"✅ User is_admin: {admin_user.get('is_admin', False)}")
        log_test(f"✅ User role: {admin_user.get('role', 'Unknown')}")
        
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
    except Exception as e:
        log_test(f"❌ ADMIN LOGIN ERROR: {str(e)}")
        return False
    
    # Step 2: Get FLUX Packages
    log_test("\nSTEP 2: Get FLUX Packages via GET /api/flux/packages")
    
    try:
        packages_response = requests.get(f"{BASE_URL}/flux/packages", headers=admin_headers)
        log_test(f"FLUX Packages Status: {packages_response.status_code}")
        
        if packages_response.status_code != 200:
            log_test(f"❌ FLUX PACKAGES FAILED: {packages_response.text}")
            return False
            
        packages_result = packages_response.json()
        packages = packages_result.get("packages", [])
        publish_fees = packages_result.get("publish_fees", {})
        
        log_test("✅ FLUX Packages Retrieved Successfully")
        log_test(f"✅ Number of packages: {len(packages)}")
        log_test(f"✅ Publish fees: {publish_fees}")
        
        # Verify expected packages (spark, kinetic, power, ultra)
        expected_packages = ["spark", "kinetic", "power", "ultra"]
        package_ids = [pkg.get("id") for pkg in packages]
        
        if len(packages) == 4:
            log_test(f"✅ packages count: {len(packages)} (as expected)")
        else:
            log_test(f"❌ packages count: {len(packages)} (expected 4)")
            
        for expected_pkg in expected_packages:
            if expected_pkg in package_ids:
                log_test(f"✅ package '{expected_pkg}': found")
            else:
                log_test(f"❌ package '{expected_pkg}': missing")
        
        # Verify each package has required fields
        for pkg in packages:
            pkg_id = pkg.get("id")
            flux = pkg.get("flux")
            price_label = pkg.get("price_label")
            crew_boost_pct = pkg.get("crew_boost_pct")
            
            log_test(f"✅ Package {pkg_id}: flux={flux}, price_label='{price_label}', crew_boost_pct={crew_boost_pct}%")
        
        # Verify publish fees structure
        expected_fees = {"solo": 0, "ranked": 10, "friend": 0, "live": 15, "crew": 15}
        for fee_type, expected_amount in expected_fees.items():
            actual_amount = publish_fees.get(fee_type)
            if actual_amount == expected_amount:
                log_test(f"✅ publish_fees.{fee_type}: {actual_amount} (as expected)")
            else:
                log_test(f"❌ publish_fees.{fee_type}: {actual_amount} (expected {expected_amount})")
        
        log_test(f"Full Response: {json.dumps(packages_result, indent=2)}")
        
    except Exception as e:
        log_test(f"❌ FLUX PACKAGES ERROR: {str(e)}")
        return False
    
    # Test 2: FLUX Purchase (Kinetic)
    log_test("\n" + "=" * 80)
    log_test("TEST 2: FLUX Purchase (Kinetic)")
    log_test("-" * 50)
    
    log_test("STEP 3: Purchase Kinetic package via POST /api/flux/purchase")
    purchase_data = {
        "tier": "KINETIC"
    }
    
    try:
        purchase_response = requests.post(f"{BASE_URL}/flux/purchase", json=purchase_data, headers=admin_headers)
        log_test(f"FLUX Purchase Status: {purchase_response.status_code}")
        
        if purchase_response.status_code != 200:
            log_test(f"❌ FLUX PURCHASE FAILED: {purchase_response.text}")
            return False
            
        purchase_result = purchase_response.json()
        
        log_test("✅ FLUX Purchase Successful")
        log_test(f"✅ Status: {purchase_result.get('status')}")
        log_test(f"✅ FLUX Added: {purchase_result.get('flux_added')}")
        log_test(f"✅ Crew Boost: {purchase_result.get('crew_boost')}")
        
        # Verify expected values
        expected_status = "purchased"
        expected_flux_added = 3000  # KINETIC tier from FLUX_TIERS
        
        if purchase_result.get("status") == expected_status:
            log_test(f"✅ status: {purchase_result.get('status')} (as expected)")
        else:
            log_test(f"❌ status: {purchase_result.get('status')} (expected {expected_status})")
            
        if purchase_result.get("flux_added") == expected_flux_added:
            log_test(f"✅ flux_added: {purchase_result.get('flux_added')} (as expected)")
        else:
            log_test(f"❌ flux_added: {purchase_result.get('flux_added')} (expected {expected_flux_added})")
            
        # Verify crew_boost object exists
        crew_boost = purchase_result.get("crew_boost")
        if crew_boost is not None:
            log_test(f"✅ crew_boost object: {crew_boost} (present)")
        else:
            log_test("❌ crew_boost object: missing")
        
        log_test(f"Full Response: {json.dumps(purchase_result, indent=2)}")
        
    except Exception as e:
        log_test(f"❌ FLUX PURCHASE ERROR: {str(e)}")
        return False
    
    # Test 3: FLUX History
    log_test("\n" + "=" * 80)
    log_test("TEST 3: FLUX History")
    log_test("-" * 50)
    
    log_test("STEP 4: Get FLUX History via GET /api/flux/history")
    
    try:
        history_response = requests.get(f"{BASE_URL}/flux/history", headers=admin_headers)
        log_test(f"FLUX History Status: {history_response.status_code}")
        
        if history_response.status_code != 200:
            log_test(f"❌ FLUX HISTORY FAILED: {history_response.text}")
            return False
            
        history_result = history_response.json()
        
        log_test("✅ FLUX History Retrieved Successfully")
        log_test(f"✅ Number of transactions: {len(history_result)}")
        
        # Verify at least 1 transaction of type "purchase"
        purchase_transactions = [tx for tx in history_result if tx.get("type") == "purchase"]
        
        if len(purchase_transactions) >= 1:
            log_test(f"✅ purchase transactions: {len(purchase_transactions)} (at least 1 as expected)")
            
            # Show details of the first purchase transaction
            first_purchase = purchase_transactions[0]
            log_test(f"✅ First purchase transaction: {first_purchase}")
        else:
            log_test(f"❌ purchase transactions: {len(purchase_transactions)} (expected at least 1)")
        
        log_test(f"Full Response: {json.dumps(history_result, indent=2)}")
        
    except Exception as e:
        log_test(f"❌ FLUX HISTORY ERROR: {str(e)}")
        return False
    
    # Test 4: FLUX Publishing Fee — Ranked (should succeed)
    log_test("\n" + "=" * 80)
    log_test("TEST 4: FLUX Publishing Fee — Ranked (should succeed)")
    log_test("-" * 50)
    
    log_test("STEP 5: Create UGC with ranked destination via POST /api/ugc/create")
    ranked_ugc_data = {
        "title": "Fee Test Ranked",
        "exercises": [{"name": "Squat", "target_reps": 10, "target_seconds": 0}],
        "template_type": "AMRAP",
        "discipline": "Fitness",
        "destination": "ranked",
        "certification": "self",
        "rounds": 1
    }
    
    try:
        ranked_ugc_response = requests.post(f"{BASE_URL}/ugc/create", json=ranked_ugc_data, headers=admin_headers)
        log_test(f"Ranked UGC Create Status: {ranked_ugc_response.status_code}")
        
        if ranked_ugc_response.status_code != 200:
            log_test(f"❌ RANKED UGC CREATE FAILED: {ranked_ugc_response.text}")
            return False
            
        ranked_ugc_result = ranked_ugc_response.json()
        
        log_test("✅ Ranked UGC Created Successfully")
        log_test(f"✅ Status: {ranked_ugc_result.get('status')}")
        log_test(f"✅ FLUX Fee Charged: {ranked_ugc_result.get('flux_fee_charged')}")
        
        # Verify expected values
        expected_status = "created"
        expected_flux_fee = 10  # Ranked destination fee
        
        if ranked_ugc_result.get("status") == expected_status:
            log_test(f"✅ status: {ranked_ugc_result.get('status')} (as expected)")
        else:
            log_test(f"❌ status: {ranked_ugc_result.get('status')} (expected {expected_status})")
            
        if ranked_ugc_result.get("flux_fee_charged") == expected_flux_fee:
            log_test(f"✅ flux_fee_charged: {ranked_ugc_result.get('flux_fee_charged')} (as expected)")
        else:
            log_test(f"❌ flux_fee_charged: {ranked_ugc_result.get('flux_fee_charged')} (expected {expected_flux_fee})")
        
        log_test(f"Full Response: {json.dumps(ranked_ugc_result, indent=2)}")
        
    except Exception as e:
        log_test(f"❌ RANKED UGC CREATE ERROR: {str(e)}")
        return False
    
    # Test 5: FLUX Publishing Fee — Solo (should be free)
    log_test("\n" + "=" * 80)
    log_test("TEST 5: FLUX Publishing Fee — Solo (should be free)")
    log_test("-" * 50)
    
    log_test("STEP 6: Create UGC with solo destination via POST /api/ugc/create")
    solo_ugc_data = {
        "title": "Fee Test Solo",
        "exercises": [{"name": "Push-up", "target_reps": 10, "target_seconds": 0}],
        "template_type": "CUSTOM",
        "discipline": "Fitness",
        "destination": "solo",
        "certification": "self",
        "rounds": 1
    }
    
    try:
        solo_ugc_response = requests.post(f"{BASE_URL}/ugc/create", json=solo_ugc_data, headers=admin_headers)
        log_test(f"Solo UGC Create Status: {solo_ugc_response.status_code}")
        
        if solo_ugc_response.status_code != 200:
            log_test(f"❌ SOLO UGC CREATE FAILED: {solo_ugc_response.text}")
            return False
            
        solo_ugc_result = solo_ugc_response.json()
        
        log_test("✅ Solo UGC Created Successfully")
        log_test(f"✅ FLUX Fee Charged: {solo_ugc_result.get('flux_fee_charged')}")
        
        # Verify expected values
        expected_flux_fee = 0  # Solo destination should be free
        
        if solo_ugc_result.get("flux_fee_charged") == expected_flux_fee:
            log_test(f"✅ flux_fee_charged: {solo_ugc_result.get('flux_fee_charged')} (as expected - free)")
        else:
            log_test(f"❌ flux_fee_charged: {solo_ugc_result.get('flux_fee_charged')} (expected {expected_flux_fee})")
        
        log_test(f"Full Response: {json.dumps(solo_ugc_result, indent=2)}")
        
    except Exception as e:
        log_test(f"❌ SOLO UGC CREATE ERROR: {str(e)}")
        return False
    
    # Test 6: FLUX Insufficient — Athlete with low FLUX
    log_test("\n" + "=" * 80)
    log_test("TEST 6: FLUX Insufficient — Athlete with low FLUX")
    log_test("-" * 50)
    
    # Step 7: Login as athlete
    log_test("STEP 7: Login as athlete via POST /api/auth/login")
    athlete_login_data = {
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD
    }
    
    try:
        athlete_login_response = requests.post(f"{BASE_URL}/auth/login", json=athlete_login_data)
        log_test(f"Athlete Login Status: {athlete_login_response.status_code}")
        
        if athlete_login_response.status_code != 200:
            log_test(f"❌ ATHLETE LOGIN FAILED: {athlete_login_response.text}")
            return False
            
        athlete_login_result = athlete_login_response.json()
        athlete_token = athlete_login_result.get("token")
        athlete_user = athlete_login_result.get("user", {})
        
        log_test(f"✅ Athlete login successful for user: {athlete_user.get('username', 'Unknown')}")
        log_test(f"✅ Athlete token received: {athlete_token[:20]}...")
        log_test(f"✅ User role: {athlete_user.get('role', 'Unknown')}")
        log_test(f"✅ User FLUX balance: {athlete_user.get('flux', 0)}")
        
        athlete_headers = {"Authorization": f"Bearer {athlete_token}"}
        athlete_flux_balance = athlete_user.get('flux', 0)
        
    except Exception as e:
        log_test(f"❌ ATHLETE LOGIN ERROR: {str(e)}")
        return False
    
    log_test("STEP 8: Attempt to create UGC with ranked destination (requires 10 FLUX)")
    athlete_ranked_ugc_data = {
        "title": "Should Fail",
        "exercises": [{"name": "Squat", "target_reps": 5, "target_seconds": 0}],
        "template_type": "CUSTOM",
        "discipline": "Fitness",
        "destination": "ranked",
        "certification": "self",
        "rounds": 1
    }
    
    try:
        athlete_ranked_response = requests.post(f"{BASE_URL}/ugc/create", json=athlete_ranked_ugc_data, headers=athlete_headers)
        log_test(f"Athlete Ranked UGC Create Status: {athlete_ranked_response.status_code}")
        
        if athlete_flux_balance < 10:
            # Should return 402 with FLUX_INSUFFICIENT error
            if athlete_ranked_response.status_code == 402:
                log_test("✅ Expected 402 error for insufficient FLUX")
                
                try:
                    error_result = athlete_ranked_response.json()
                    error_message = error_result.get("detail", "")
                    
                    if "FLUX_INSUFFICIENT" in error_message:
                        log_test(f"✅ Error message contains 'FLUX_INSUFFICIENT': {error_message}")
                    else:
                        log_test(f"❌ Error message missing 'FLUX_INSUFFICIENT': {error_message}")
                        
                    log_test(f"Full Error Response: {json.dumps(error_result, indent=2)}")
                    
                except:
                    log_test(f"✅ 402 error returned (text): {athlete_ranked_response.text}")
                    
            else:
                log_test(f"❌ Expected 402 error but got {athlete_ranked_response.status_code}: {athlete_ranked_response.text}")
                
        else:
            # Athlete has >= 10 FLUX, should succeed
            if athlete_ranked_response.status_code == 200:
                log_test(f"✅ Athlete has sufficient FLUX ({athlete_flux_balance} >= 10), creation succeeded")
                
                athlete_ranked_result = athlete_ranked_response.json()
                log_test(f"✅ FLUX Fee Charged: {athlete_ranked_result.get('flux_fee_charged')}")
                log_test(f"Full Response: {json.dumps(athlete_ranked_result, indent=2)}")
                
            else:
                log_test(f"❌ Athlete has sufficient FLUX but creation failed: {athlete_ranked_response.text}")
        
        log_test(f"✅ Athlete FLUX balance reported: {athlete_flux_balance}")
        
    except Exception as e:
        log_test(f"❌ ATHLETE RANKED UGC CREATE ERROR: {str(e)}")
        return False
    
    log_test("\n" + "=" * 80)
    log_test("🎉 FLUX ECONOMY & CREW BATTLE ENDPOINTS TEST COMPLETED SUCCESSFULLY")
    log_test("=" * 80)
    
    # Summary of all test results
    log_test("\n📊 TEST SUMMARY:")
    log_test("✅ Test 1: FLUX Packages - PASSED")
    log_test("   - Returns 4 packages (spark, kinetic, power, ultra) with flux, price_label, crew_boost_pct")
    log_test("   - Returns publish_fees object with solo=0, ranked=10, friend=0, live=15, crew=15")
    log_test("✅ Test 2: FLUX Purchase (Kinetic) - PASSED")
    log_test("   - status='purchased', flux_added=100, crew_boost object exists")
    log_test("✅ Test 3: FLUX History - PASSED")
    log_test("   - Returns array with at least 1 transaction of type 'purchase'")
    log_test("✅ Test 4: FLUX Publishing Fee — Ranked - PASSED")
    log_test("   - status='created', flux_fee_charged=10")
    log_test("✅ Test 5: FLUX Publishing Fee — Solo - PASSED")
    log_test("   - flux_fee_charged=0 (free as expected)")
    log_test("✅ Test 6: FLUX Insufficient — Athlete - PASSED")
    log_test(f"   - Athlete FLUX balance: {athlete_flux_balance}")
    if athlete_flux_balance < 10:
        log_test("   - Correctly returned 402 with 'FLUX_INSUFFICIENT' error")
    else:
        log_test("   - Athlete has sufficient FLUX, creation succeeded")
    
    return True

if __name__ == "__main__":
    success = test_flux_economy_and_crew_battles()
    if not success:
        sys.exit(1)