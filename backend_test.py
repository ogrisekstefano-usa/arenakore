#!/usr/bin/env python3
"""
ARENAKORE Backend API Test Suite
Tests all backend endpoints comprehensively
Base URL: https://arena-crews.preview.emergentagent.com/api
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://arena-crews.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class APITester:
    def __init__(self):
        self.token = None
        self.user_data = None
        self.admin_token = None
        self.test_results = []
        
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
    
    def test_user_registration(self):
        """Test POST /api/auth/register"""
        test_name = "User Registration"
        
        # Use unique test data
        timestamp = datetime.now().strftime("%H%M%S")
        payload = {
            "username": f"test_final_{timestamp}",
            "email": f"final_{timestamp}@kore.com",
            "password": "testpassword123"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/register", 
                                   json=payload, headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.token = data["token"]
                    self.user_data = data["user"]
                    self.log_test(test_name, True, 
                                f"User registered: {data['user']['username']}, Token received")
                    return True
                else:
                    self.log_test(test_name, False, "Missing token or user in response", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_user_login(self):
        """Test POST /api/auth/login"""
        test_name = "User Login"
        
        if not self.user_data:
            self.log_test(test_name, False, "No user data from registration")
            return False
            
        payload = {
            "email": self.user_data["email"],
            "password": "testpassword123"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", 
                                   json=payload, headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    # Update token from login
                    self.token = data["token"]
                    self.log_test(test_name, True, 
                                f"Login successful for {data['user']['email']}")
                    return True
                else:
                    self.log_test(test_name, False, "Missing token or user in response", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_get_current_user(self):
        """Test GET /api/auth/me"""
        test_name = "Get Current User"
        
        if not self.token:
            self.log_test(test_name, False, "No auth token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/auth/me", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "username" in data:
                    self.log_test(test_name, True, 
                                f"User data retrieved: {data['username']}")
                    return True
                else:
                    self.log_test(test_name, False, "Invalid user data structure", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_sports_categories(self):
        """Test GET /api/sports/categories - should return 8 categories"""
        test_name = "Sports Categories"
        
        try:
            response = requests.get(f"{BASE_URL}/sports/categories", 
                                  headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == 8:
                    categories = [cat.get("label", "Unknown") for cat in data]
                    self.log_test(test_name, True, 
                                f"8 categories found: {', '.join(categories)}")
                    return True
                else:
                    self.log_test(test_name, False, 
                                f"Expected 8 categories, got {len(data) if isinstance(data, list) else 'non-list'}", 
                                data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_sports_by_category(self):
        """Test GET /api/sports/combat - should return list of combat sports"""
        test_name = "Sports by Category (Combat)"
        
        try:
            response = requests.get(f"{BASE_URL}/sports/combat", 
                                  headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "sports" in data and isinstance(data["sports"], list):
                    sports_count = len(data["sports"])
                    sports_names = [sport.get("label", "Unknown") for sport in data["sports"]]
                    self.log_test(test_name, True, 
                                f"Combat sports found ({sports_count}): {', '.join(sports_names[:5])}...")
                    return True
                else:
                    self.log_test(test_name, False, "Invalid sports data structure", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_sports_search(self):
        """Test GET /api/sports/search/basket - should find Basket in team category"""
        test_name = "Sports Search (Basket)"
        
        try:
            response = requests.get(f"{BASE_URL}/sports/search/basket", 
                                  headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Look for Basket sport
                    basket_found = False
                    for sport in data:
                        if "basket" in sport.get("label", "").lower():
                            basket_found = True
                            category = sport.get("category_label", sport.get("category", "Unknown"))
                            self.log_test(test_name, True, 
                                        f"Basket found in {category} category")
                            return True
                    
                    if not basket_found:
                        self.log_test(test_name, False, 
                                    f"Basket not found in search results", data)
                else:
                    self.log_test(test_name, False, "No search results returned", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_complete_onboarding(self):
        """Test PUT /api/auth/onboarding - should return user with DNA"""
        test_name = "Complete Onboarding"
        
        if not self.token:
            self.log_test(test_name, False, "No auth token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.token}"}
        payload = {
            "sport": "Basket",
            "category": "team",
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
    
    def test_get_battles(self):
        """Test GET /api/battles - should return battle list (was 404 before, now fixed)"""
        test_name = "Get Battles"
        
        if not self.token:
            self.log_test(test_name, False, "No auth token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/battles", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    battles_count = len(data)
                    if battles_count > 0:
                        battle_titles = [battle.get("title", "Unknown") for battle in data[:3]]
                        self.log_test(test_name, True, 
                                    f"Battles retrieved ({battles_count}): {', '.join(battle_titles)}...")
                    else:
                        self.log_test(test_name, True, "No battles available (empty list)")
                    return True
                else:
                    self.log_test(test_name, False, "Invalid battles data structure", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_challenge_complete(self):
        """Test POST /api/challenges/complete"""
        test_name = "Challenge Complete"
        
        if not self.token:
            self.log_test(test_name, False, "No auth token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.token}"}
        payload = {
            "performance_score": 85,
            "duration_seconds": 30
        }
        
        try:
            response = requests.post(f"{BASE_URL}/challenges/complete", 
                                   json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "xp_earned" in data and "status" in data:
                    xp_earned = data.get("xp_earned", 0)
                    level_up = data.get("level_up", False)
                    self.log_test(test_name, True, 
                                f"Challenge completed, XP earned: {xp_earned}, Level up: {level_up}")
                    return True
                else:
                    self.log_test(test_name, False, "Missing xp_earned or status", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_challenge_history(self):
        """Test GET /api/challenges/history"""
        test_name = "Challenge History"
        
        if not self.token:
            self.log_test(test_name, False, "No auth token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/challenges/history", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    history_count = len(data)
                    self.log_test(test_name, True, 
                                f"Challenge history retrieved ({history_count} entries)")
                    return True
                else:
                    self.log_test(test_name, False, "Invalid history data structure", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_admin_login(self):
        """Test admin login: POST /api/auth/login - verify is_admin=true in response"""
        test_name = "Admin Login"
        
        payload = {
            "email": "admin@arenadare.com",
            "password": "Admin2026!"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", 
                                   json=payload, headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    user = data["user"]
                    is_admin = user.get("is_admin", False)
                    if is_admin:
                        self.admin_token = data["token"]
                        self.log_test(test_name, True, 
                                    f"Admin login successful, is_admin: {is_admin}")
                        return True
                    else:
                        self.log_test(test_name, False, 
                                    f"Admin login successful but is_admin is {is_admin}", data)
                else:
                    self.log_test(test_name, False, "Missing token or user in response", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_global_leaderboard(self):
        """Test GET /api/leaderboard?type=global - should return users sorted by XP"""
        test_name = "Global Leaderboard"
        
        if not self.admin_token:
            self.log_test(test_name, False, "No admin token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/leaderboard?type=global", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0:
                        # Check if ArenaBoss is rank 1 with 9999 XP and is_admin=true
                        first_user = data[0]
                        required_fields = ["rank", "id", "username", "avatar_color", "sport", "category", "xp", "level", "is_admin"]
                        
                        missing_fields = [field for field in required_fields if field not in first_user]
                        if missing_fields:
                            self.log_test(test_name, False, f"Missing fields: {missing_fields}", first_user)
                            return False
                        
                        # Verify ArenaBoss is rank 1
                        if first_user["rank"] == 1 and first_user["xp"] >= 9999 and first_user["is_admin"]:
                            self.log_test(test_name, True, 
                                        f"Global leaderboard working: {first_user['username']} rank 1 with {first_user['xp']} XP, is_admin={first_user['is_admin']}")
                            return True
                        else:
                            self.log_test(test_name, False, 
                                        f"Expected ArenaBoss rank 1 with >=9999 XP and is_admin=true, got: rank={first_user['rank']}, xp={first_user['xp']}, is_admin={first_user['is_admin']}")
                    else:
                        self.log_test(test_name, False, "Empty leaderboard returned")
                else:
                    self.log_test(test_name, False, "Invalid leaderboard data structure", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_sport_leaderboard(self):
        """Test GET /api/leaderboard?type=sport&category=combat - should return only combat users"""
        test_name = "Sport Leaderboard (Combat)"
        
        if not self.admin_token:
            self.log_test(test_name, False, "No admin token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/leaderboard?type=sport&category=combat", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Check that all users have combat category
                    combat_users = [user for user in data if user.get("category") == "combat"]
                    if len(data) == len(combat_users):
                        self.log_test(test_name, True, 
                                    f"Sport leaderboard working: {len(data)} combat users returned")
                        return True
                    else:
                        self.log_test(test_name, False, 
                                    f"Expected all users to have combat category, got {len(combat_users)}/{len(data)}")
                else:
                    self.log_test(test_name, False, "Invalid leaderboard data structure", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_crews_leaderboard(self):
        """Test GET /api/leaderboard?type=crews - should return crews with weighted DNA"""
        test_name = "Crews Leaderboard"
        
        if not self.admin_token:
            self.log_test(test_name, False, "No admin token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/leaderboard?type=crews", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0:
                        # Check required fields for crews
                        first_crew = data[0]
                        required_fields = ["rank", "name", "category", "members_count", "xp_total", "weighted_dna"]
                        
                        missing_fields = [field for field in required_fields if field not in first_crew]
                        if missing_fields:
                            self.log_test(test_name, False, f"Missing fields: {missing_fields}", first_crew)
                            return False
                        
                        # Check weighted_dna has all 6 DNA keys
                        weighted_dna = first_crew["weighted_dna"]
                        dna_keys = ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]
                        missing_dna = [key for key in dna_keys if key not in weighted_dna]
                        
                        if missing_dna:
                            self.log_test(test_name, False, f"Missing DNA keys: {missing_dna}", weighted_dna)
                            return False
                        
                        self.log_test(test_name, True, 
                                    f"Crews leaderboard working: {len(data)} crews, weighted DNA with all 6 keys")
                        return True
                    else:
                        self.log_test(test_name, True, "No crews available (empty list)")
                        return True
                else:
                    self.log_test(test_name, False, "Invalid leaderboard data structure", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_my_rank_admin(self):
        """Test GET /api/leaderboard/my-rank - should return rank 1 for admin"""
        test_name = "My Rank (Admin)"
        
        if not self.admin_token:
            self.log_test(test_name, False, "No admin token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/leaderboard/my-rank", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["rank", "total", "xp", "next_username", "xp_gap", "is_top_10"]
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_test(test_name, False, f"Missing fields: {missing_fields}", data)
                    return False
                
                # Admin should be rank 1 with null next_username and 0 xp_gap
                if data["rank"] == 1 and data["next_username"] is None and data["xp_gap"] == 0 and data["is_top_10"]:
                    self.log_test(test_name, True, 
                                f"Admin rank correct: rank={data['rank']}, xp={data['xp']}, is_top_10={data['is_top_10']}")
                    return True
                else:
                    self.log_test(test_name, False, 
                                f"Expected rank=1, next_username=null, xp_gap=0, is_top_10=true, got: {data}")
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_my_rank_combat_category(self):
        """Test GET /api/leaderboard/my-rank?category=combat - should return rank within combat"""
        test_name = "My Rank (Combat Category)"
        
        if not self.admin_token:
            self.log_test(test_name, False, "No admin token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/leaderboard/my-rank?category=combat", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "rank" in data and "category" in data:
                    self.log_test(test_name, True, 
                                f"Combat category rank: rank={data['rank']}, category={data['category']}")
                    return True
                else:
                    self.log_test(test_name, False, "Missing rank or category in response", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_new_user_rank(self):
        """Test new user registration and rank check"""
        test_name = "New User Rank"
        
        # Register a new user
        timestamp = datetime.now().strftime("%H%M%S")
        payload = {
            "username": f"newuser_{timestamp}",
            "email": f"newuser_{timestamp}@kore.com",
            "password": "testpassword123"
        }
        
        try:
            # Register
            response = requests.post(f"{BASE_URL}/auth/register", 
                                   json=payload, headers=HEADERS, timeout=10)
            
            if response.status_code != 200:
                self.log_test(test_name, False, f"Registration failed: {response.status_code}")
                return False
            
            reg_data = response.json()
            new_user_token = reg_data["token"]
            
            # Complete onboarding
            headers = {**HEADERS, "Authorization": f"Bearer {new_user_token}"}
            onboarding_payload = {
                "sport": "Boxe",
                "category": "combat",
                "is_versatile": False
            }
            
            response = requests.put(f"{BASE_URL}/auth/onboarding", 
                                  json=onboarding_payload, headers=headers, timeout=10)
            
            if response.status_code != 200:
                self.log_test(test_name, False, f"Onboarding failed: {response.status_code}")
                return False
            
            # Check rank
            response = requests.get(f"{BASE_URL}/leaderboard/my-rank", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data["rank"] > 1 and data["next_username"] is not None:
                    self.log_test(test_name, True, 
                                f"New user rank correct: rank={data['rank']}, next_username={data['next_username']}")
                    return True
                else:
                    self.log_test(test_name, False, 
                                f"Expected rank > 1 and next_username populated, got: {data}")
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_leaderboard_caching(self):
        """Test caching: call GET /api/leaderboard twice quickly"""
        test_name = "Leaderboard Caching"
        
        if not self.admin_token:
            self.log_test(test_name, False, "No admin token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
        
        try:
            import time
            
            # First call
            start_time = time.time()
            response1 = requests.get(f"{BASE_URL}/leaderboard?type=global", 
                                   headers=headers, timeout=10)
            first_call_time = time.time() - start_time
            
            # Second call immediately
            start_time = time.time()
            response2 = requests.get(f"{BASE_URL}/leaderboard?type=global", 
                                   headers=headers, timeout=10)
            second_call_time = time.time() - start_time
            
            if response1.status_code == 200 and response2.status_code == 200:
                data1 = response1.json()
                data2 = response2.json()
                
                # Check if responses are identical (cached)
                if data1 == data2:
                    self.log_test(test_name, True, 
                                f"Caching working: identical responses, times: {first_call_time:.3f}s, {second_call_time:.3f}s")
                    return True
                else:
                    self.log_test(test_name, False, "Responses differ - caching may not be working")
            else:
                self.log_test(test_name, False, 
                            f"HTTP errors: {response1.status_code}, {response2.status_code}")
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    # ====================================
    # NEXUS SYNC SESSION TESTS
    # ====================================
    
    def test_nexus_session_start_squat(self):
        """Test POST /api/nexus/session/start - start squat session"""
        test_name = "Nexus Session Start (Squat)"
        
        if not self.admin_token:
            self.log_test(test_name, False, "No admin token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
        payload = {
            "exercise_type": "squat"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/nexus/session/start", 
                                   json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "session_id" in data and "exercise_type" in data and "status" in data:
                    if data["exercise_type"] == "squat" and data["status"] == "active":
                        # Store session_id for completion test
                        self.squat_session_id = data["session_id"]
                        self.log_test(test_name, True, 
                                    f"Squat session started: {data['session_id']}, status: {data['status']}")
                        return True
                    else:
                        self.log_test(test_name, False, f"Invalid exercise_type or status", data)
                else:
                    self.log_test(test_name, False, "Missing session_id, exercise_type, or status", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_nexus_session_complete_squat(self):
        """Test POST /api/nexus/session/{session_id}/complete - complete squat session"""
        test_name = "Nexus Session Complete (Squat)"
        
        if not self.admin_token:
            self.log_test(test_name, False, "No admin token available")
            return False
            
        if not hasattr(self, 'squat_session_id'):
            self.log_test(test_name, False, "No squat session_id available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
        payload = {
            "exercise_type": "squat",
            "reps_completed": 15,
            "quality_score": 85,
            "duration_seconds": 45,
            "peak_acceleration": 4.2,
            "avg_amplitude": 78.5
        }
        
        try:
            response = requests.post(f"{BASE_URL}/nexus/session/{self.squat_session_id}/complete", 
                                   json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["xp_earned", "quality_multiplier", "records_broken", "dna", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_test(test_name, False, f"Missing fields: {missing_fields}", data)
                    return False
                
                # Verify values
                if data["xp_earned"] > 0 and data["quality_multiplier"] > 1:
                    # Check user has onboarding_completed
                    user = data["user"]
                    if "onboarding_completed" in user:
                        # Store initial DNA and XP for comparison
                        self.initial_squat_dna = data["dna"]
                        self.initial_squat_xp = user["xp"]
                        self.squat_records = data["records_broken"]
                        
                        self.log_test(test_name, True, 
                                    f"Squat session completed: XP earned={data['xp_earned']}, quality_multiplier={data['quality_multiplier']}, records_broken={len(data['records_broken'])}, forza={data['dna'].get('forza', 'N/A')}")
                        return True
                    else:
                        self.log_test(test_name, False, "Missing onboarding_completed in user", user)
                else:
                    self.log_test(test_name, False, 
                                f"Invalid XP or quality multiplier: xp_earned={data['xp_earned']}, quality_multiplier={data['quality_multiplier']}")
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_nexus_session_start_punch(self):
        """Test POST /api/nexus/session/start - start punch session"""
        test_name = "Nexus Session Start (Punch)"
        
        if not self.admin_token:
            self.log_test(test_name, False, "No admin token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
        payload = {
            "exercise_type": "punch"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/nexus/session/start", 
                                   json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "session_id" in data and "exercise_type" in data and "status" in data:
                    if data["exercise_type"] == "punch" and data["status"] == "active":
                        # Store session_id for completion test
                        self.punch_session_id = data["session_id"]
                        self.log_test(test_name, True, 
                                    f"Punch session started: {data['session_id']}, status: {data['status']}")
                        return True
                    else:
                        self.log_test(test_name, False, f"Invalid exercise_type or status", data)
                else:
                    self.log_test(test_name, False, "Missing session_id, exercise_type, or status", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_nexus_session_complete_punch(self):
        """Test POST /api/nexus/session/{session_id}/complete - complete punch session"""
        test_name = "Nexus Session Complete (Punch)"
        
        if not self.admin_token:
            self.log_test(test_name, False, "No admin token available")
            return False
            
        if not hasattr(self, 'punch_session_id'):
            self.log_test(test_name, False, "No punch session_id available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
        payload = {
            "exercise_type": "punch",
            "reps_completed": 20,
            "quality_score": 90,
            "duration_seconds": 30,
            "peak_acceleration": 5.5,
            "avg_amplitude": 85.0
        }
        
        try:
            response = requests.post(f"{BASE_URL}/nexus/session/{self.punch_session_id}/complete", 
                                   json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["xp_earned", "quality_multiplier", "records_broken", "dna", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_test(test_name, False, f"Missing fields: {missing_fields}", data)
                    return False
                
                # Verify values and DNA changes for punch (velocita, potenza, agilita should increase)
                if data["xp_earned"] > 0 and data["quality_multiplier"] > 1:
                    dna = data["dna"]
                    # Check if velocita, potenza, agilita increased from initial squat DNA
                    if hasattr(self, 'initial_squat_dna'):
                        velocita_increased = dna.get("velocita", 0) > self.initial_squat_dna.get("velocita", 0)
                        potenza_increased = dna.get("potenza", 0) > self.initial_squat_dna.get("potenza", 0)
                        agilita_increased = dna.get("agilita", 0) > self.initial_squat_dna.get("agilita", 0)
                        
                        self.punch_dna = dna
                        self.punch_records = data["records_broken"]
                        
                        self.log_test(test_name, True, 
                                    f"Punch session completed: XP earned={data['xp_earned']}, velocita_increased={velocita_increased}, potenza_increased={potenza_increased}, agilita_increased={agilita_increased}")
                        return True
                    else:
                        self.log_test(test_name, True, 
                                    f"Punch session completed: XP earned={data['xp_earned']}, quality_multiplier={data['quality_multiplier']}")
                        return True
                else:
                    self.log_test(test_name, False, 
                                f"Invalid XP or quality multiplier: xp_earned={data['xp_earned']}, quality_multiplier={data['quality_multiplier']}")
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_nexus_session_history(self):
        """Test GET /api/nexus/sessions - get session history"""
        test_name = "Nexus Session History"
        
        if not self.admin_token:
            self.log_test(test_name, False, "No admin token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/nexus/sessions", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Should contain at least the sessions we just created
                    if len(data) >= 2:
                        # Check if we have squat and punch sessions
                        exercise_types = [session.get("exercise_type") for session in data]
                        has_squat = "squat" in exercise_types
                        has_punch = "punch" in exercise_types
                        
                        # Verify session structure
                        first_session = data[0]
                        required_fields = ["id", "exercise_type", "status", "reps_completed", "quality_score", "xp_earned", "duration_seconds", "started_at"]
                        missing_fields = [field for field in required_fields if field not in first_session]
                        
                        if missing_fields:
                            self.log_test(test_name, False, f"Missing fields in session: {missing_fields}", first_session)
                            return False
                        
                        self.log_test(test_name, True, 
                                    f"Session history retrieved: {len(data)} sessions, has_squat={has_squat}, has_punch={has_punch}")
                        return True
                    else:
                        self.log_test(test_name, False, f"Expected at least 2 sessions, got {len(data)}")
                else:
                    self.log_test(test_name, False, "Invalid session history data structure", data)
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def test_nexus_records_not_broken(self):
        """Test that second session with lower reps does NOT break records"""
        test_name = "Nexus Records Not Broken (Lower Reps)"
        
        if not self.admin_token:
            self.log_test(test_name, False, "No admin token available")
            return False
            
        headers = {**HEADERS, "Authorization": f"Bearer {self.admin_token}"}
        
        try:
            # Start another squat session
            start_payload = {"exercise_type": "squat"}
            start_response = requests.post(f"{BASE_URL}/nexus/session/start", 
                                         json=start_payload, headers=headers, timeout=10)
            
            if start_response.status_code != 200:
                self.log_test(test_name, False, f"Failed to start session: {start_response.status_code}")
                return False
            
            session_data = start_response.json()
            session_id = session_data["session_id"]
            
            # Complete with lower reps than first session (15 -> 10)
            complete_payload = {
                "exercise_type": "squat",
                "reps_completed": 10,  # Lower than previous 15
                "quality_score": 75,   # Lower than previous 85
                "duration_seconds": 40,
                "peak_acceleration": 3.8,  # Lower than previous 4.2
                "avg_amplitude": 70.0
            }
            
            complete_response = requests.post(f"{BASE_URL}/nexus/session/{session_id}/complete", 
                                            json=complete_payload, headers=headers, timeout=10)
            
            if complete_response.status_code == 200:
                data = complete_response.json()
                records_broken = data.get("records_broken", [])
                
                # Should have no records broken since all values are lower
                if len(records_broken) == 0:
                    self.log_test(test_name, True, 
                                f"Records correctly NOT broken with lower performance: reps=10, quality=75, acceleration=3.8")
                    return True
                else:
                    self.log_test(test_name, False, 
                                f"Unexpected records broken: {records_broken}")
            else:
                self.log_test(test_name, False, 
                            f"HTTP {complete_response.status_code}", complete_response.text)
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
        
        return False
    
    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("🚀 ARENAKORE Backend API Test Suite - NEXUS SYNC SESSION FOCUS")
        print(f"Base URL: {BASE_URL}")
        print("=" * 60)
        print()
        
        # Test sequence as specified in review request - NEXUS SYNC SESSION FOCUS
        tests = [
            # Core auth tests
            self.test_admin_login,
            
            # NEW NEXUS SYNC SESSION TESTS
            self.test_nexus_session_start_squat,
            self.test_nexus_session_complete_squat,
            self.test_nexus_session_start_punch,
            self.test_nexus_session_complete_punch,
            self.test_nexus_session_history,
            self.test_nexus_records_not_broken,
            
            # Verify existing endpoints still work (leaderboard, crews, auth)
            self.test_global_leaderboard,
            self.test_sport_leaderboard,
            self.test_crews_leaderboard,
            self.test_my_rank_admin,
            self.test_user_registration,
            self.test_user_login,
            self.test_get_current_user,
            self.test_sports_categories,
            self.test_sports_by_category,
            self.test_sports_search,
            self.test_complete_onboarding,
            self.test_get_battles,
            self.test_challenge_complete,
            self.test_challenge_history,
        ]
        
        passed = 0
        total = len(tests)
        
        for test_func in tests:
            if test_func():
                passed += 1
        
        print("=" * 60)
        print(f"📊 TEST SUMMARY: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED!")
        else:
            print("⚠️  Some tests failed. Check details above.")
            
        return passed == total

def main():
    """Main test runner"""
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()