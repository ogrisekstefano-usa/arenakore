#!/usr/bin/env python3
"""
ARENAKORE QR KORE Check-in System Testing (Build 38)
Test Plan — Execute ALL steps in sequence as specified in review request
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
ADMIN_EMAIL = "ogrisek.stefano@gmail.com"
ADMIN_PASSWORD = "Founder@KORE2026!"

class QRCheckinTester:
    def __init__(self):
        self.token = None
        self.hub_id = None
        self.qr_payload = None
        
    def log(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def test_step(self, step_num, description, func):
        self.log(f"STEP {step_num}: {description}")
        try:
            result = func()
            self.log(f"✅ STEP {step_num} PASSED: {result}")
            return True
        except Exception as e:
            self.log(f"❌ STEP {step_num} FAILED: {str(e)}")
            return False
    
    def step1_admin_login(self):
        """Step 1: Login as Admin"""
        url = f"{BASE_URL}/auth/login"
        payload = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        response = requests.post(url, json=payload)
        if response.status_code != 200:
            raise Exception(f"Login failed: {response.status_code} - {response.text}")
            
        data = response.json()
        if "token" not in data:
            raise Exception(f"No token in response: {data}")
            
        self.token = data["token"]
        return f"Admin login successful, token received: {self.token[:20]}..."
    
    def step2_get_all_hubs(self):
        """Step 2: Get all hubs and pick the first hub's id"""
        url = f"{BASE_URL}/hubs/all"
        
        response = requests.get(url)
        if response.status_code != 200:
            raise Exception(f"Get hubs failed: {response.status_code} - {response.text}")
            
        data = response.json()
        if "hubs" not in data or len(data["hubs"]) == 0:
            raise Exception(f"No hubs found in response: {data}")
            
        self.hub_id = data["hubs"][0]["id"]
        hub_name = data["hubs"][0]["name"]
        return f"Found {len(data['hubs'])} hubs, selected hub_id: {self.hub_id} ({hub_name})"
    
    def step3_generate_qr(self):
        """Step 3: Generate QR for hub"""
        url = f"{BASE_URL}/checkin/hub/{self.hub_id}/generate-qr"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(url, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Generate QR failed: {response.status_code} - {response.text}")
            
        data = response.json()
        required_fields = ["qr_payload", "hub_name", "date", "token"]
        for field in required_fields:
            if field not in data:
                raise Exception(f"Missing field '{field}' in response: {data}")
                
        self.qr_payload = data["qr_payload"]
        if not self.qr_payload.startswith("arenakore://checkin/"):
            raise Exception(f"Invalid QR payload format: {self.qr_payload}")
            
        return f"QR generated: {self.qr_payload}, hub: {data['hub_name']}, date: {data['date']}, token: {data['token']}"
    
    def step4_get_qr_status(self):
        """Step 4: Get QR status"""
        url = f"{BASE_URL}/checkin/hub/{self.hub_id}/qr-status"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Get QR status failed: {response.status_code} - {response.text}")
            
        data = response.json()
        required_fields = ["qr_active", "checkins_today"]
        for field in required_fields:
            if field not in data:
                raise Exception(f"Missing field '{field}' in response: {data}")
                
        if not data["qr_active"]:
            raise Exception(f"QR should be active but qr_active={data['qr_active']}")
            
        return f"QR status: qr_active={data['qr_active']}, checkins_today={data['checkins_today']}"
    
    def step5_scan_qr_first_time(self):
        """Step 5: Scan QR (first time)"""
        url = f"{BASE_URL}/checkin/scan"
        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {"qr_payload": self.qr_payload}
        
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Scan QR failed: {response.status_code} - {response.text}")
            
        data = response.json()
        required_fields = ["success", "already_checked_in", "flux_earned", "streak", "flux_color"]
        for field in required_fields:
            if field not in data:
                raise Exception(f"Missing field '{field}' in response: {data}")
                
        if not data["success"]:
            raise Exception(f"Scan should succeed but success={data['success']}")
            
        if data["already_checked_in"]:
            raise Exception(f"First scan should not be already_checked_in but got {data['already_checked_in']}")
            
        if data["flux_earned"] <= 0:
            raise Exception(f"Should earn flux but got flux_earned={data['flux_earned']}")
            
        if data["streak"] < 1:
            raise Exception(f"Streak should be >= 1 but got {data['streak']}")
            
        if data["flux_color"] != "green":
            raise Exception(f"Flux color should be green but got {data['flux_color']}")
            
        return f"First scan successful: flux_earned={data['flux_earned']}, streak={data['streak']}, flux_color={data['flux_color']}"
    
    def step6_scan_qr_duplicate(self):
        """Step 6: Scan QR (duplicate — 1/day limit)"""
        url = f"{BASE_URL}/checkin/scan"
        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {"qr_payload": self.qr_payload}
        
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Duplicate scan failed: {response.status_code} - {response.text}")
            
        data = response.json()
        required_fields = ["success", "already_checked_in", "flux_earned"]
        for field in required_fields:
            if field not in data:
                raise Exception(f"Missing field '{field}' in response: {data}")
                
        if not data["success"]:
            raise Exception(f"Duplicate scan should succeed but success={data['success']}")
            
        if not data["already_checked_in"]:
            raise Exception(f"Duplicate scan should be already_checked_in but got {data['already_checked_in']}")
            
        if data["flux_earned"] != 0:
            raise Exception(f"Duplicate scan should earn 0 flux but got flux_earned={data['flux_earned']}")
            
        return f"Duplicate scan successful: already_checked_in={data['already_checked_in']}, flux_earned={data['flux_earned']}"
    
    def step7_get_my_attendance(self):
        """Step 7: Get my attendance"""
        url = f"{BASE_URL}/checkin/my-attendance"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Get my attendance failed: {response.status_code} - {response.text}")
            
        data = response.json()
        if "records" not in data:
            raise Exception(f"Missing 'records' field in response: {data}")
            
        if len(data["records"]) == 0:
            raise Exception(f"Should have at least 1 attendance record but got {len(data['records'])}")
            
        record = data["records"][0]
        required_fields = ["hub_name", "k_flux_earned", "k_flux_color"]
        for field in required_fields:
            if field not in record:
                raise Exception(f"Missing field '{field}' in attendance record: {record}")
                
        if record["k_flux_earned"] <= 0:
            raise Exception(f"Should have earned flux but got k_flux_earned={record['k_flux_earned']}")
            
        if record["k_flux_color"] != "green":
            raise Exception(f"Flux color should be green but got {record['k_flux_color']}")
            
        return f"My attendance: {len(data['records'])} records, latest: hub={record['hub_name']}, flux={record['k_flux_earned']}, color={record['k_flux_color']}"
    
    def step8_get_hub_attendance(self):
        """Step 8: Get hub attendance (admin)"""
        url = f"{BASE_URL}/checkin/hub/{self.hub_id}/attendance"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Get hub attendance failed: {response.status_code} - {response.text}")
            
        data = response.json()
        if "records" not in data:
            raise Exception(f"Missing 'records' field in response: {data}")
            
        if len(data["records"]) == 0:
            raise Exception(f"Should have at least 1 attendance record but got {len(data['records'])}")
            
        record = data["records"][0]
        if "username" not in record:
            raise Exception(f"Missing 'username' field in attendance record: {record}")
            
        return f"Hub attendance: {len(data['records'])} records, latest user: {record['username']}"
    
    def step9_get_enhanced_week(self):
        """Step 9: Get enhanced week"""
        url = f"{BASE_URL}/checkin/week-enhanced"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Get enhanced week failed: {response.status_code} - {response.text}")
            
        data = response.json()
        if "week" not in data:
            raise Exception(f"Missing 'week' field in response: {data}")
            
        if len(data["week"]) != 7:
            raise Exception(f"Week should have 7 days but got {len(data['week'])}")
            
        # Find today's entry
        today_found = False
        for day in data["week"]:
            if day.get("checked_in") and day.get("is_qr_checkin") and day.get("hub_name"):
                today_found = True
                break
                
        if not today_found:
            raise Exception(f"Should find today as checked_in=true with is_qr_checkin=true and hub_name set")
            
        return f"Enhanced week: 7 days, found today's QR check-in with hub_name"
    
    def step10_update_config(self):
        """Step 10: Update config"""
        url = f"{BASE_URL}/checkin/hub/{self.hub_id}/config"
        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {
            "flux_reward": 100,
            "geo_required": False
        }
        
        response = requests.put(url, json=payload, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Update config failed: {response.status_code} - {response.text}")
            
        data = response.json()
        if data.get("status") != "updated":
            raise Exception(f"Config update should return status='updated' but got {data}")
            
        return f"Config updated: status={data['status']}"
    
    def step11_get_config(self):
        """Step 11: Get config"""
        url = f"{BASE_URL}/checkin/hub/{self.hub_id}/config"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Get config failed: {response.status_code} - {response.text}")
            
        data = response.json()
        if data.get("flux_reward") != 100:
            raise Exception(f"Flux reward should be 100 but got {data.get('flux_reward')}")
            
        return f"Config retrieved: flux_reward={data['flux_reward']}"
    
    def run_all_tests(self):
        """Run all test steps in sequence"""
        self.log("🚀 STARTING QR KORE CHECK-IN SYSTEM TESTING (Build 38)")
        self.log("=" * 60)
        
        test_steps = [
            (1, "Login as Admin", self.step1_admin_login),
            (2, "Get all hubs", self.step2_get_all_hubs),
            (3, "Generate QR for hub", self.step3_generate_qr),
            (4, "Get QR status", self.step4_get_qr_status),
            (5, "Scan QR (first time)", self.step5_scan_qr_first_time),
            (6, "Scan QR (duplicate)", self.step6_scan_qr_duplicate),
            (7, "Get my attendance", self.step7_get_my_attendance),
            (8, "Get hub attendance (admin)", self.step8_get_hub_attendance),
            (9, "Get enhanced week", self.step9_get_enhanced_week),
            (10, "Update config", self.step10_update_config),
            (11, "Get config", self.step11_get_config),
        ]
        
        passed = 0
        failed = 0
        
        for step_num, description, func in test_steps:
            if self.test_step(step_num, description, func):
                passed += 1
            else:
                failed += 1
                
        self.log("=" * 60)
        self.log(f"🏁 TESTING COMPLETE: {passed} PASSED, {failed} FAILED")
        
        if failed == 0:
            self.log("🎉 ALL QR CHECK-IN TESTS PASSED!")
            return True
        else:
            self.log(f"⚠️  {failed} TESTS FAILED")
            return False

if __name__ == "__main__":
    tester = QRCheckinTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)