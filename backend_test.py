#!/usr/bin/env python3
"""
ARENAKORE Backend Testing Suite - THE HUNT Leaderboard Endpoints
Testing specific endpoints as requested in the review request.
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "email": "ogrisek.stefano@gmail.com", 
    "password": "Founder@KORE2026!"
}

class ArenakoreAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "response_data": response_data
        }
        self.test_results.append(result)
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if not success and response_data:
            print(f"    Response: {json.dumps(response_data, indent=2)}")
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        
        # Default headers
        default_headers = {"Content-Type": "application/json"}
        if self.token:
            default_headers["Authorization"] = f"Bearer {self.token}"
        
        if headers:
            default_headers.update(headers)
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=default_headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=default_headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=default_headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=default_headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
                
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text, "status_code": response.status_code}
                
            return response.status_code == 200, response_data, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_login(self):
        """Test 1: Login with admin credentials"""
        print("🔐 Testing Admin Login...")
        
        success, response_data, status_code = self.make_request(
            "POST", 
            "/auth/login", 
            TEST_CREDENTIALS
        )
        
        if success and "token" in response_data:
            self.token = response_data["token"]
            user_data = response_data.get("user", {})
            details = f"Login successful. Token received. User: {user_data.get('username', 'Unknown')}"
            self.log_test("Admin Login", True, details, {"status_code": status_code, "has_token": True, "user": user_data})
            return True
        else:
            details = f"Login failed. Status: {status_code}"
            self.log_test("Admin Login", False, details, response_data)
            return False

    def test_the_hunt_leaderboard(self):
        """Test 2: Get The Hunt leaderboard (default)"""
        print("🏆 Testing The Hunt Leaderboard (Default)...")
        
        success, response_data, status_code = self.make_request("GET", "/leaderboard/the-hunt")
        
        if success:
            # Check required fields
            required_fields = ["leaderboard", "total_participants", "my_position", "system_templates_count", "time_range"]
            missing_fields = [field for field in required_fields if field not in response_data]
            
            if not missing_fields:
                leaderboard = response_data.get("leaderboard", [])
                total_participants = response_data.get("total_participants", 0)
                system_templates_count = response_data.get("system_templates_count", 0)
                time_range = response_data.get("time_range", "")
                my_position = response_data.get("my_position")
                
                details = f"Leaderboard entries: {len(leaderboard)}, Total participants: {total_participants}, System templates: {system_templates_count}, Time range: {time_range}, My position: {type(my_position).__name__}"
                
                # Verify system_templates_count > 0
                if system_templates_count > 0:
                    self.log_test("The Hunt Leaderboard (Default)", True, details, {
                        "status_code": status_code,
                        "leaderboard_count": len(leaderboard),
                        "total_participants": total_participants,
                        "system_templates_count": system_templates_count,
                        "time_range": time_range,
                        "has_my_position": my_position is not None
                    })
                    return True
                else:
                    details = f"system_templates_count should be > 0, got: {system_templates_count}"
                    self.log_test("The Hunt Leaderboard (Default)", False, details, response_data)
                    return False
            else:
                details = f"Missing required fields: {missing_fields}"
                self.log_test("The Hunt Leaderboard (Default)", False, details, response_data)
                return False
        else:
            details = f"Request failed. Status: {status_code}"
            self.log_test("The Hunt Leaderboard (Default)", False, details, response_data)
            return False

    def test_the_hunt_weekly(self):
        """Test 3: Get The Hunt leaderboard (weekly)"""
        print("📅 Testing The Hunt Leaderboard (Weekly)...")
        
        success, response_data, status_code = self.make_request("GET", "/leaderboard/the-hunt?time_range=weekly")
        
        if success:
            time_range = response_data.get("time_range", "")
            
            if time_range == "weekly":
                leaderboard = response_data.get("leaderboard", [])
                total_participants = response_data.get("total_participants", 0)
                details = f"Weekly leaderboard entries: {len(leaderboard)}, Total participants: {total_participants}, Time range: {time_range}"
                self.log_test("The Hunt Leaderboard (Weekly)", True, details, {
                    "status_code": status_code,
                    "leaderboard_count": len(leaderboard),
                    "total_participants": total_participants,
                    "time_range": time_range
                })
                return True
            else:
                details = f"Expected time_range='weekly', got: '{time_range}'"
                self.log_test("The Hunt Leaderboard (Weekly)", False, details, response_data)
                return False
        else:
            details = f"Request failed. Status: {status_code}"
            self.log_test("The Hunt Leaderboard (Weekly)", False, details, response_data)
            return False

    def test_my_hunt_rank(self):
        """Test 4: Get my hunt rank"""
        print("🎯 Testing My Hunt Rank...")
        
        success, response_data, status_code = self.make_request("GET", "/leaderboard/the-hunt/my-rank")
        
        if success:
            # Check required fields
            required_fields = ["rank", "total", "hunt_flux", "sessions", "is_ranked"]
            missing_fields = [field for field in required_fields if field not in response_data]
            
            if not missing_fields:
                rank = response_data.get("rank")
                total = response_data.get("total")
                hunt_flux = response_data.get("hunt_flux")
                sessions = response_data.get("sessions")
                is_ranked = response_data.get("is_ranked")
                
                details = f"Rank: {rank}, Total: {total}, Hunt FLUX: {hunt_flux}, Sessions: {sessions}, Is ranked: {is_ranked}"
                self.log_test("My Hunt Rank", True, details, {
                    "status_code": status_code,
                    "rank": rank,
                    "total": total,
                    "hunt_flux": hunt_flux,
                    "sessions": sessions,
                    "is_ranked": is_ranked
                })
                return True
            else:
                details = f"Missing required fields: {missing_fields}"
                self.log_test("My Hunt Rank", False, details, response_data)
                return False
        else:
            details = f"Request failed. Status: {status_code}"
            self.log_test("My Hunt Rank", False, details, response_data)
            return False

    def test_flux_balance(self):
        """Test 5: Verify K-Flux tiered balance"""
        print("⚡ Testing K-Flux Tiered Balance...")
        
        success, response_data, status_code = self.make_request("GET", "/flux/balance")
        
        if success:
            # Check for tiered balance fields
            expected_fields = ["vital", "perform", "team"]
            has_tiered = all(field in response_data for field in expected_fields)
            
            if has_tiered:
                vital = response_data.get("vital")
                perform = response_data.get("perform")
                team = response_data.get("team")
                total = response_data.get("total", vital + perform + team)
                
                details = f"Vital: {vital}, Perform: {perform}, Team: {team}, Total: {total}"
                self.log_test("K-Flux Tiered Balance", True, details, {
                    "status_code": status_code,
                    "vital": vital,
                    "perform": perform,
                    "team": team,
                    "total": total
                })
                return True
            else:
                # Check if it has other balance structure
                details = f"Tiered balance fields not found. Available fields: {list(response_data.keys())}"
                self.log_test("K-Flux Tiered Balance", False, details, response_data)
                return False
        else:
            details = f"Request failed. Status: {status_code}"
            self.log_test("K-Flux Tiered Balance", False, details, response_data)
            return False

    def test_flux_wallet(self):
        """Test 6: Verify wallet with balance and spendable info"""
        print("💰 Testing FLUX Wallet...")
        
        success, response_data, status_code = self.make_request("GET", "/flux/wallet")
        
        if success:
            # Check for wallet structure
            balance = response_data.get("balance", {})
            spendable = response_data.get("spendable", {})
            
            # Check balance colors (green/cyan/amber)
            balance_colors = []
            if isinstance(balance, dict):
                for key, value in balance.items():
                    if "color" in str(value).lower() or key in ["green", "cyan", "amber"]:
                        balance_colors.append(f"{key}: {value}")
            
            # Check spendable with burn_priority
            has_burn_priority = "burn_priority" in spendable if isinstance(spendable, dict) else False
            
            details = f"Balance structure: {type(balance).__name__}, Spendable structure: {type(spendable).__name__}, Has burn_priority: {has_burn_priority}"
            if balance_colors:
                details += f", Balance colors: {balance_colors}"
                
            self.log_test("FLUX Wallet", True, details, {
                "status_code": status_code,
                "balance": balance,
                "spendable": spendable,
                "has_burn_priority": has_burn_priority
            })
            return True
        else:
            details = f"Request failed. Status: {status_code}"
            self.log_test("FLUX Wallet", False, details, response_data)
            return False

    def run_all_tests(self):
        """Run all THE HUNT leaderboard tests"""
        print("🚀 Starting ARENAKORE THE HUNT Leaderboard Testing Suite")
        print("=" * 60)
        print(f"Backend URL: {self.base_url}")
        print(f"Test Credentials: {TEST_CREDENTIALS['email']}")
        print("=" * 60)
        print()
        
        # Test sequence as specified in review request
        tests = [
            ("Login", self.test_login),
            ("The Hunt Leaderboard (Default)", self.test_the_hunt_leaderboard),
            ("The Hunt Leaderboard (Weekly)", self.test_the_hunt_weekly),
            ("My Hunt Rank", self.test_my_hunt_rank),
            ("K-Flux Tiered Balance", self.test_flux_balance),
            ("FLUX Wallet", self.test_flux_wallet)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
            except Exception as e:
                self.log_test(test_name, False, f"Exception: {str(e)}")
        
        # Summary
        print("=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        print()
        
        # Detailed results
        for result in self.test_results:
            status_icon = "✅" if result["success"] else "❌"
            print(f"{status_icon} {result['test']}")
            if result["details"]:
                print(f"    {result['details']}")
        
        print("=" * 60)
        
        return passed == total

if __name__ == "__main__":
    tester = ArenakoreAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)