#!/usr/bin/env python3
"""
ARENAKORE Backend Testing - Governance & Request Routing System
Testing the governance and request routing endpoints as specified in the review request
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

def test_governance_request_routing():
    """Test Governance & Request Routing system as specified in the review request"""
    
    log_test("🚀 STARTING GOVERNANCE & REQUEST ROUTING SYSTEM TEST")
    log_test("=" * 70)
    
    # Step 1: Login via POST /api/auth/login → get token
    log_test("STEP 1: Login via POST /api/auth/login")
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
        log_test(f"✅ Token received: {token[:20]}...")
        log_test(f"✅ User is_admin: {user.get('is_admin', False)}")
        
        headers = {"Authorization": f"Bearer {token}"}
        
    except Exception as e:
        log_test(f"❌ LOGIN ERROR: {str(e)}")
        return False
    
    # Step 2: Create a Template Request: POST /api/requests/template
    log_test("\nSTEP 2: Create Template Request - POST /api/requests/template")
    template_request_data = {
        "discipline": "Golf",
        "description": "Serve un template per lo swing analysis con 3 fasi: backswing, impact, follow-through."
    }
    
    try:
        template_response = requests.post(f"{BASE_URL}/requests/template", json=template_request_data, headers=headers)
        log_test(f"Template Request Status: {template_response.status_code}")
        
        if template_response.status_code != 200:
            log_test(f"❌ TEMPLATE REQUEST FAILED: {template_response.text}")
            return False
            
        template_result = template_response.json()
        # Extract the actual request object from the nested response
        request_obj = template_result.get("request", {})
        template_request_id = request_obj.get("_id")
        
        log_test("✅ Template Request Created Successfully")
        log_test(f"✅ Request ID: {template_request_id}")
        log_test(f"✅ Type: {request_obj.get('type')}")
        log_test(f"✅ Vote Count: {request_obj.get('vote_count')}")
        log_test(f"Response: {json.dumps(template_result, indent=2)}")
        
        # Validate expected fields
        expected_fields = {
            "_id": template_request_id,
            "type": "template",
            "vote_count": 0
        }
        
        for field, expected_value in expected_fields.items():
            actual_value = request_obj.get(field)
            if field == "_id":
                if actual_value:
                    log_test(f"✅ {field}: {actual_value} (present)")
                else:
                    log_test(f"❌ {field}: missing")
            elif actual_value == expected_value:
                log_test(f"✅ {field}: {actual_value} (as expected)")
            else:
                log_test(f"❌ {field}: {actual_value} (expected {expected_value})")
        
    except Exception as e:
        log_test(f"❌ TEMPLATE REQUEST ERROR: {str(e)}")
        return False
    
    # Step 3: Create a Category Proposal: POST /api/requests/category
    log_test("\nSTEP 3: Create Category Proposal - POST /api/requests/category")
    # Use a unique category name to avoid conflicts
    import time
    unique_suffix = str(int(time.time()))[-6:]  # Last 6 digits of timestamp
    category_proposal_data = {
        "category_name": f"Padel_{unique_suffix}",
        "motivation": "Il Padel è in forte crescita in Italia, serve una disciplina dedicata."
    }
    
    try:
        category_response = requests.post(f"{BASE_URL}/requests/category", json=category_proposal_data, headers=headers)
        log_test(f"Category Proposal Status: {category_response.status_code}")
        
        if category_response.status_code != 200:
            log_test(f"❌ CATEGORY PROPOSAL FAILED: {category_response.text}")
            return False
            
        category_result = category_response.json()
        # Extract the actual request object from the nested response
        category_request_obj = category_result.get("request", {})
        category_request_id = category_request_obj.get("_id")
        
        log_test("✅ Category Proposal Created Successfully")
        log_test(f"✅ Request ID: {category_request_id}")
        log_test(f"✅ Type: {category_request_obj.get('type')}")
        log_test(f"✅ Vote Count: {category_request_obj.get('vote_count')}")
        log_test(f"Response: {json.dumps(category_result, indent=2)}")
        
        # Validate expected fields (auto-vote should make vote_count = 1)
        expected_vote_count = 1  # auto-vote
        actual_vote_count = category_request_obj.get('vote_count')
        
        if actual_vote_count == expected_vote_count:
            log_test(f"✅ vote_count: {actual_vote_count} (auto-vote working)")
        else:
            log_test(f"❌ vote_count: {actual_vote_count} (expected {expected_vote_count} for auto-vote)")
        
    except Exception as e:
        log_test(f"❌ CATEGORY PROPOSAL ERROR: {str(e)}")
        return False
    
    # Step 4: List Template Requests: GET /api/requests/template?discipline=Golf
    log_test("\nSTEP 4: List Template Requests - GET /api/requests/template?discipline=Golf")
    try:
        list_template_response = requests.get(f"{BASE_URL}/requests/template?discipline=Golf", headers=headers)
        log_test(f"List Template Requests Status: {list_template_response.status_code}")
        
        if list_template_response.status_code != 200:
            log_test(f"❌ LIST TEMPLATE REQUESTS FAILED: {list_template_response.text}")
            return False
            
        list_template_result = list_template_response.json()
        
        log_test("✅ Template Requests Listed Successfully")
        log_test(f"✅ Found {len(list_template_result)} template requests")
        log_test(f"Response: {json.dumps(list_template_result, indent=2)}")
        
        # Validate that we have at least 1 item (our created request)
        if len(list_template_result) >= 1:
            log_test("✅ Array contains at least 1 item as expected")
            # Check if our created request is in the list
            found_our_request = any(req.get("_id") == template_request_id for req in list_template_result)
            if found_our_request:
                log_test("✅ Our created template request found in the list")
            else:
                log_test("⚠️ Our created template request not found in the list")
        else:
            log_test("❌ Array is empty, expected at least 1 item")
        
    except Exception as e:
        log_test(f"❌ LIST TEMPLATE REQUESTS ERROR: {str(e)}")
        return False
    
    # Step 5: List Category Proposals: GET /api/requests/category
    log_test("\nSTEP 5: List Category Proposals - GET /api/requests/category")
    try:
        list_category_response = requests.get(f"{BASE_URL}/requests/category", headers=headers)
        log_test(f"List Category Proposals Status: {list_category_response.status_code}")
        
        if list_category_response.status_code != 200:
            log_test(f"❌ LIST CATEGORY PROPOSALS FAILED: {list_category_response.text}")
            return False
            
        list_category_result = list_category_response.json()
        
        log_test("✅ Category Proposals Listed Successfully")
        log_test(f"✅ Found {len(list_category_result)} category proposals")
        log_test(f"Response: {json.dumps(list_category_result, indent=2)}")
        
        # Validate that we have at least 1 item including our unique category
        if len(list_category_result) >= 1:
            log_test("✅ Array contains at least 1 item as expected")
            # Check if our unique category is in the list
            found_our_category = any(category_proposal_data["category_name"] in req.get("category_name", "") for req in list_category_result)
            if found_our_category:
                log_test(f"✅ '{category_proposal_data['category_name']}' category proposal found in the list")
            else:
                log_test(f"⚠️ '{category_proposal_data['category_name']}' category proposal not found in the list")
        else:
            log_test("❌ Array is empty, expected at least 1 item")
        
    except Exception as e:
        log_test(f"❌ LIST CATEGORY PROPOSALS ERROR: {str(e)}")
        return False
    
    # Step 6: Upvote the template request: POST /api/requests/{template_request_id}/upvote
    log_test(f"\nSTEP 6: Upvote Template Request - POST /api/requests/{template_request_id}/upvote")
    try:
        upvote_response = requests.post(f"{BASE_URL}/requests/{template_request_id}/upvote", headers=headers)
        log_test(f"Upvote Status: {upvote_response.status_code}")
        
        if upvote_response.status_code != 200:
            log_test(f"❌ UPVOTE FAILED: {upvote_response.text}")
            return False
            
        upvote_result = upvote_response.json()
        
        log_test("✅ Upvote Successful")
        log_test(f"✅ Action: {upvote_result.get('action')}")
        log_test(f"✅ Vote Count: {upvote_result.get('vote_count')}")
        log_test(f"Response: {json.dumps(upvote_result, indent=2)}")
        
        # Validate expected response
        expected_action = "added"
        expected_vote_count = 1
        
        if upvote_result.get("action") == expected_action:
            log_test(f"✅ action: {upvote_result.get('action')} (as expected)")
        else:
            log_test(f"❌ action: {upvote_result.get('action')} (expected {expected_action})")
            
        if upvote_result.get("vote_count") == expected_vote_count:
            log_test(f"✅ vote_count: {upvote_result.get('vote_count')} (as expected)")
        else:
            log_test(f"❌ vote_count: {upvote_result.get('vote_count')} (expected {expected_vote_count})")
        
    except Exception as e:
        log_test(f"❌ UPVOTE ERROR: {str(e)}")
        return False
    
    # Step 7: Upvote AGAIN (toggle off): POST /api/requests/{template_request_id}/upvote
    log_test(f"\nSTEP 7: Upvote AGAIN (toggle off) - POST /api/requests/{template_request_id}/upvote")
    try:
        upvote_again_response = requests.post(f"{BASE_URL}/requests/{template_request_id}/upvote", headers=headers)
        log_test(f"Upvote Again Status: {upvote_again_response.status_code}")
        
        if upvote_again_response.status_code != 200:
            log_test(f"❌ UPVOTE AGAIN FAILED: {upvote_again_response.text}")
            return False
            
        upvote_again_result = upvote_again_response.json()
        
        log_test("✅ Upvote Toggle Successful")
        log_test(f"✅ Action: {upvote_again_result.get('action')}")
        log_test(f"✅ Vote Count: {upvote_again_result.get('vote_count')}")
        log_test(f"Response: {json.dumps(upvote_again_result, indent=2)}")
        
        # Validate expected response (should toggle off)
        expected_action = "removed"
        expected_vote_count = 0
        
        if upvote_again_result.get("action") == expected_action:
            log_test(f"✅ action: {upvote_again_result.get('action')} (toggle off working)")
        else:
            log_test(f"❌ action: {upvote_again_result.get('action')} (expected {expected_action})")
            
        if upvote_again_result.get("vote_count") == expected_vote_count:
            log_test(f"✅ vote_count: {upvote_again_result.get('vote_count')} (toggle off working)")
        else:
            log_test(f"❌ vote_count: {upvote_again_result.get('vote_count')} (expected {expected_vote_count})")
        
    except Exception as e:
        log_test(f"❌ UPVOTE AGAIN ERROR: {str(e)}")
        return False
    
    # Step 8: Admin Governance: GET /api/admin/governance
    log_test("\nSTEP 8: Admin Governance - GET /api/admin/governance")
    try:
        governance_response = requests.get(f"{BASE_URL}/admin/governance", headers=headers)
        log_test(f"Admin Governance Status: {governance_response.status_code}")
        
        if governance_response.status_code != 200:
            log_test(f"❌ ADMIN GOVERNANCE FAILED: {governance_response.text}")
            return False
            
        governance_result = governance_response.json()
        
        log_test("✅ Admin Governance Successful")
        log_test(f"✅ Template Requests: {len(governance_result.get('template_requests', []))}")
        log_test(f"✅ Category Proposals: {len(governance_result.get('category_proposals', []))}")
        log_test(f"Response: {json.dumps(governance_result, indent=2)}")
        
        # Validate expected structure
        required_fields = ["template_requests", "category_proposals"]
        for field in required_fields:
            if field in governance_result:
                log_test(f"✅ {field}: present (array with {len(governance_result[field])} items)")
            else:
                log_test(f"❌ {field}: missing from response")
        
    except Exception as e:
        log_test(f"❌ ADMIN GOVERNANCE ERROR: {str(e)}")
        return False
    
    # Step 9: Coach Market Opportunities: GET /api/coach/market-opportunities
    log_test("\nSTEP 9: Coach Market Opportunities - GET /api/coach/market-opportunities")
    try:
        market_response = requests.get(f"{BASE_URL}/coach/market-opportunities", headers=headers)
        log_test(f"Coach Market Opportunities Status: {market_response.status_code}")
        
        if market_response.status_code != 200:
            log_test(f"❌ COACH MARKET OPPORTUNITIES FAILED: {market_response.text}")
            return False
            
        market_result = market_response.json()
        
        log_test("✅ Coach Market Opportunities Successful")
        log_test(f"✅ Found {len(market_result)} market opportunities")
        log_test(f"Response: {json.dumps(market_result, indent=2)}")
        
        # Validate that we have the Golf template request
        golf_requests = [req for req in market_result if req.get("discipline") == "Golf"]
        if golf_requests:
            log_test(f"✅ Found {len(golf_requests)} Golf template request(s) in market opportunities")
        else:
            log_test("⚠️ No Golf template requests found in market opportunities")
        
    except Exception as e:
        log_test(f"❌ COACH MARKET OPPORTUNITIES ERROR: {str(e)}")
        return False
    
    log_test("\n" + "=" * 70)
    log_test("🎉 GOVERNANCE & REQUEST ROUTING SYSTEM TEST COMPLETED SUCCESSFULLY")
    log_test("=" * 70)
    
    return True

if __name__ == "__main__":
    success = test_governance_request_routing()
    if not success:
        sys.exit(1)