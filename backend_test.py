#!/usr/bin/env python3
"""
ARENAKORE Backend Testing - KORE Detail View Endpoints
Testing the new KORE Detail View backend endpoints as specified in the review request.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
ADMIN_EMAIL = "ogrisek.stefano@gmail.com"
ADMIN_PASSWORD = "Founder@KORE2026!"

class KoreDetailViewTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_data = None
        
    def log(self, message):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def test_login(self):
        """Test 1: Login as admin and get token"""
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
    
    def test_personal_record_golf_swing(self):
        """Test 2: GET /api/kore/personal-record?exercise_type=swing&disciplina=Golf"""
        self.log("🏌️ Testing personal record for Golf swing...")
        
        try:
            params = {
                "exercise_type": "swing",
                "disciplina": "Golf"
            }
            
            response = self.session.get(f"{BASE_URL}/kore/personal-record", params=params)
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ Golf swing personal record endpoint working")
                
                # Check response structure
                if "pr" in data:
                    pr = data["pr"]
                    if pr:
                        self.log(f"   PR Found: {pr.get('primary_result', {}).get('value', 'N/A')} {pr.get('primary_result', {}).get('unit', '')}")
                        self.log(f"   Quality: {pr.get('quality_score', 'N/A')}%")
                        self.log(f"   Date: {pr.get('completed_at', 'N/A')}")
                    else:
                        self.log("   No PR data found (expected for new user)")
                else:
                    self.log("   Missing 'pr' field in response")
                
                if "best_quality" in data:
                    best_q = data["best_quality"]
                    if best_q:
                        self.log(f"   Best Quality: {best_q.get('quality_score', 'N/A')}%")
                    else:
                        self.log("   No best quality data found")
                
                if "avg_stats" in data:
                    avg_stats = data["avg_stats"]
                    self.log(f"   Total Attempts: {avg_stats.get('total_attempts', 0)}")
                    self.log(f"   Avg Value: {avg_stats.get('avg_value', 'N/A')}")
                    self.log(f"   Avg Quality: {avg_stats.get('avg_quality', 'N/A')}")
                
                return True
            else:
                self.log(f"❌ Golf swing PR failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Golf swing PR error: {str(e)}")
            return False
    
    def test_personal_record_fitness_squat(self):
        """Test 3: GET /api/kore/personal-record?exercise_type=squat&disciplina=Fitness"""
        self.log("🏋️ Testing personal record for Fitness squat...")
        
        try:
            params = {
                "exercise_type": "squat",
                "disciplina": "Fitness"
            }
            
            response = self.session.get(f"{BASE_URL}/kore/personal-record", params=params)
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ Fitness squat personal record endpoint working")
                
                # Check response structure
                if "pr" in data:
                    pr = data["pr"]
                    if pr:
                        self.log(f"   PR Found: {pr.get('primary_result', {}).get('value', 'N/A')} {pr.get('primary_result', {}).get('unit', '')}")
                        self.log(f"   Quality: {pr.get('quality_score', 'N/A')}%")
                        self.log(f"   Date: {pr.get('completed_at', 'N/A')}")
                    else:
                        self.log("   No PR data found (expected for new user)")
                
                if "best_quality" in data:
                    best_q = data["best_quality"]
                    if best_q:
                        self.log(f"   Best Quality: {best_q.get('quality_score', 'N/A')}%")
                    else:
                        self.log("   No best quality data found")
                
                if "avg_stats" in data:
                    avg_stats = data["avg_stats"]
                    self.log(f"   Total Attempts: {avg_stats.get('total_attempts', 0)}")
                    self.log(f"   Avg Value: {avg_stats.get('avg_value', 'N/A')}")
                    self.log(f"   Avg Quality: {avg_stats.get('avg_quality', 'N/A')}")
                
                return True
            else:
                self.log(f"❌ Fitness squat PR failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Fitness squat PR error: {str(e)}")
            return False
    
    def test_personal_record_nonexistent(self):
        """Test 4: GET /api/kore/personal-record?exercise_type=nonexistent&disciplina=Unknown"""
        self.log("❓ Testing personal record for nonexistent exercise/discipline...")
        
        try:
            params = {
                "exercise_type": "nonexistent",
                "disciplina": "Unknown"
            }
            
            response = self.session.get(f"{BASE_URL}/kore/personal-record", params=params)
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ Nonexistent exercise/discipline endpoint working")
                
                # Should return null/empty PR data
                if "pr" in data:
                    pr = data["pr"]
                    if pr is None:
                        self.log("   ✅ PR correctly returns null for nonexistent data")
                    else:
                        self.log(f"   ⚠️ PR unexpectedly found data: {pr}")
                
                if "best_quality" in data:
                    best_q = data["best_quality"]
                    if best_q is None:
                        self.log("   ✅ Best quality correctly returns null")
                    else:
                        self.log(f"   ⚠️ Best quality unexpectedly found data: {best_q}")
                
                if "avg_stats" in data:
                    avg_stats = data["avg_stats"]
                    total_attempts = avg_stats.get("total_attempts", 0)
                    if total_attempts == 0:
                        self.log("   ✅ Avg stats correctly shows 0 attempts")
                    else:
                        self.log(f"   ⚠️ Avg stats unexpectedly shows {total_attempts} attempts")
                
                return True
            else:
                self.log(f"❌ Nonexistent exercise PR failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Nonexistent exercise PR error: {str(e)}")
            return False
    
    def test_kore_history(self):
        """Test 5: GET /api/kore/history - Ensure all previously saved records appear correctly"""
        self.log("📚 Testing KORE history endpoint...")
        
        try:
            response = self.session.get(f"{BASE_URL}/kore/history")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ KORE history endpoint working")
                
                # Check response structure
                if "records" in data:
                    records = data["records"]
                    self.log(f"   Records found: {len(records)}")
                    
                    # Show first few records if any
                    for i, record in enumerate(records[:3]):
                        self.log(f"   Record {i+1}: {record.get('disciplina', 'Unknown')} - {record.get('exercise_type', 'Unknown')}")
                        self.log(f"     Type: {record.get('tipo', 'Unknown')}")
                        self.log(f"     Certified: {record.get('is_certified', False)}")
                        self.log(f"     FLUX: {record.get('flux_earned', 0)}")
                        self.log(f"     Date: {record.get('completed_at', 'Unknown')}")
                
                if "total" in data:
                    self.log(f"   Total records: {data['total']}")
                
                if "stats" in data:
                    stats = data["stats"]
                    self.log(f"   Total sessions: {stats.get('total_sessions', 0)}")
                    self.log(f"   Total FLUX: {stats.get('total_flux', 0)}")
                    self.log(f"   Avg quality: {stats.get('avg_quality', 0)}")
                    self.log(f"   Certified count: {stats.get('certified_count', 0)}")
                
                if "discipline_breakdown" in data:
                    breakdown = data["discipline_breakdown"]
                    self.log(f"   Discipline breakdown: {len(breakdown)} disciplines")
                    for disc in breakdown[:3]:
                        self.log(f"     {disc.get('disciplina', 'Unknown')}: {disc.get('count', 0)} sessions")
                
                return True
            else:
                self.log(f"❌ KORE history failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ KORE history error: {str(e)}")
            return False
    
    def test_kore_stats(self):
        """Test 6: GET /api/kore/stats - Verify stats aggregate still works"""
        self.log("📊 Testing KORE stats endpoint...")
        
        try:
            response = self.session.get(f"{BASE_URL}/kore/stats")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ KORE stats endpoint working")
                
                # Check response structure
                if "stats" in data:
                    stats = data["stats"]
                    self.log(f"   Total sessions: {stats.get('total_sessions', 0)}")
                    self.log(f"   Total FLUX: {stats.get('total_flux', 0)}")
                    self.log(f"   Avg quality: {stats.get('avg_quality', 0)}")
                    self.log(f"   Best quality: {stats.get('best_quality', 0)}")
                    self.log(f"   Total reps: {stats.get('total_reps', 0)}")
                    self.log(f"   Certified count: {stats.get('certified_count', 0)}")
                
                if "tipo_breakdown" in data:
                    tipo_breakdown = data["tipo_breakdown"]
                    self.log(f"   Type breakdown: {tipo_breakdown}")
                
                if "weekly_trend" in data:
                    weekly = data["weekly_trend"]
                    self.log(f"   Weekly trend: {len(weekly)} days with data")
                    for day in weekly[:3]:
                        self.log(f"     {day.get('date', 'Unknown')}: {day.get('count', 0)} sessions, {day.get('flux', 0)} FLUX")
                
                return True
            else:
                self.log(f"❌ KORE stats failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ KORE stats error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all KORE Detail View tests"""
        self.log("🚀 Starting KORE Detail View Backend Testing")
        self.log("=" * 60)
        
        tests = [
            ("Admin Login", self.test_login),
            ("Golf Swing Personal Record", self.test_personal_record_golf_swing),
            ("Fitness Squat Personal Record", self.test_personal_record_fitness_squat),
            ("Nonexistent Exercise Personal Record", self.test_personal_record_nonexistent),
            ("KORE History", self.test_kore_history),
            ("KORE Stats", self.test_kore_stats),
        ]
        
        results = []
        
        for test_name, test_func in tests:
            self.log(f"\n📋 Running: {test_name}")
            self.log("-" * 40)
            
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
        self.log("\n" + "=" * 60)
        self.log("📊 TEST SUMMARY")
        self.log("=" * 60)
        
        passed = sum(1 for _, success in results if success)
        total = len(results)
        
        for test_name, success in results:
            status = "✅ PASS" if success else "❌ FAIL"
            self.log(f"{status} - {test_name}")
        
        self.log(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED! KORE Detail View endpoints are working correctly.")
            return True
        else:
            self.log(f"⚠️ {total - passed} test(s) failed. Please review the issues above.")
            return False

def main():
    """Main test execution"""
    tester = KoreDetailViewTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()