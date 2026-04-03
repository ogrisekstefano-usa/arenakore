#!/usr/bin/env python3
"""
ARENAKORE Backend Testing - Sensory Immersion & Coach Analytics
Testing specific endpoints for Team Comparison Mode and PDF Export
"""

import requests
import json
import base64
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
COACH_EMAIL = "demo.owner@arenakore.app"
COACH_PASSWORD = "Demo@GymOwner2026!"

class ArenakoreAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_data = None
        
    def login(self, email: str, password: str) -> bool:
        """Login and store authentication token"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": email,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                self.user_data = data.get("user")
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                print(f"✅ Login successful for {email}")
                print(f"   User: {self.user_data.get('username', 'N/A')}")
                print(f"   Role: {self.user_data.get('role', 'N/A')}")
                print(f"   Is Admin: {self.user_data.get('is_admin', False)}")
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def test_get_athletes_full(self) -> List[str]:
        """Test GET /api/coach/athletes/full and return athlete IDs"""
        print("\n🔍 Testing GET /api/coach/athletes/full")
        
        try:
            response = self.session.get(f"{BASE_URL}/coach/athletes/full")
            
            if response.status_code == 200:
                data = response.json()
                athletes = data.get("athletes", [])
                total = data.get("total", 0)
                
                print(f"✅ Athletes endpoint successful")
                print(f"   Total athletes: {total}")
                
                athlete_ids = []
                for i, athlete in enumerate(athletes[:5]):  # Show first 5
                    athlete_id = athlete.get("id")
                    username = athlete.get("username", "N/A")
                    kore_score = athlete.get("kore_score", 0)
                    six_axis = athlete.get("six_axis", {})
                    
                    print(f"   [{i+1}] ID: {athlete_id}")
                    print(f"       Username: {username}")
                    print(f"       KORE Score: {kore_score}")
                    print(f"       Six Axis Keys: {list(six_axis.keys())}")
                    
                    if athlete_id:
                        athlete_ids.append(athlete_id)
                
                if len(athlete_ids) >= 2:
                    print(f"✅ Found {len(athlete_ids)} athlete IDs for comparison testing")
                    return athlete_ids
                else:
                    print(f"⚠️  Only found {len(athlete_ids)} athletes, need at least 2 for comparison")
                    return athlete_ids
                    
            else:
                print(f"❌ Athletes endpoint failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Athletes endpoint error: {str(e)}")
            return []
    
    def test_compare_athletes(self, athlete_ids: List[str]) -> bool:
        """Test GET /api/coach/compare-athletes with athlete IDs"""
        print(f"\n🔍 Testing GET /api/coach/compare-athletes")
        
        if len(athlete_ids) < 2:
            print("❌ Need at least 2 athlete IDs for comparison")
            return False
        
        # Test with first 2 athletes
        test_ids = athlete_ids[:2]
        ids_param = ",".join(test_ids)
        
        try:
            response = self.session.get(f"{BASE_URL}/coach/compare-athletes?ids={ids_param}")
            
            if response.status_code == 200:
                data = response.json()
                athletes = data.get("athletes", [])
                gap_analysis = data.get("gap_analysis", [])
                
                print(f"✅ Compare athletes successful")
                print(f"   Athletes compared: {len(athletes)}")
                
                # Verify athletes structure
                for i, athlete in enumerate(athletes):
                    username = athlete.get("username", "N/A")
                    six_axis = athlete.get("six_axis", {})
                    kore_score = athlete.get("kore_score", 0)
                    kore_grade = athlete.get("kore_grade", "N/A")
                    
                    print(f"   Athlete {i+1}: {username}")
                    print(f"     KORE Score: {kore_score}")
                    print(f"     KORE Grade: {kore_grade}")
                    print(f"     Six Axis: {six_axis}")
                
                # Verify gap analysis structure
                print(f"   Gap Analysis entries: {len(gap_analysis)}")
                for gap in gap_analysis[:3]:  # Show first 3
                    stat = gap.get("stat", "N/A")
                    leader = gap.get("leader", "N/A")
                    leader_value = gap.get("leader_value", 0)
                    athletes_data = gap.get("athletes", [])
                    
                    print(f"   Stat: {stat}")
                    print(f"     Leader: {leader} ({leader_value})")
                    print(f"     Athletes data: {len(athletes_data)} entries")
                    
                    for athlete_data in athletes_data:
                        username = athlete_data.get("username", "N/A")
                        value = athlete_data.get("value", 0)
                        diff = athlete_data.get("diff", 0)
                        diff_pct = athlete_data.get("diff_pct", 0)
                        is_leader = athlete_data.get("is_leader", False)
                        
                        print(f"       {username}: {value} (diff: {diff}, {diff_pct}%, leader: {is_leader})")
                
                # Verify required structure
                required_athlete_fields = ["username", "six_axis", "kore_score", "kore_grade"]
                required_gap_fields = ["leader", "leader_value", "athletes"]
                
                athletes_valid = all(
                    all(field in athlete for field in required_athlete_fields)
                    for athlete in athletes
                )
                
                gap_valid = all(
                    all(field in gap for field in required_gap_fields)
                    for gap in gap_analysis
                )
                
                if athletes_valid and gap_valid:
                    print("✅ Response structure validation passed")
                    return True
                else:
                    print("❌ Response structure validation failed")
                    return False
                    
            else:
                print(f"❌ Compare athletes failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Compare athletes error: {str(e)}")
            return False
    
    def test_athlete_pdf(self, athlete_id: str) -> bool:
        """Test GET /api/report/athlete-pdf/{athlete_id}"""
        print(f"\n🔍 Testing GET /api/report/athlete-pdf/{athlete_id}")
        
        try:
            response = self.session.get(f"{BASE_URL}/report/athlete-pdf/{athlete_id}")
            
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "")
                content_length = len(response.content)
                
                print(f"✅ PDF generation successful")
                print(f"   Content-Type: {content_type}")
                print(f"   Content Length: {content_length} bytes")
                
                # Verify it's a PDF
                if content_type == "application/pdf" and content_length > 0:
                    # Check PDF magic bytes
                    if response.content.startswith(b'%PDF'):
                        print("✅ Valid PDF file confirmed (magic bytes check)")
                        return True
                    else:
                        print("❌ Invalid PDF file (magic bytes check failed)")
                        return False
                else:
                    print(f"❌ Invalid response: expected application/pdf with content, got {content_type}")
                    return False
                    
            else:
                print(f"❌ PDF generation failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ PDF generation error: {str(e)}")
            return False
    
    def test_edge_cases(self) -> Dict[str, bool]:
        """Test edge cases for compare-athletes and athlete-pdf"""
        print(f"\n🔍 Testing Edge Cases")
        
        results = {}
        
        # Test 1: Single athlete ID (should fail)
        print("\n   Test 1: Single athlete ID for comparison")
        try:
            response = self.session.get(f"{BASE_URL}/coach/compare-athletes?ids=507f1f77bcf86cd799439011")
            if response.status_code == 400:
                print("✅ Single athlete ID correctly rejected (400 error)")
                results["single_id_rejection"] = True
            else:
                print(f"❌ Single athlete ID should return 400, got {response.status_code}")
                results["single_id_rejection"] = False
        except Exception as e:
            print(f"❌ Single athlete ID test error: {str(e)}")
            results["single_id_rejection"] = False
        
        # Test 2: Empty IDs (should fail)
        print("\n   Test 2: Empty IDs for comparison")
        try:
            response = self.session.get(f"{BASE_URL}/coach/compare-athletes?ids=")
            if response.status_code == 400:
                print("✅ Empty IDs correctly rejected (400 error)")
                results["empty_ids_rejection"] = True
            else:
                print(f"❌ Empty IDs should return 400, got {response.status_code}")
                results["empty_ids_rejection"] = False
        except Exception as e:
            print(f"❌ Empty IDs test error: {str(e)}")
            results["empty_ids_rejection"] = False
        
        # Test 3: Invalid athlete ID for PDF (should fail)
        print("\n   Test 3: Invalid athlete ID for PDF")
        try:
            response = self.session.get(f"{BASE_URL}/report/athlete-pdf/invalid_id")
            if response.status_code == 400:
                print("✅ Invalid athlete ID correctly rejected (400 error)")
                results["invalid_pdf_id_rejection"] = True
            else:
                print(f"❌ Invalid athlete ID should return 400, got {response.status_code}")
                results["invalid_pdf_id_rejection"] = False
        except Exception as e:
            print(f"❌ Invalid athlete ID test error: {str(e)}")
            results["invalid_pdf_id_rejection"] = False
        
        return results

def main():
    """Main testing function"""
    print("🚀 ARENAKORE Backend Testing - Sensory Immersion & Coach Analytics")
    print("=" * 70)
    
    tester = ArenakoreAPITester()
    
    # Step 1: Login as Coach
    print("\n📋 SCENARIO 1: Team Comparison Mode")
    if not tester.login(COACH_EMAIL, COACH_PASSWORD):
        print("❌ Cannot proceed without authentication")
        return
    
    # Step 2: Get athletes list
    athlete_ids = tester.test_get_athletes_full()
    
    if len(athlete_ids) < 2:
        print("❌ Cannot test comparison without at least 2 athletes")
        return
    
    # Step 3: Test comparison
    comparison_success = tester.test_compare_athletes(athlete_ids)
    
    # Step 4: Test PDF generation
    print("\n📋 SCENARIO 2: PDF Export - Kore Passport")
    pdf_success = tester.test_athlete_pdf(athlete_ids[0])
    
    # Step 5: Test edge cases
    print("\n📋 SCENARIO 3: Edge Cases")
    edge_results = tester.test_edge_cases()
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    
    print(f"✅ Coach Login: SUCCESS")
    print(f"✅ Athletes Full Endpoint: SUCCESS ({len(athlete_ids)} athletes found)")
    print(f"{'✅' if comparison_success else '❌'} Team Comparison: {'SUCCESS' if comparison_success else 'FAILED'}")
    print(f"{'✅' if pdf_success else '❌'} PDF Export: {'SUCCESS' if pdf_success else 'FAILED'}")
    
    print("\nEdge Cases:")
    for test_name, result in edge_results.items():
        status = "✅ SUCCESS" if result else "❌ FAILED"
        print(f"  {status}: {test_name}")
    
    # Overall result
    all_tests = [comparison_success, pdf_success] + list(edge_results.values())
    overall_success = all(all_tests)
    
    print(f"\n🎯 OVERALL RESULT: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
    
    if not overall_success:
        print("\n⚠️  Failed tests require investigation")

if __name__ == "__main__":
    main()