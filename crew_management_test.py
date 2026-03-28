#!/usr/bin/env python3
"""
ARENAKORE Crew Management Backend API Test Suite
Tests all crew management endpoints comprehensively
Base URL: https://rank-infographic-hub.preview.emergentagent.com/api

FULL TEST FLOW:
1. Register User1 (crew_test_user1_XXX) → get token1
2. Register User2 (crew_test_user2_XXX) → get token2
3. Complete onboarding for both users (PUT /api/auth/onboarding with sport and category) - this gives them DNA stats
4. User1 creates a crew: POST /api/crews/create {name: "Test Crew Alpha", tagline: "La tribù del test", category: "combat"}
5. Verify: GET /api/crews/my-crews (token1) → should return the new crew with is_owner=true
6. User1 invites User2: POST /api/crews/{crew_id}/invite {username: "crew_test_user2_XXX"} (token1)
7. Verify: GET /api/crews/invites (token2) → should see pending invite
8. User2 accepts: POST /api/crews/invites/{invite_id}/accept (token2)
9. Verify crew detail: GET /api/crews/{crew_id} (token1) → should show:
   - 2 members
   - User1 has is_coach=true, role="Coach"
   - User2 has is_coach=false
   - crew_dna_average field present
10. Verify activity feed: GET /api/crews/{crew_id}/feed → should have "crew_created" and "member_joined" entries
11. Verify weighted average: GET /api/crews/{crew_id}/battle-stats → should return weighted_average_dna with all 6 DNA keys
12. Test User Search: GET /api/users/search/crew_test (token1) → should find user2
13. Test decline flow: User1 creates crew2, invites User2, User2 declines → verify status
14. Test duplicate invite prevention
15. Test existing member invite prevention
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://rank-infographic-hub.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class CrewManagementTester:
    def __init__(self):
        self.user1_token = None
        self.user1_data = None
        self.user2_token = None
        self.user2_data = None
        self.crew_id = None
        self.crew2_id = None
        self.invite_id = None
        self.test_results = []
        self.timestamp = datetime.now().strftime("%H%M%S")
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def register_user(self, user_num):
        """Register a test user"""
        test_name = f"Register User{user_num}"
        
        payload = {
            "username": f"crew_test_user{user_num}_{self.timestamp}",
            "email": f"crew_test_user{user_num}_{self.timestamp}@kore.com",
            "password": "testpassword123"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/register", 
                                   json=payload, headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    if user_num == 1:
                        self.user1_token = data["token"]
                        self.user1_data = data["user"]
                    else:
                        self.user2_token = data["token"]
                        self.user2_data = data["user"]
                    
                    self.log_test(test_name, True, 
                                f"User registered: {data['user']['username']}")
                    return True
                else:
                    self.log_test(test_name, False, "Missing token or user in response", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def complete_onboarding(self, user_num):
        """Complete onboarding for a user"""
        test_name = f"Complete Onboarding User{user_num}"
        
        token = self.user1_token if user_num == 1 else self.user2_token
        if not token:
            self.log_test(test_name, False, f"No token for user{user_num}")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {token}"}
        payload = {
            "sport": "MMA" if user_num == 1 else "Boxe",
            "category": "combat",
            "is_versatile": False
        }
        
        try:
            response = requests.put(f"{BASE_URL}/auth/onboarding", 
                                  json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "dna" in data and data["dna"] and "onboarding_completed" in data:
                    dna_stats = list(data["dna"].keys())
                    self.log_test(test_name, True, 
                                f"Onboarding completed, DNA generated: {', '.join(dna_stats)}")
                    return True
                else:
                    self.log_test(test_name, False, "Missing DNA or onboarding_completed", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_create_crew(self):
        """Test POST /api/crews/create"""
        test_name = "Create Crew"
        
        if not self.user1_token:
            self.log_test(test_name, False, "No token for user1")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.user1_token}"}
        payload = {
            "name": f"Test Crew Alpha {self.timestamp}",
            "tagline": "La tribù del test",
            "category": "combat"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/crews/create", 
                                   json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "name" in data and "is_owner" in data:
                    self.crew_id = data["id"]
                    is_owner = data.get("is_owner", False)
                    self.log_test(test_name, True, 
                                f"Crew created: {data['name']}, is_owner: {is_owner}")
                    return True
                else:
                    self.log_test(test_name, False, "Missing required fields in response", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_my_crews(self):
        """Test GET /api/crews/my-crews"""
        test_name = "Get My Crews"
        
        if not self.user1_token:
            self.log_test(test_name, False, "No token for user1")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.user1_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/crews/my-crews", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    crew = data[0]
                    if crew.get("is_owner") and crew.get("id") == self.crew_id:
                        self.log_test(test_name, True, 
                                    f"Found crew: {crew['name']}, is_owner: {crew['is_owner']}")
                        return True
                    else:
                        self.log_test(test_name, False, 
                                    f"Crew found but not owner or wrong ID", data)
                else:
                    self.log_test(test_name, False, "No crews found or invalid response", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_invite_user(self):
        """Test POST /api/crews/{crew_id}/invite"""
        test_name = "Invite User to Crew"
        
        if not self.user1_token or not self.crew_id or not self.user2_data:
            self.log_test(test_name, False, "Missing required data")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.user1_token}"}
        payload = {
            "username": self.user2_data["username"]
        }
        
        try:
            response = requests.post(f"{BASE_URL}/crews/{self.crew_id}/invite", 
                                   json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "invited":
                    self.log_test(test_name, True, 
                                f"User invited: {data.get('username')}")
                    return True
                else:
                    self.log_test(test_name, False, "Invalid response status", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_get_invites(self):
        """Test GET /api/crews/invites"""
        test_name = "Get Pending Invites"
        
        if not self.user2_token:
            self.log_test(test_name, False, "No token for user2")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.user2_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/crews/invites", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    invite = data[0]
                    if "id" in invite and "crew_id" in invite:
                        self.invite_id = invite["id"]
                        self.log_test(test_name, True, 
                                    f"Pending invite found: {invite.get('crew_name')}")
                        return True
                    else:
                        self.log_test(test_name, False, "Invalid invite structure", data)
                else:
                    self.log_test(test_name, False, "No pending invites found", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_accept_invite(self):
        """Test POST /api/crews/invites/{invite_id}/accept"""
        test_name = "Accept Crew Invite"
        
        if not self.user2_token or not self.invite_id:
            self.log_test(test_name, False, "Missing token or invite ID")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.user2_token}"}
        
        try:
            response = requests.post(f"{BASE_URL}/crews/invites/{self.invite_id}/accept", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "accepted":
                    self.log_test(test_name, True, 
                                f"Invite accepted successfully")
                    return True
                else:
                    self.log_test(test_name, False, "Invalid response status", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_crew_detail(self):
        """Test GET /api/crews/{crew_id} - verify members, coach role, DNA average"""
        test_name = "Get Crew Detail"
        
        if not self.user1_token or not self.crew_id:
            self.log_test(test_name, False, "Missing token or crew ID")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.user1_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/crews/{self.crew_id}", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                members = data.get("members", [])
                crew_dna_avg = data.get("crew_dna_average")
                
                if len(members) == 2 and crew_dna_avg:
                    # Check coach role
                    coach_found = False
                    member_found = False
                    
                    for member in members:
                        if member.get("is_coach"):
                            coach_found = True
                            if member.get("role") != "Coach":
                                self.log_test(test_name, False, 
                                            f"Coach role incorrect: {member.get('role')}")
                                return False
                        else:
                            member_found = True
                    
                    if coach_found and member_found:
                        dna_keys = list(crew_dna_avg.keys())
                        self.log_test(test_name, True, 
                                    f"2 members, coach role verified, DNA average: {', '.join(dna_keys)}")
                        return True
                    else:
                        self.log_test(test_name, False, 
                                    f"Coach/member roles not found correctly", data)
                else:
                    self.log_test(test_name, False, 
                                f"Expected 2 members and DNA average, got {len(members)} members", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_crew_feed(self):
        """Test GET /api/crews/{crew_id}/feed"""
        test_name = "Get Crew Activity Feed"
        
        if not self.user1_token or not self.crew_id:
            self.log_test(test_name, False, "Missing token or crew ID")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.user1_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/crews/{self.crew_id}/feed", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 2:
                    # Look for crew_created and member_joined entries
                    types_found = [entry.get("type") for entry in data]
                    if "crew_created" in types_found and "member_joined" in types_found:
                        self.log_test(test_name, True, 
                                    f"Activity feed has {len(data)} entries: {', '.join(types_found)}")
                        return True
                    else:
                        self.log_test(test_name, False, 
                                    f"Missing expected activity types: {types_found}", data)
                else:
                    self.log_test(test_name, False, 
                                f"Expected at least 2 feed entries, got {len(data) if isinstance(data, list) else 'non-list'}", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_crew_battle_stats(self):
        """Test GET /api/crews/{crew_id}/battle-stats"""
        test_name = "Get Crew Battle Stats"
        
        if not self.user1_token or not self.crew_id:
            self.log_test(test_name, False, "Missing token or crew ID")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.user1_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/crews/{self.crew_id}/battle-stats", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                weighted_avg = data.get("weighted_average_dna")
                
                if weighted_avg and isinstance(weighted_avg, dict):
                    expected_keys = ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]
                    if all(key in weighted_avg for key in expected_keys):
                        self.log_test(test_name, True, 
                                    f"Weighted average DNA with all 6 keys: {list(weighted_avg.keys())}")
                        return True
                    else:
                        missing_keys = [k for k in expected_keys if k not in weighted_avg]
                        self.log_test(test_name, False, 
                                    f"Missing DNA keys: {missing_keys}", data)
                else:
                    self.log_test(test_name, False, "Missing or invalid weighted_average_dna", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_user_search(self):
        """Test GET /api/users/search/{query}"""
        test_name = "User Search"
        
        if not self.user1_token:
            self.log_test(test_name, False, "No token for user1")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.user1_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/users/search/crew_test", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Should find user2
                    user2_found = False
                    for user in data:
                        if user.get("username") == self.user2_data["username"]:
                            user2_found = True
                            break
                    
                    if user2_found:
                        self.log_test(test_name, True, 
                                    f"Found {len(data)} users, including user2")
                        return True
                    else:
                        self.log_test(test_name, False, 
                                    f"User2 not found in search results", data)
                else:
                    self.log_test(test_name, False, "No users found in search", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_decline_flow(self):
        """Test decline invite flow"""
        test_name = "Decline Invite Flow"
        
        if not self.user1_token or not self.user2_token:
            self.log_test(test_name, False, "Missing tokens")
            return False
        
        # User1 creates second crew
        headers1 = {**HEADERS, "Authorization": f"Bearer {self.user1_token}"}
        payload = {
            "name": f"Test Crew Beta {self.timestamp}",
            "tagline": "Crew per test decline",
            "category": "combat"
        }
        
        try:
            # Create crew2
            response = requests.post(f"{BASE_URL}/crews/create", 
                                   json=payload, headers=headers1, timeout=10)
            
            if response.status_code != 200:
                self.log_test(test_name, False, f"Failed to create crew2: {response.status_code}")
                return False
            
            crew2_data = response.json()
            self.crew2_id = crew2_data["id"]
            
            # Invite user2 to crew2
            invite_payload = {"username": self.user2_data["username"]}
            response = requests.post(f"{BASE_URL}/crews/{self.crew2_id}/invite", 
                                   json=invite_payload, headers=headers1, timeout=10)
            
            if response.status_code != 200:
                self.log_test(test_name, False, f"Failed to invite to crew2: {response.status_code}")
                return False
            
            # Get invites for user2
            headers2 = {**HEADERS, "Authorization": f"Bearer {self.user2_token}"}
            response = requests.get(f"{BASE_URL}/crews/invites", 
                                  headers=headers2, timeout=10)
            
            if response.status_code != 200:
                self.log_test(test_name, False, f"Failed to get invites: {response.status_code}")
                return False
            
            invites = response.json()
            crew2_invite = None
            for invite in invites:
                if invite.get("crew_id") == self.crew2_id:
                    crew2_invite = invite
                    break
            
            if not crew2_invite:
                self.log_test(test_name, False, "Crew2 invite not found")
                return False
            
            # Decline the invite
            response = requests.post(f"{BASE_URL}/crews/invites/{crew2_invite['id']}/decline", 
                                   headers=headers2, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "declined":
                    self.log_test(test_name, True, "Invite declined successfully")
                    return True
                else:
                    self.log_test(test_name, False, f"Invalid decline status: {data}")
            else:
                self.log_test(test_name, False, f"Failed to decline: {response.status_code}")
                
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_duplicate_invite_prevention(self):
        """Test that duplicate pending invites are prevented"""
        test_name = "Duplicate Pending Invite Prevention"
        
        if not self.user1_token or not self.crew2_id or not self.user2_data:
            self.log_test(test_name, False, "Missing required data")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.user1_token}"}
        payload = {"username": self.user2_data["username"]}
        
        try:
            # First, invite user2 to crew2 (should succeed - re-invite after decline is allowed)
            response = requests.post(f"{BASE_URL}/crews/{self.crew2_id}/invite", 
                                   json=payload, headers=headers, timeout=10)
            
            if response.status_code != 200:
                self.log_test(test_name, False, f"First invite failed: {response.status_code}")
                return False
            
            # Now try to invite user2 to crew2 again while invite is pending (should fail)
            response = requests.post(f"{BASE_URL}/crews/{self.crew2_id}/invite", 
                                   json=payload, headers=headers, timeout=10)
            
            if response.status_code == 400:
                self.log_test(test_name, True, "Duplicate pending invite correctly prevented")
                return True
            else:
                self.log_test(test_name, False, 
                            f"Expected 400 for duplicate pending invite, got {response.status_code}")
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_existing_member_invite_prevention(self):
        """Test that inviting existing members is prevented"""
        test_name = "Existing Member Invite Prevention"
        
        if not self.user1_token or not self.crew_id or not self.user2_data:
            self.log_test(test_name, False, "Missing required data")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.user1_token}"}
        payload = {"username": self.user2_data["username"]}
        
        try:
            # Try to invite user2 to crew1 again (should fail - already member)
            response = requests.post(f"{BASE_URL}/crews/{self.crew_id}/invite", 
                                   json=payload, headers=headers, timeout=10)
            
            if response.status_code == 400:
                self.log_test(test_name, True, "Existing member invite correctly prevented")
                return True
            else:
                self.log_test(test_name, False, 
                            f"Expected 400 for existing member invite, got {response.status_code}")
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def run_all_tests(self):
        """Run all crew management tests in sequence"""
        print("🚀 ARENAKORE Crew Management Backend API Test Suite")
        print(f"Base URL: {BASE_URL}")
        print("=" * 70)
        print()
        
        # Test sequence as specified in review request
        tests = [
            # Setup phase
            lambda: self.register_user(1),
            lambda: self.register_user(2),
            lambda: self.complete_onboarding(1),
            lambda: self.complete_onboarding(2),
            
            # Core crew management flow
            self.test_create_crew,
            self.test_my_crews,
            self.test_invite_user,
            self.test_get_invites,
            self.test_accept_invite,
            self.test_crew_detail,
            self.test_crew_feed,
            self.test_crew_battle_stats,
            self.test_user_search,
            
            # Edge cases
            self.test_decline_flow,
            self.test_duplicate_invite_prevention,
            self.test_existing_member_invite_prevention,
        ]
        
        passed = 0
        total = len(tests)
        
        for test_func in tests:
            if test_func():
                passed += 1
        
        print("=" * 70)
        print(f"📊 TEST SUMMARY: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL CREW MANAGEMENT TESTS PASSED!")
        else:
            print("⚠️  Some tests failed. Check details above.")
            
        return passed == total

def main():
    """Main test runner"""
    tester = CrewManagementTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()