#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND TESTING — GYM HUB & QR-CORE ENGINE (Sprint 3)
Test ALL 13 new GYM HUB endpoints in the exact order specified in the review request.
"""

import requests
import json
import base64
import time
from datetime import datetime

# Base URL from frontend/.env
BASE_URL = "https://rescan-pro-evolution.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@arenadare.com"
ADMIN_PASSWORD = "Admin2026!"

class GymHubTester:
    def __init__(self):
        self.admin_token = None
        self.coach_token = None
        self.gym_id = None
        self.event_id = None
        self.event_code = None
        self.coach_id = None
        self.coach_username = None
        self.test_results = []
        
    def log_result(self, step, endpoint, status, details=""):
        """Log test result"""
        result = {
            "step": step,
            "endpoint": endpoint,
            "status": "✅ PASS" if status else "❌ FAIL",
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{result['step']}: {result['endpoint']} - {result['status']}")
        if details:
            print(f"   Details: {details}")
        print()
        
    def test_step_1_admin_login(self):
        """STEP 1: Login as admin"""
        print("=== STEP 1: Login as admin ===")
        
        payload = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.admin_token = data["token"]
                    admin_user = data["user"]
                    
                    # Verify admin privileges
                    if admin_user.get("is_admin") == True:
                        self.log_result("STEP 1", "POST /api/auth/login", True, 
                                      f"Admin login successful. Token received. User: {admin_user.get('username')}, is_admin: {admin_user.get('is_admin')}")
                        return True
                    else:
                        self.log_result("STEP 1", "POST /api/auth/login", False, 
                                      f"User logged in but is_admin={admin_user.get('is_admin')}, expected True")
                        return False
                else:
                    self.log_result("STEP 1", "POST /api/auth/login", False, 
                                  f"Missing token or user in response: {data}")
                    return False
            else:
                self.log_result("STEP 1", "POST /api/auth/login", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 1", "POST /api/auth/login", False, f"Exception: {str(e)}")
            return False
    
    def test_step_2_get_create_gym(self):
        """STEP 2: Get/Create Gym"""
        print("=== STEP 2: Get/Create Gym ===")
        
        if not self.admin_token:
            self.log_result("STEP 2", "GET /api/gym/me", False, "No admin token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/gym/me", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["id", "name", "coaches_count", "events_count"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.gym_id = data["id"]
                    self.log_result("STEP 2", "GET /api/gym/me", True, 
                                  f"Gym auto-created/retrieved. ID: {data['id']}, Name: {data['name']}, Coaches: {data['coaches_count']}, Events: {data['events_count']}")
                    return True
                else:
                    self.log_result("STEP 2", "GET /api/gym/me", False, 
                                  f"Missing required fields: {missing_fields}. Response: {data}")
                    return False
            else:
                self.log_result("STEP 2", "GET /api/gym/me", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 2", "GET /api/gym/me", False, f"Exception: {str(e)}")
            return False
    
    def test_step_3_update_gym_profile(self):
        """STEP 3: Update Gym Profile"""
        print("=== STEP 3: Update Gym Profile ===")
        
        if not self.admin_token:
            self.log_result("STEP 3", "PUT /api/gym/me", False, "No admin token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        payload = {
            "name": "ARENA ELITE GYM",
            "address": "Via Roma 42, Milano",
            "description": "La palestra d'élite per atleti KORE"
        }
        
        try:
            response = requests.put(f"{BASE_URL}/gym/me", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify name was updated
                if data.get("name") == "ARENA ELITE GYM":
                    self.log_result("STEP 3", "PUT /api/gym/me", True, 
                                  f"Gym profile updated. Name: {data.get('name')}, Address: {data.get('address')}")
                    return True
                else:
                    self.log_result("STEP 3", "PUT /api/gym/me", False, 
                                  f"Name not updated correctly. Expected: 'ARENA ELITE GYM', Got: {data.get('name')}")
                    return False
            else:
                self.log_result("STEP 3", "PUT /api/gym/me", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 3", "PUT /api/gym/me", False, f"Exception: {str(e)}")
            return False
    
    def test_step_4_register_coach_user(self):
        """STEP 4: Register a test coach user"""
        print("=== STEP 4: Register a test coach user ===")
        
        # Generate unique username with timestamp
        timestamp = str(int(time.time()))
        self.coach_username = f"coach_test_sprint3_{timestamp}"
        
        payload = {
            "username": self.coach_username,
            "email": f"coach_sprint3_{timestamp}@test.com",
            "password": "Test123!"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/register", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.coach_token = data["token"]
                    coach_user = data["user"]
                    self.coach_id = coach_user["id"]
                    
                    self.log_result("STEP 4", "POST /api/auth/register", True, 
                                  f"Coach user registered. Username: {self.coach_username}, ID: {self.coach_id}")
                    return True
                else:
                    self.log_result("STEP 4", "POST /api/auth/register", False, 
                                  f"Missing token or user in response: {data}")
                    return False
            else:
                self.log_result("STEP 4", "POST /api/auth/register", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 4", "POST /api/auth/register", False, f"Exception: {str(e)}")
            return False
    
    def test_step_5_add_coach_to_gym(self):
        """STEP 5: Add coach to gym"""
        print("=== STEP 5: Add coach to gym ===")
        
        if not self.admin_token or not self.coach_username:
            self.log_result("STEP 5", "POST /api/gym/coaches", False, "Missing admin token or coach username")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        payload = {"username": self.coach_username}
        
        try:
            response = requests.post(f"{BASE_URL}/gym/coaches", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                if data.get("status") == "associated" and "coach" in data:
                    coach_data = data["coach"]
                    if coach_data.get("username") == self.coach_username:
                        self.log_result("STEP 5", "POST /api/gym/coaches", True, 
                                      f"Coach associated successfully. Status: {data['status']}, Coach: {coach_data['username']}")
                        return True
                    else:
                        self.log_result("STEP 5", "POST /api/gym/coaches", False, 
                                      f"Username mismatch. Expected: {self.coach_username}, Got: {coach_data.get('username')}")
                        return False
                else:
                    self.log_result("STEP 5", "POST /api/gym/coaches", False, 
                                  f"Invalid response structure: {data}")
                    return False
            else:
                self.log_result("STEP 5", "POST /api/gym/coaches", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 5", "POST /api/gym/coaches", False, f"Exception: {str(e)}")
            return False
    
    def test_step_6_list_coaches(self):
        """STEP 6: List coaches"""
        print("=== STEP 6: List coaches ===")
        
        if not self.admin_token:
            self.log_result("STEP 6", "GET /api/gym/coaches", False, "No admin token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/gym/coaches", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify it's an array with at least 1 coach
                if isinstance(data, list) and len(data) >= 1:
                    # Check if our coach is in the list
                    coach_found = False
                    for coach in data:
                        if coach.get("username") == self.coach_username:
                            coach_found = True
                            # Verify templates_count field exists
                            if "templates_count" in coach:
                                self.log_result("STEP 6", "GET /api/gym/coaches", True, 
                                              f"Coaches list retrieved. Count: {len(data)}, Coach found: {self.coach_username}, Templates: {coach['templates_count']}")
                                return True
                            else:
                                self.log_result("STEP 6", "GET /api/gym/coaches", False, 
                                              f"Coach found but missing templates_count field: {coach}")
                                return False
                    
                    if not coach_found:
                        self.log_result("STEP 6", "GET /api/gym/coaches", False, 
                                      f"Coach {self.coach_username} not found in coaches list: {[c.get('username') for c in data]}")
                        return False
                else:
                    self.log_result("STEP 6", "GET /api/gym/coaches", False, 
                                  f"Expected array with at least 1 coach, got: {data}")
                    return False
            else:
                self.log_result("STEP 6", "GET /api/gym/coaches", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 6", "GET /api/gym/coaches", False, f"Exception: {str(e)}")
            return False
    
    def test_step_7_create_mass_event(self):
        """STEP 7: Create Mass Event"""
        print("=== STEP 7: Create Mass Event ===")
        
        if not self.admin_token:
            self.log_result("STEP 7", "POST /api/gym/events", False, "No admin token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        payload = {
            "title": "KORE NIGHT CHALLENGE",
            "description": "Sfida di massa live alla ARENA ELITE",
            "exercise": "squat",
            "difficulty": "hard",
            "event_date": "2026-04-15",
            "event_time": "20:00",
            "max_participants": 100,
            "xp_reward": 200
        }
        
        try:
            response = requests.post(f"{BASE_URL}/gym/events", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["id", "event_code", "qr_base64", "gym_name", "status"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.event_id = data["id"]
                    self.event_code = data["event_code"]
                    
                    # Verify event_code is 8 characters
                    if len(data["event_code"]) == 8:
                        # Verify qr_base64 is a long base64 string
                        qr_base64 = data["qr_base64"]
                        if len(qr_base64) > 100 and self._is_valid_base64(qr_base64):
                            self.log_result("STEP 7", "POST /api/gym/events", True, 
                                          f"Event created. ID: {data['id']}, Code: {data['event_code']}, Status: {data['status']}, QR length: {len(qr_base64)}")
                            return True
                        else:
                            self.log_result("STEP 7", "POST /api/gym/events", False, 
                                          f"Invalid QR base64. Length: {len(qr_base64)}, Valid base64: {self._is_valid_base64(qr_base64)}")
                            return False
                    else:
                        self.log_result("STEP 7", "POST /api/gym/events", False, 
                                      f"Event code should be 8 characters, got: {len(data['event_code'])} - '{data['event_code']}'")
                        return False
                else:
                    self.log_result("STEP 7", "POST /api/gym/events", False, 
                                  f"Missing required fields: {missing_fields}. Response: {data}")
                    return False
            else:
                self.log_result("STEP 7", "POST /api/gym/events", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 7", "POST /api/gym/events", False, f"Exception: {str(e)}")
            return False
    
    def test_step_8_list_events(self):
        """STEP 8: List Events"""
        print("=== STEP 8: List Events ===")
        
        if not self.admin_token:
            self.log_result("STEP 8", "GET /api/gym/events", False, "No admin token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/gym/events", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify it's an array with at least our created event
                if isinstance(data, list) and len(data) >= 1:
                    # Find our event
                    event_found = False
                    for event in data:
                        if event.get("id") == self.event_id:
                            event_found = True
                            # Verify qr_base64 is included
                            if "qr_base64" in event and len(event["qr_base64"]) > 100:
                                self.log_result("STEP 8", "GET /api/gym/events", True, 
                                              f"Events list retrieved. Count: {len(data)}, Event found: {event['title']}, QR included: Yes")
                                return True
                            else:
                                self.log_result("STEP 8", "GET /api/gym/events", False, 
                                              f"Event found but missing or invalid qr_base64: {event.get('qr_base64', 'MISSING')[:50]}...")
                                return False
                    
                    if not event_found:
                        self.log_result("STEP 8", "GET /api/gym/events", False, 
                                      f"Created event {self.event_id} not found in events list")
                        return False
                else:
                    self.log_result("STEP 8", "GET /api/gym/events", False, 
                                  f"Expected array with at least 1 event, got: {data}")
                    return False
            else:
                self.log_result("STEP 8", "GET /api/gym/events", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 8", "GET /api/gym/events", False, f"Exception: {str(e)}")
            return False
    
    def test_step_9_get_event_detail(self):
        """STEP 9: Get Event Detail"""
        print("=== STEP 9: Get Event Detail ===")
        
        if not self.admin_token or not self.event_id:
            self.log_result("STEP 9", f"GET /api/gym/events/{self.event_id}", False, "Missing admin token or event ID")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/gym/events/{self.event_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["participants", "qr_base64", "join_url"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    participants = data["participants"]
                    # Should be empty initially
                    if isinstance(participants, list):
                        self.log_result("STEP 9", f"GET /api/gym/events/{self.event_id}", True, 
                                      f"Event detail retrieved. Participants: {len(participants)}, QR: Yes, Join URL: {data['join_url'][:50]}...")
                        return True
                    else:
                        self.log_result("STEP 9", f"GET /api/gym/events/{self.event_id}", False, 
                                      f"Participants should be array, got: {type(participants)}")
                        return False
                else:
                    self.log_result("STEP 9", f"GET /api/gym/events/{self.event_id}", False, 
                                  f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("STEP 9", f"GET /api/gym/events/{self.event_id}", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 9", f"GET /api/gym/events/{self.event_id}", False, f"Exception: {str(e)}")
            return False
    
    def test_step_10_get_event_qr(self):
        """STEP 10: Get Event QR"""
        print("=== STEP 10: Get Event QR ===")
        
        if not self.admin_token or not self.event_id:
            self.log_result("STEP 10", f"GET /api/gym/events/{self.event_id}/qr", False, "Missing admin token or event ID")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/gym/events/{self.event_id}/qr", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["qr_base64", "event_code", "join_url", "gym_name", "exercise", "difficulty"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("STEP 10", f"GET /api/gym/events/{self.event_id}/qr", True, 
                                  f"Event QR retrieved. Code: {data['event_code']}, Exercise: {data['exercise']}, Difficulty: {data['difficulty']}")
                    return True
                else:
                    self.log_result("STEP 10", f"GET /api/gym/events/{self.event_id}/qr", False, 
                                  f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("STEP 10", f"GET /api/gym/events/{self.event_id}/qr", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 10", f"GET /api/gym/events/{self.event_id}/qr", False, f"Exception: {str(e)}")
            return False
    
    def test_step_11_public_qr_scan(self):
        """STEP 11: PUBLIC QR Scan Landing (NO AUTH!)"""
        print("=== STEP 11: PUBLIC QR Scan Landing (NO AUTH!) ===")
        
        if not self.event_code:
            self.log_result("STEP 11", f"GET /api/gym/join/{self.event_code}", False, "No event code available")
            return False
        
        # NO AUTH HEADER - this is public
        try:
            response = requests.get(f"{BASE_URL}/gym/join/{self.event_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["title", "gym", "deep_link"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    gym = data["gym"]
                    deep_link = data["deep_link"]
                    
                    # Verify gym has name
                    if "name" in gym and "ios" in deep_link and "android" in deep_link and "universal" in deep_link:
                        self.log_result("STEP 11", f"GET /api/gym/join/{self.event_code}", True, 
                                      f"Public QR scan successful. Title: {data['title']}, Gym: {gym['name']}, Deep links: iOS, Android, Universal")
                        return True
                    else:
                        self.log_result("STEP 11", f"GET /api/gym/join/{self.event_code}", False, 
                                      f"Missing gym.name or deep_link fields. Gym: {gym}, Deep_link: {deep_link}")
                        return False
                else:
                    self.log_result("STEP 11", f"GET /api/gym/join/{self.event_code}", False, 
                                  f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("STEP 11", f"GET /api/gym/join/{self.event_code}", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 11", f"GET /api/gym/join/{self.event_code}", False, f"Exception: {str(e)}")
            return False
    
    def test_step_12_join_event_as_coach(self):
        """STEP 12: Join event as coach user"""
        print("=== STEP 12: Join event as coach user ===")
        
        if not self.coach_token or not self.event_id:
            self.log_result("STEP 12", f"POST /api/gym/events/{self.event_id}/join", False, "Missing coach token or event ID")
            return False
            
        headers = {"Authorization": f"Bearer {self.coach_token}"}
        
        try:
            response = requests.post(f"{BASE_URL}/gym/events/{self.event_id}/join", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response
                if data.get("status") == "joined" and data.get("participants_count") == 1:
                    self.log_result("STEP 12", f"POST /api/gym/events/{self.event_id}/join", True, 
                                  f"Coach joined event successfully. Status: {data['status']}, Participants: {data['participants_count']}")
                    return True
                else:
                    self.log_result("STEP 12", f"POST /api/gym/events/{self.event_id}/join", False, 
                                  f"Unexpected response. Status: {data.get('status')}, Participants: {data.get('participants_count')}")
                    return False
            else:
                self.log_result("STEP 12", f"POST /api/gym/events/{self.event_id}/join", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 12", f"POST /api/gym/events/{self.event_id}/join", False, f"Exception: {str(e)}")
            return False
    
    def test_step_13_enroll_via_event_code(self):
        """STEP 13: Enroll via event code"""
        print("=== STEP 13: Enroll via event code ===")
        
        if not self.coach_token or not self.event_code:
            self.log_result("STEP 13", f"POST /api/gym/join/{self.event_code}/enroll", False, "Missing coach token or event code")
            return False
            
        headers = {"Authorization": f"Bearer {self.coach_token}"}
        
        try:
            response = requests.post(f"{BASE_URL}/gym/join/{self.event_code}/enroll", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return already_enrolled since we joined in step 12
                if data.get("status") == "already_enrolled":
                    self.log_result("STEP 13", f"POST /api/gym/join/{self.event_code}/enroll", True, 
                                  f"Enroll via code successful. Status: {data['status']} (expected since already joined)")
                    return True
                else:
                    self.log_result("STEP 13", f"POST /api/gym/join/{self.event_code}/enroll", False, 
                                  f"Expected 'already_enrolled', got: {data.get('status')}")
                    return False
            else:
                self.log_result("STEP 13", f"POST /api/gym/join/{self.event_code}/enroll", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 13", f"POST /api/gym/join/{self.event_code}/enroll", False, f"Exception: {str(e)}")
            return False
    
    def test_step_14_remove_coach(self):
        """STEP 14: Remove coach"""
        print("=== STEP 14: Remove coach ===")
        
        if not self.admin_token or not self.coach_id:
            self.log_result("STEP 14", f"DELETE /api/gym/coaches/{self.coach_id}", False, "Missing admin token or coach ID")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.delete(f"{BASE_URL}/gym/coaches/{self.coach_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("status") == "removed":
                    self.log_result("STEP 14", f"DELETE /api/gym/coaches/{self.coach_id}", True, 
                                  f"Coach removed successfully. Status: {data['status']}")
                    return True
                else:
                    self.log_result("STEP 14", f"DELETE /api/gym/coaches/{self.coach_id}", False, 
                                  f"Expected 'removed', got: {data.get('status')}")
                    return False
            else:
                self.log_result("STEP 14", f"DELETE /api/gym/coaches/{self.coach_id}", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 14", f"DELETE /api/gym/coaches/{self.coach_id}", False, f"Exception: {str(e)}")
            return False
    
    def test_step_15_update_event_status(self):
        """STEP 15: Update event status"""
        print("=== STEP 15: Update event status ===")
        
        if not self.admin_token or not self.event_id:
            self.log_result("STEP 15", f"PUT /api/gym/events/{self.event_id}/status", False, "Missing admin token or event ID")
            return False
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        payload = {"status": "live"}
        
        try:
            response = requests.put(f"{BASE_URL}/gym/events/{self.event_id}/status", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("status") == "live":
                    self.log_result("STEP 15", f"PUT /api/gym/events/{self.event_id}/status", True, 
                                  f"Event status updated to live. Status: {data['status']}")
                    return True
                else:
                    self.log_result("STEP 15", f"PUT /api/gym/events/{self.event_id}/status", False, 
                                  f"Expected 'live', got: {data.get('status')}")
                    return False
            else:
                self.log_result("STEP 15", f"PUT /api/gym/events/{self.event_id}/status", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 15", f"PUT /api/gym/events/{self.event_id}/status", False, f"Exception: {str(e)}")
            return False
    
    def test_step_16_try_join_completed_event(self):
        """STEP 16: Try join completed event"""
        print("=== STEP 16: Try join completed event ===")
        
        if not self.admin_token or not self.event_id:
            self.log_result("STEP 16", "Completed Event Join Test", False, "Missing admin token or event ID")
            return False
        
        # First, set event status to completed
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        payload = {"status": "completed"}
        
        try:
            # Update to completed
            response = requests.put(f"{BASE_URL}/gym/events/{self.event_id}/status", json=payload, headers=headers)
            
            if response.status_code != 200:
                self.log_result("STEP 16", "Set Event to Completed", False, 
                              f"Failed to set event to completed: HTTP {response.status_code}")
                return False
            
            # Register a new user
            timestamp = str(int(time.time()))
            new_user_payload = {
                "username": f"test_user_{timestamp}",
                "email": f"test_{timestamp}@test.com",
                "password": "Test123!"
            }
            
            reg_response = requests.post(f"{BASE_URL}/auth/register", json=new_user_payload)
            
            if reg_response.status_code != 200:
                self.log_result("STEP 16", "Register New User", False, 
                              f"Failed to register new user: HTTP {reg_response.status_code}")
                return False
            
            new_user_token = reg_response.json()["token"]
            new_headers = {"Authorization": f"Bearer {new_user_token}"}
            
            # Try to join the completed event
            join_response = requests.post(f"{BASE_URL}/gym/events/{self.event_id}/join", headers=new_headers)
            
            # Should return 400 with "Evento già concluso"
            if join_response.status_code == 400:
                error_text = join_response.text
                if "concluso" in error_text.lower() or "completed" in error_text.lower():
                    self.log_result("STEP 16", "Try Join Completed Event", True, 
                                  f"Correctly rejected join attempt on completed event: {error_text}")
                    return True
                else:
                    self.log_result("STEP 16", "Try Join Completed Event", False, 
                                  f"Got 400 but wrong error message: {error_text}")
                    return False
            else:
                self.log_result("STEP 16", "Try Join Completed Event", False, 
                              f"Expected 400 error, got HTTP {join_response.status_code}: {join_response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 16", "Try Join Completed Event", False, f"Exception: {str(e)}")
            return False
    
    def _is_valid_base64(self, s):
        """Check if string is valid base64"""
        try:
            base64.b64decode(s)
            return True
        except Exception:
            return False
    
    def run_all_tests(self):
        """Run all test steps in order"""
        print("🚀 STARTING COMPREHENSIVE GYM HUB & QR-CORE ENGINE TESTING")
        print("=" * 80)
        
        test_steps = [
            self.test_step_1_admin_login,
            self.test_step_2_get_create_gym,
            self.test_step_3_update_gym_profile,
            self.test_step_4_register_coach_user,
            self.test_step_5_add_coach_to_gym,
            self.test_step_6_list_coaches,
            self.test_step_7_create_mass_event,
            self.test_step_8_list_events,
            self.test_step_9_get_event_detail,
            self.test_step_10_get_event_qr,
            self.test_step_11_public_qr_scan,
            self.test_step_12_join_event_as_coach,
            self.test_step_13_enroll_via_event_code,
            self.test_step_14_remove_coach,
            self.test_step_15_update_event_status,
            self.test_step_16_try_join_completed_event,
        ]
        
        passed = 0
        failed = 0
        
        for test_step in test_steps:
            try:
                if test_step():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"CRITICAL ERROR in {test_step.__name__}: {str(e)}")
                failed += 1
            
            # Small delay between tests
            time.sleep(0.5)
        
        print("=" * 80)
        print("🏁 TESTING COMPLETE")
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📊 SUCCESS RATE: {(passed/(passed+failed)*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result["status"]:
                    print(f"   - {result['step']}: {result['endpoint']}")
                    print(f"     {result['details']}")
        
        return passed, failed

def main():
    """Main test execution"""
    tester = GymHubTester()
    passed, failed = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    exit(main())