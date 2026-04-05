#!/usr/bin/env python3
"""
ARENAKORE Backend Testing - SILO IDENTITY & ATHLETE PROFILING
Testing the SILO IDENTITY & ATHLETE PROFILING endpoint as specified in the review request.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
ADMIN_EMAIL = "ogrisek.stefano@gmail.com"
ADMIN_PASSWORD = "Founder@KORE2026!"

class SiloProfileTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_data = None
        
    def log(self, message):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def test_login(self):
        """Test 1: Login → POST /api/auth/login → get token"""
        self.log("🔐 Testing admin login...")
        
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                self.user_data = data.get("user")
                
                if self.token:
                    # Set authorization header for future requests
                    self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                    self.log(f"✅ Admin login successful")
                    self.log(f"   User: {self.user_data.get('username', 'Unknown')}")
                    self.log(f"   Email: {self.user_data.get('email', 'Unknown')}")
                    self.log(f"   Is Admin: {self.user_data.get('is_admin', False)}")
                    self.log(f"   Is Founder: {self.user_data.get('is_founder', False)}")
                    return True
                else:
                    self.log("❌ Login failed: No token received")
                    return False
            else:
                self.log(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Login error: {str(e)}")
            return False
    
    def test_silo_profile(self):
        """Test 2: GET /api/kore/silo-profile → Should return silo identity data"""
        self.log("🎯 Testing SILO IDENTITY & ATHLETE PROFILING endpoint...")
        
        try:
            response = self.session.get(f"{BASE_URL}/kore/silo-profile")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ Silo profile endpoint working")
                
                # Check required fields from review request
                required_fields = [
                    "dominant_silo",
                    "dominant_pct", 
                    "aura_color",
                    "title",
                    "title_tier",
                    "total_challenges_30d",
                    "radar"
                ]
                
                missing_fields = []
                for field in required_fields:
                    if field not in data:
                        missing_fields.append(field)
                    else:
                        self.log(f"   ✅ {field}: {data[field]}")
                
                if missing_fields:
                    self.log(f"   ❌ Missing required fields: {missing_fields}")
                    return False
                
                # Verify specific expected values from review request
                dominant_silo = data.get("dominant_silo")
                if dominant_silo in ["Fitness", "Golf"]:
                    self.log(f"   ✅ Dominant silo is expected value: {dominant_silo}")
                else:
                    self.log(f"   ⚠️ Dominant silo unexpected: {dominant_silo} (expected Fitness or Golf)")
                
                # Check title should be "Rookie" since <10 challenges
                title = data.get("title")
                title_tier = data.get("title_tier")
                if title == "Rookie" and title_tier == "rookie":
                    self.log(f"   ✅ Title correctly shows Rookie for <10 challenges")
                else:
                    self.log(f"   ⚠️ Title/tier unexpected: {title}/{title_tier} (expected Rookie/rookie)")
                
                # Check total_challenges_30d should be >= 2
                total_challenges = data.get("total_challenges_30d", 0)
                if total_challenges >= 2:
                    self.log(f"   ✅ Total challenges 30d: {total_challenges} (>= 2)")
                else:
                    self.log(f"   ⚠️ Total challenges 30d: {total_challenges} (expected >= 2)")
                
                # Verify radar array structure
                radar = data.get("radar", [])
                if isinstance(radar, list) and len(radar) > 0:
                    self.log(f"   ✅ Radar array contains {len(radar)} entries")
                    
                    # Check for Fitness and Golf entries
                    fitness_found = False
                    golf_found = False
                    
                    for item in radar:
                        silo = item.get("silo", "")
                        if silo == "Fitness":
                            fitness_found = True
                        elif silo == "Golf":
                            golf_found = True
                        
                        # Verify radar item structure
                        required_radar_fields = ["silo", "color", "count", "avg_quality", "max_quality", "competency"]
                        missing_radar_fields = []
                        for field in required_radar_fields:
                            if field not in item:
                                missing_radar_fields.append(field)
                        
                        if missing_radar_fields:
                            self.log(f"   ❌ Radar item missing fields: {missing_radar_fields}")
                            return False
                        else:
                            self.log(f"   ✅ Radar item {silo}: competency={item.get('competency')}, count={item.get('count')}")
                    
                    if fitness_found and golf_found:
                        self.log(f"   ✅ Radar contains both Fitness and Golf entries")
                    else:
                        self.log(f"   ⚠️ Radar missing expected entries - Fitness: {fitness_found}, Golf: {golf_found}")
                
                else:
                    self.log(f"   ❌ Radar array is empty or invalid: {radar}")
                    return False
                
                return True
            else:
                self.log(f"❌ Silo profile failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Silo profile error: {str(e)}")
            return False
    
    def test_competency_calculation(self):
        """Test 3: Verify the competency calculation = (volume_normalized * 0.4) + (quality * 0.6)"""
        self.log("🧮 Testing competency calculation verification...")
        
        try:
            response = self.session.get(f"{BASE_URL}/kore/silo-profile")
            
            if response.status_code == 200:
                data = response.json()
                radar = data.get("radar", [])
                
                if not radar:
                    self.log("   ⚠️ No radar data to verify competency calculation")
                    return True
                
                self.log("   Verifying competency calculation for each silo...")
                
                for item in radar:
                    silo = item.get("silo", "Unknown")
                    count = item.get("count", 0)
                    avg_quality = item.get("avg_quality", 0)
                    competency = item.get("competency", 0)
                    
                    # Calculate expected competency based on backend formula:
                    # vol_score = min(volume / 50 * 100, 100)
                    # comp_score = vol_score * 0.4 + quality * 0.6
                    
                    vol_score = min(count / 50 * 100, 100)
                    expected_competency = round(vol_score * 0.4 + avg_quality * 0.6, 1)
                    
                    self.log(f"   {silo}: count={count}, avg_quality={avg_quality}%, competency={competency}")
                    self.log(f"     Volume score (min(count/50*100, 100)): {vol_score}")
                    self.log(f"     Expected competency: {expected_competency}")
                    
                    # Basic sanity checks
                    if 0 <= competency <= 100:
                        self.log(f"     ✅ Competency in valid range [0,100]")
                    else:
                        self.log(f"     ❌ Competency out of range: {competency}")
                        return False
                    
                    # Verify the calculation matches expected
                    if abs(competency - expected_competency) < 0.1:  # Allow small floating point differences
                        self.log(f"     ✅ Competency calculation correct: {competency} ≈ {expected_competency}")
                    else:
                        self.log(f"     ❌ Competency calculation incorrect: {competency} ≠ {expected_competency}")
                        return False
                
                self.log("   ✅ Competency calculation verification completed")
                return True
            else:
                self.log(f"❌ Failed to get silo profile for competency verification: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Competency calculation verification error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all SILO IDENTITY & ATHLETE PROFILING tests"""
        self.log("🚀 Starting SILO IDENTITY & ATHLETE PROFILING Backend Testing")
        self.log("=" * 70)
        
        tests = [
            ("Admin Login", self.test_login),
            ("Silo Profile Endpoint", self.test_silo_profile),
            ("Competency Calculation Verification", self.test_competency_calculation),
        ]
        
        results = []
        
        for test_name, test_func in tests:
            self.log(f"\n📋 Running: {test_name}")
            self.log("-" * 50)
            
            try:
                success = test_func()
                results.append((test_name, success))
                
                if success:
                    self.log(f"✅ {test_name} PASSED")
                else:
                    self.log(f"❌ {test_name} FAILED")
                    
            except Exception as e:
                self.log(f"💥 {test_name} CRASHED: {str(e)}")
                results.append((test_name, False))
        
        # Summary
        self.log("\n" + "=" * 70)
        self.log("📊 TEST SUMMARY")
        self.log("=" * 70)
        
        passed = sum(1 for _, success in results if success)
        total = len(results)
        
        for test_name, success in results:
            status = "✅ PASS" if success else "❌ FAIL"
            self.log(f"{status} - {test_name}")
        
        self.log(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED! SILO IDENTITY & ATHLETE PROFILING endpoint is working correctly.")
            return True
        else:
            self.log(f"⚠️ {total - passed} test(s) failed. Please review the issues above.")
            return False

def main():
    """Main test execution"""
    tester = SiloProfileTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()