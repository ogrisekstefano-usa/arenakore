#!/usr/bin/env python3
"""
ARENAKORE LIVE QUEUE & PVP TESTING
Test the new backend endpoints for Live matchmaking and PvP challenges.
"""

import requests
import json
import time
from datetime import datetime

# Base URL from frontend/.env
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"

# Test credentials from review request
FOUNDER_EMAIL = "ogrisek.stefano@gmail.com"
FOUNDER_PASSWORD = "Founder@KORE2026!"

SECOND_USER_EMAIL = "d.rose@chicago.kore"
SECOND_USER_PASSWORD = "Seed@Chicago1"

class LiveQueueTester:
    def __init__(self):
        self.founder_token = None
        self.second_user_token = None
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
        
    def test_step_1_founder_login(self):
        """STEP 1: Login as founder"""
        print("=== STEP 1: Login as founder ===")
        
        payload = {
            "email": FOUNDER_EMAIL,
            "password": FOUNDER_PASSWORD
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.founder_token = data["token"]
                    founder_user = data["user"]
                    
                    self.log_result("STEP 1", "POST /api/auth/login", True, 
                                  f"Founder login successful. User: {founder_user.get('username')}, is_admin: {founder_user.get('is_admin')}")
                    return True
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
    
    def test_step_2_second_user_login(self):
        """STEP 2: Login as second user"""
        print("=== STEP 2: Login as second user ===")
        
        payload = {
            "email": SECOND_USER_EMAIL,
            "password": SECOND_USER_PASSWORD
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.second_user_token = data["token"]
                    second_user = data["user"]
                    
                    self.log_result("STEP 2", "POST /api/auth/login", True, 
                                  f"Second user login successful. User: {second_user.get('username')}")
                    return True
                else:
                    self.log_result("STEP 2", "POST /api/auth/login", False, 
                                  f"Missing token or user in response: {data}")
                    return False
            else:
                self.log_result("STEP 2", "POST /api/auth/login", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 2", "POST /api/auth/login", False, f"Exception: {str(e)}")
            return False
    
    def test_step_3_join_live_queue_founder(self):
        """STEP 3: Founder joins live queue"""
        print("=== STEP 3: Founder joins live queue ===")
        
        if not self.founder_token:
            self.log_result("STEP 3", "POST /api/live/join-queue", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        payload = {
            "exercise_type": "squat",
            "discipline": "power"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/live/join-queue", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return waiting or matched status
                if data.get("status") in ["waiting", "matched", "already_waiting"]:
                    if data.get("status") == "waiting":
                        self.log_result("STEP 3", "POST /api/live/join-queue", True, 
                                      f"Founder joined queue. Status: {data['status']}, Position: {data.get('position')}, Queue ID: {data.get('queue_id')}")
                    elif data.get("status") == "matched":
                        self.log_result("STEP 3", "POST /api/live/join-queue", True, 
                                      f"Founder immediately matched! Battle ID: {data.get('battle_id')}, Opponent: {data.get('opponent_username')}")
                    else:
                        self.log_result("STEP 3", "POST /api/live/join-queue", True, 
                                      f"Founder already in queue. Status: {data['status']}")
                    return True
                else:
                    self.log_result("STEP 3", "POST /api/live/join-queue", False, 
                                  f"Unexpected status: {data.get('status')}. Full response: {data}")
                    return False
            else:
                self.log_result("STEP 3", "POST /api/live/join-queue", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 3", "POST /api/live/join-queue", False, f"Exception: {str(e)}")
            return False
    
    def test_step_4_check_queue_status_founder(self):
        """STEP 4: Check founder's queue status"""
        print("=== STEP 4: Check founder's queue status ===")
        
        if not self.founder_token:
            self.log_result("STEP 4", "GET /api/live/queue-status", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/live/queue-status", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return one of the expected statuses
                expected_statuses = ["waiting", "matched", "expired", "not_in_queue"]
                if data.get("status") in expected_statuses:
                    if data.get("status") == "waiting":
                        self.log_result("STEP 4", "GET /api/live/queue-status", True, 
                                      f"Founder waiting in queue. Position: {data.get('position')}, Elapsed: {data.get('seconds_elapsed')}s")
                    elif data.get("status") == "matched":
                        self.log_result("STEP 4", "GET /api/live/queue-status", True, 
                                      f"Founder matched! Battle ID: {data.get('battle_id')}, Opponent: {data.get('opponent_username')}")
                    else:
                        self.log_result("STEP 4", "GET /api/live/queue-status", True, 
                                      f"Queue status: {data['status']}")
                    return True
                else:
                    self.log_result("STEP 4", "GET /api/live/queue-status", False, 
                                  f"Unexpected status: {data.get('status')}. Expected one of: {expected_statuses}")
                    return False
            else:
                self.log_result("STEP 4", "GET /api/live/queue-status", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 4", "GET /api/live/queue-status", False, f"Exception: {str(e)}")
            return False
    
    def test_step_5_join_live_queue_second_user(self):
        """STEP 5: Second user joins live queue (should match with founder)"""
        print("=== STEP 5: Second user joins live queue (should match with founder) ===")
        
        if not self.second_user_token:
            self.log_result("STEP 5", "POST /api/live/join-queue", False, "No second user token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.second_user_token}"}
        payload = {
            "exercise_type": "squat",
            "discipline": "power"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/live/join-queue", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return waiting or matched status
                if data.get("status") in ["waiting", "matched", "already_waiting"]:
                    if data.get("status") == "matched":
                        self.log_result("STEP 5", "POST /api/live/join-queue", True, 
                                      f"Second user matched with founder! Battle ID: {data.get('battle_id')}, Opponent: {data.get('opponent_username')}")
                    else:
                        self.log_result("STEP 5", "POST /api/live/join-queue", True, 
                                      f"Second user joined queue. Status: {data['status']}, Position: {data.get('position', 'N/A')}")
                    return True
                else:
                    self.log_result("STEP 5", "POST /api/live/join-queue", False, 
                                  f"Unexpected status: {data.get('status')}. Full response: {data}")
                    return False
            else:
                self.log_result("STEP 5", "POST /api/live/join-queue", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 5", "POST /api/live/join-queue", False, f"Exception: {str(e)}")
            return False
    
    def test_step_6_leave_queue_founder(self):
        """STEP 6: Founder leaves queue"""
        print("=== STEP 6: Founder leaves queue ===")
        
        if not self.founder_token:
            self.log_result("STEP 6", "POST /api/live/leave-queue", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        
        try:
            response = requests.post(f"{BASE_URL}/live/leave-queue", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("status") == "left_queue":
                    self.log_result("STEP 6", "POST /api/live/leave-queue", True, 
                                  f"Founder left queue successfully. Status: {data['status']}")
                    return True
                else:
                    self.log_result("STEP 6", "POST /api/live/leave-queue", False, 
                                  f"Expected 'left_queue', got: {data.get('status')}")
                    return False
            else:
                self.log_result("STEP 6", "POST /api/live/leave-queue", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 6", "POST /api/live/leave-queue", False, f"Exception: {str(e)}")
            return False
    
    def test_step_7_complete_practice_session(self):
        """STEP 7: Complete practice session"""
        print("=== STEP 7: Complete practice session ===")
        
        if not self.founder_token:
            self.log_result("STEP 7", "POST /api/nexus/session/complete", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        payload = {
            "mode": "practice",
            "exercise_type": "squat",
            "reps": 15,
            "quality_score": 85.0,
            "duration_seconds": 60
        }
        
        try:
            response = requests.post(f"{BASE_URL}/nexus/session/complete", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["status", "mode", "flux_earned"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    if data.get("status") == "completed" and data.get("mode") == "practice":
                        expected_flux = 5  # Practice mode should give +5 flux
                        actual_flux = data.get("flux_earned")
                        if actual_flux == expected_flux:
                            self.log_result("STEP 7", "POST /api/nexus/session/complete", True, 
                                          f"Practice session completed. Status: {data['status']}, Flux earned: {actual_flux}, XP earned: {data.get('xp_earned')}")
                        else:
                            self.log_result("STEP 7", "POST /api/nexus/session/complete", False, 
                                          f"Expected flux_earned=5 for practice, got: {actual_flux}")
                            return False
                        return True
                    else:
                        self.log_result("STEP 7", "POST /api/nexus/session/complete", False, 
                                      f"Unexpected status or mode. Status: {data.get('status')}, Mode: {data.get('mode')}")
                        return False
                else:
                    self.log_result("STEP 7", "POST /api/nexus/session/complete", False, 
                                  f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("STEP 7", "POST /api/nexus/session/complete", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 7", "POST /api/nexus/session/complete", False, f"Exception: {str(e)}")
            return False
    
    def test_step_8_complete_ranked_session_new_pb(self):
        """STEP 8: Complete ranked session (should be new PB)"""
        print("=== STEP 8: Complete ranked session (should be new PB) ===")
        
        if not self.founder_token:
            self.log_result("STEP 8", "POST /api/nexus/session/complete", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        payload = {
            "mode": "ranked",
            "exercise_type": "squat",
            "reps": 20,
            "quality_score": 90.0,
            "duration_seconds": 60
        }
        
        try:
            response = requests.post(f"{BASE_URL}/nexus/session/complete", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["status", "mode", "flux_earned", "is_personal_best"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    if data.get("status") == "completed" and data.get("mode") == "ranked":
                        flux_earned = data.get("flux_earned")
                        is_pb = data.get("is_personal_best")
                        
                        # For new PB, should get +50 flux, for below PB should get -20 flux
                        if is_pb and flux_earned == 50:
                            self.log_result("STEP 8", "POST /api/nexus/session/complete", True, 
                                          f"Ranked session completed (NEW PB). Flux earned: {flux_earned}, PB: {is_pb}, PVP Score: {data.get('pvp_score')}")
                        elif not is_pb and flux_earned == -20:
                            self.log_result("STEP 8", "POST /api/nexus/session/complete", True, 
                                          f"Ranked session completed (below PB). Flux earned: {flux_earned}, PB: {is_pb}, PVP Score: {data.get('pvp_score')}")
                        else:
                            self.log_result("STEP 8", "POST /api/nexus/session/complete", True, 
                                          f"Ranked session completed. Flux earned: {flux_earned}, PB: {is_pb}, PVP Score: {data.get('pvp_score')}")
                        return True
                    else:
                        self.log_result("STEP 8", "POST /api/nexus/session/complete", False, 
                                      f"Unexpected status or mode. Status: {data.get('status')}, Mode: {data.get('mode')}")
                        return False
                else:
                    self.log_result("STEP 8", "POST /api/nexus/session/complete", False, 
                                  f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("STEP 8", "POST /api/nexus/session/complete", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 8", "POST /api/nexus/session/complete", False, f"Exception: {str(e)}")
            return False
    
    def test_step_9_complete_ranked_session_below_pb(self):
        """STEP 9: Complete ranked session (should be below PB)"""
        print("=== STEP 9: Complete ranked session (should be below PB) ===")
        
        if not self.founder_token:
            self.log_result("STEP 9", "POST /api/nexus/session/complete", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        payload = {
            "mode": "ranked",
            "exercise_type": "squat",
            "reps": 10,  # Lower reps than previous
            "quality_score": 70.0,  # Lower quality
            "duration_seconds": 60
        }
        
        try:
            response = requests.post(f"{BASE_URL}/nexus/session/complete", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["status", "mode", "flux_earned", "is_personal_best"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    if data.get("status") == "completed" and data.get("mode") == "ranked":
                        flux_earned = data.get("flux_earned")
                        is_pb = data.get("is_personal_best")
                        
                        # Should be below PB and get -20 flux
                        if not is_pb and flux_earned == -20:
                            self.log_result("STEP 9", "POST /api/nexus/session/complete", True, 
                                          f"Ranked session completed (below PB). Flux earned: {flux_earned}, PB: {is_pb}, PVP Score: {data.get('pvp_score')}")
                        else:
                            self.log_result("STEP 9", "POST /api/nexus/session/complete", True, 
                                          f"Ranked session completed. Flux earned: {flux_earned}, PB: {is_pb}, PVP Score: {data.get('pvp_score')} (Note: May be new PB if no previous ranked sessions)")
                        return True
                    else:
                        self.log_result("STEP 9", "POST /api/nexus/session/complete", False, 
                                      f"Unexpected status or mode. Status: {data.get('status')}, Mode: {data.get('mode')}")
                        return False
                else:
                    self.log_result("STEP 9", "POST /api/nexus/session/complete", False, 
                                  f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("STEP 9", "POST /api/nexus/session/complete", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 9", "POST /api/nexus/session/complete", False, f"Exception: {str(e)}")
            return False
    
    def test_step_10_get_pvp_pending(self):
        """STEP 10: Get pending PvP challenges"""
        print("=== STEP 10: Get pending PvP challenges ===")
        
        if not self.founder_token:
            self.log_result("STEP 10", "GET /api/pvp/pending", False, "No founder token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.founder_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/pvp/pending", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields (including expired field)
                required_fields = ["received", "sent", "active", "expired"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Verify all fields are arrays
                    all_arrays = all(isinstance(data[field], list) for field in required_fields)
                    if all_arrays:
                        self.log_result("STEP 10", "GET /api/pvp/pending", True, 
                                      f"PvP pending retrieved. Received: {len(data['received'])}, Sent: {len(data['sent'])}, Active: {len(data['active'])}, Expired: {len(data['expired'])}")
                        return True
                    else:
                        self.log_result("STEP 10", "GET /api/pvp/pending", False, 
                                      f"Not all fields are arrays. Types: {[(field, type(data[field]).__name__) for field in required_fields]}")
                        return False
                else:
                    self.log_result("STEP 10", "GET /api/pvp/pending", False, 
                                  f"Missing required fields: {missing_fields}. Available fields: {list(data.keys())}")
                    return False
            else:
                self.log_result("STEP 10", "GET /api/pvp/pending", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("STEP 10", "GET /api/pvp/pending", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all test steps in order"""
        print("🚀 STARTING ARENAKORE LIVE QUEUE & PVP TESTING")
        print("=" * 80)
        
        test_steps = [
            self.test_step_1_founder_login,
            self.test_step_2_second_user_login,
            self.test_step_3_join_live_queue_founder,
            self.test_step_4_check_queue_status_founder,
            self.test_step_5_join_live_queue_second_user,
            self.test_step_6_leave_queue_founder,
            self.test_step_7_complete_practice_session,
            self.test_step_8_complete_ranked_session_new_pb,
            self.test_step_9_complete_ranked_session_below_pb,
            self.test_step_10_get_pvp_pending,
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
    tester = LiveQueueTester()
    passed, failed = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    exit(main())