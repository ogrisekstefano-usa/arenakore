#!/usr/bin/env python3
"""
ARENAKORE Health/Connectivity Backend Testing
Testing Universal Data Aggregator endpoints for health data ingestion and connectivity
"""

import requests
import json
import base64
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://arena-scan-lab.preview.emergentagent.com/api"
# Using credentials from review request
LOGIN_EMAIL = "d.rose@chicago.kore"
LOGIN_PASSWORD = "Seed@Chicago1"

class HealthAPITester:
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
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def test_health_ingest_ble_sensor(self) -> bool:
        """Test SCENARIO 1: Health Ingestion — BPM from BLE Sensor"""
        print("\n🔍 Testing SCENARIO 1: Health Ingestion — BPM from BLE Sensor")
        
        payload = {
            "source": "BLE_SENSOR",
            "data_type": "BPM",
            "values": [
                {"t": 0, "bpm": 72},
                {"t": 30, "bpm": 85},
                {"t": 60, "bpm": 110},
                {"t": 90, "bpm": 135},
                {"t": 120, "bpm": 148}
            ],
            "timestamp_start": "2025-04-03T00:00:00Z",
            "timestamp_end": "2025-04-03T00:02:00Z"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/health/ingest", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ BLE Sensor BPM ingestion successful")
                print(f"   Status: {data.get('status')}")
                print(f"   Source Trust: {data.get('source_trust')}")
                print(f"   Data Points: {data.get('data_points')}")
                print(f"   Health Data ID: {data.get('health_data_id')}")
                
                # Verify expected values
                expected_status = "ingested"
                expected_trust = 0.92
                expected_points = 5
                
                if (data.get('status') == expected_status and 
                    data.get('source_trust') == expected_trust and 
                    data.get('data_points') == expected_points):
                    print("✅ All expected values match")
                    return True
                else:
                    print(f"❌ Expected values mismatch:")
                    print(f"   Expected: status={expected_status}, trust={expected_trust}, points={expected_points}")
                    print(f"   Actual: status={data.get('status')}, trust={data.get('source_trust')}, points={data.get('data_points')}")
                    return False
                    
            else:
                print(f"❌ BLE Sensor BPM ingestion failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ BLE Sensor BPM ingestion error: {str(e)}")
            return False
    
    def test_health_ingest_apple_health(self) -> bool:
        """Test SCENARIO 2: Health Ingestion — GPS from Apple Health"""
        print("\n🔍 Testing SCENARIO 2: Health Ingestion — GPS from Apple Health")
        
        payload = {
            "source": "APPLE_HEALTH",
            "data_type": "GPS_TRACK",
            "values": [
                {"lat": 45.46, "lng": 9.19, "t": 0},
                {"lat": 45.47, "lng": 9.20, "t": 300}
            ],
            "timestamp_start": "2025-04-03T00:00:00Z"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/health/ingest", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Apple Health GPS ingestion successful")
                print(f"   Status: {data.get('status')}")
                print(f"   Source Trust: {data.get('source_trust')}")
                print(f"   Data Points: {data.get('data_points')}")
                
                # Verify expected values
                expected_status = "ingested"
                expected_trust = 0.85
                
                if (data.get('status') == expected_status and 
                    data.get('source_trust') == expected_trust):
                    print("✅ All expected values match")
                    return True
                else:
                    print(f"❌ Expected values mismatch:")
                    print(f"   Expected: status={expected_status}, trust={expected_trust}")
                    print(f"   Actual: status={data.get('status')}, trust={data.get('source_trust')}")
                    return False
                    
            else:
                print(f"❌ Apple Health GPS ingestion failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Apple Health GPS ingestion error: {str(e)}")
            return False
    
    def test_invalid_source_rejection(self) -> bool:
        """Test SCENARIO 3: Invalid Source Rejection"""
        print("\n🔍 Testing SCENARIO 3: Invalid Source Rejection")
        
        payload = {
            "source": "INVALID_SOURCE",
            "data_type": "BPM",
            "values": [{"t": 0, "bpm": 72}],
            "timestamp_start": "2025-04-03T00:00:00Z"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/health/ingest", json=payload)
            
            if response.status_code == 400:
                print(f"✅ Invalid source correctly rejected with 400 error")
                print(f"   Response: {response.text}")
                return True
            else:
                print(f"❌ Invalid source should return 400, got {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Invalid source test error: {str(e)}")
            return False
    
    def test_health_connections(self) -> bool:
        """Test SCENARIO 4: Health Connections Status"""
        print("\n🔍 Testing SCENARIO 4: Health Connections Status")
        
        try:
            response = self.session.get(f"{BASE_URL}/health/connections")
            
            if response.status_code == 200:
                data = response.json()
                connections = data.get("connections", [])
                print(f"✅ Health connections retrieved successfully")
                print(f"   Total connections: {len(connections)}")
                
                # Verify expected 4 connections
                expected_sources = ["APPLE_HEALTH", "GOOGLE_HEALTH", "STRAVA", "BLE_SENSOR"]
                found_sources = [conn.get("source") for conn in connections]
                
                print(f"   Found sources: {found_sources}")
                
                # Check if all expected sources are present
                all_present = all(source in found_sources for source in expected_sources)
                
                if all_present and len(connections) == 4:
                    print("✅ All 4 expected connections found")
                    
                    # Check for Strava connection status (should be true from demo sync)
                    strava_conn = next((conn for conn in connections if conn.get("source") == "STRAVA"), None)
                    if strava_conn:
                        print(f"   Strava connected: {strava_conn.get('connected')}")
                        print(f"   Strava display name: {strava_conn.get('display_name')}")
                        print(f"   Strava total syncs: {strava_conn.get('total_syncs')}")
                    
                    return True
                else:
                    print(f"❌ Expected 4 connections with specific sources, got {len(connections)}")
                    return False
                    
            else:
                print(f"❌ Health connections failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Health connections error: {str(e)}")
            return False
    
    def test_connect_disconnect_apple_health(self) -> bool:
        """Test SCENARIO 5: Connect/Disconnect Apple Health"""
        print("\n🔍 Testing SCENARIO 5: Connect/Disconnect Apple Health")
        
        try:
            # First connection attempt
            response1 = self.session.post(f"{BASE_URL}/health/connect", json={
                "source": "APPLE_HEALTH"
            })
            
            if response1.status_code == 200:
                data1 = response1.json()
                connected1 = data1.get("connected")
                print(f"✅ First Apple Health connect call successful")
                print(f"   Connected: {connected1}")
                
                # Second connection attempt (should toggle)
                response2 = self.session.post(f"{BASE_URL}/health/connect", json={
                    "source": "APPLE_HEALTH"
                })
                
                if response2.status_code == 200:
                    data2 = response2.json()
                    connected2 = data2.get("connected")
                    print(f"✅ Second Apple Health connect call successful")
                    print(f"   Connected: {connected2}")
                    
                    # Verify toggle behavior
                    if connected1 != connected2:
                        print("✅ Toggle behavior working correctly")
                        return True
                    else:
                        print("❌ Toggle behavior not working - same status returned")
                        return False
                else:
                    print(f"❌ Second Apple Health connect failed: {response2.status_code}")
                    return False
            else:
                print(f"❌ First Apple Health connect failed: {response1.status_code}")
                print(f"   Response: {response1.text}")
                return False
                
        except Exception as e:
            print(f"❌ Apple Health connect/disconnect error: {str(e)}")
            return False
    
    def test_recent_health_data(self) -> bool:
        """Test SCENARIO 6: Recent Health Data"""
        print("\n🔍 Testing SCENARIO 6: Recent Health Data")
        
        try:
            response = self.session.get(f"{BASE_URL}/health/recent")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Recent health data retrieved successfully")
                print(f"   Total records: {len(data)}")
                
                # Verify data structure
                if data:
                    sample = data[0]
                    required_fields = ["id", "source", "data_type", "values", "ingested_at", "source_meta"]
                    
                    print(f"   Sample record:")
                    print(f"     ID: {sample.get('id')}")
                    print(f"     Source: {sample.get('source')}")
                    print(f"     Data Type: {sample.get('data_type')}")
                    print(f"     Values Count: {len(sample.get('values', []))}")
                    print(f"     Ingested At: {sample.get('ingested_at')}")
                    print(f"     Source Meta: {sample.get('source_meta')}")
                    
                    # Check if all required fields are present
                    all_fields_present = all(field in sample for field in required_fields)
                    
                    if all_fields_present:
                        print("✅ All required fields present in response")
                        return True
                    else:
                        missing_fields = [field for field in required_fields if field not in sample]
                        print(f"❌ Missing required fields: {missing_fields}")
                        return False
                else:
                    print("⚠️  No health data found (empty array)")
                    return True  # Empty array is valid
                    
            else:
                print(f"❌ Recent health data failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Recent health data error: {str(e)}")
            return False
    
    def test_strava_demo_sync(self) -> bool:
        """Test SCENARIO 7: Strava Demo Sync"""
        print("\n🔍 Testing SCENARIO 7: Strava Demo Sync")
        
        try:
            response = self.session.post(f"{BASE_URL}/health/strava-demo-sync")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Strava demo sync successful")
                print(f"   Status: {data.get('status')}")
                print(f"   Demo Mode: {data.get('demo_mode')}")
                print(f"   Activities: {len(data.get('activities', []))}")
                
                # Verify expected values
                expected_status = "synced"
                expected_demo_mode = True
                expected_activities_count = 3
                
                activities = data.get('activities', [])
                
                if (data.get('status') == expected_status and 
                    data.get('demo_mode') == expected_demo_mode and 
                    len(activities) == expected_activities_count):
                    print("✅ All expected values match")
                    
                    # Show activity details
                    for i, activity in enumerate(activities):
                        print(f"   Activity {i+1}: ID={activity.get('id')}, Type={activity.get('type')}")
                    
                    return True
                else:
                    print(f"❌ Expected values mismatch:")
                    print(f"   Expected: status={expected_status}, demo_mode={expected_demo_mode}, activities={expected_activities_count}")
                    print(f"   Actual: status={data.get('status')}, demo_mode={data.get('demo_mode')}, activities={len(activities)}")
                    return False
                    
            else:
                print(f"❌ Strava demo sync failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Strava demo sync error: {str(e)}")
            return False
    
    def test_source_meta(self) -> bool:
        """Test SCENARIO 8: Source Meta (NO AUTH REQUIRED)"""
        print("\n🔍 Testing SCENARIO 8: Source Meta (NO AUTH REQUIRED)")
        
        try:
            # Create a new session without auth headers for this test
            no_auth_session = requests.Session()
            response = no_auth_session.get(f"{BASE_URL}/health/source-meta")
            
            if response.status_code == 200:
                data = response.json()
                sources = data.get("sources", {})
                trust_levels = data.get("trust_levels", {})
                
                print(f"✅ Source meta retrieved successfully (no auth)")
                print(f"   Sources count: {len(sources)}")
                print(f"   Trust levels count: {len(trust_levels)}")
                
                # Verify expected sources
                expected_sources = ["NEXUS_VISION", "BLE_SENSOR", "STRAVA", "APPLE_HEALTH", "GOOGLE_HEALTH", "MANUAL"]
                found_sources = list(sources.keys())
                
                print(f"   Found sources: {found_sources}")
                
                # Check if all expected sources are present
                all_present = all(source in found_sources for source in expected_sources)
                
                if all_present:
                    print("✅ All expected sources found")
                    
                    # Verify source structure (icon, label, color)
                    sample_source = sources.get("APPLE_HEALTH", {})
                    required_fields = ["icon", "label", "color"]
                    
                    if all(field in sample_source for field in required_fields):
                        print(f"✅ Source structure valid")
                        print(f"   Sample (APPLE_HEALTH): {sample_source}")
                        
                        # Verify trust levels are numeric
                        trust_sample = trust_levels.get("APPLE_HEALTH")
                        if isinstance(trust_sample, (int, float)):
                            print(f"✅ Trust levels are numeric")
                            print(f"   Sample trust (APPLE_HEALTH): {trust_sample}")
                            return True
                        else:
                            print(f"❌ Trust levels should be numeric, got {type(trust_sample)}")
                            return False
                    else:
                        print(f"❌ Source structure missing required fields")
                        return False
                else:
                    missing_sources = [source for source in expected_sources if source not in found_sources]
                    print(f"❌ Missing expected sources: {missing_sources}")
                    return False
                    
            else:
                print(f"❌ Source meta failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Source meta error: {str(e)}")
            return False
    
    def test_strava_webhook_verify(self) -> bool:
        """Test SCENARIO 9: Strava Webhook Verify"""
        print("\n🔍 Testing SCENARIO 9: Strava Webhook Verify")
        
        try:
            # Create a new session without auth headers for this test
            no_auth_session = requests.Session()
            
            # Test webhook verification with correct parameters
            params = {
                "hub.mode": "subscribe",
                "hub.challenge": "test123",
                "hub.verify_token": "ARENAKORE_STRAVA_VERIFY"
            }
            
            response = no_auth_session.get(f"{BASE_URL}/webhooks/strava", params=params)
            
            if response.status_code == 200:
                data = response.json()
                challenge = data.get("hub.challenge")
                
                print(f"✅ Strava webhook verification successful")
                print(f"   Response: {data}")
                
                # Verify the challenge is echoed back
                if challenge == "test123":
                    print("✅ Hub challenge correctly echoed back")
                    return True
                else:
                    print(f"❌ Expected hub.challenge='test123', got '{challenge}'")
                    return False
                    
            else:
                print(f"❌ Strava webhook verification failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Strava webhook verification error: {str(e)}")
            return False

def main():
    """Main testing function"""
    print("🚀 ARENAKORE Health/Connectivity Backend Testing")
    print("Testing Universal Data Aggregator endpoints")
    print("=" * 70)
    
    tester = HealthAPITester()
    
    # Step 1: Login
    print("\n📋 AUTHENTICATION")
    if not tester.login(LOGIN_EMAIL, LOGIN_PASSWORD):
        print("❌ Cannot proceed without authentication")
        return
    
    # Test all scenarios
    test_results = {}
    
    # SCENARIO 1: Health Ingestion — BPM from BLE Sensor
    test_results["ble_sensor_bpm"] = tester.test_health_ingest_ble_sensor()
    
    # SCENARIO 2: Health Ingestion — GPS from Apple Health
    test_results["apple_health_gps"] = tester.test_health_ingest_apple_health()
    
    # SCENARIO 3: Invalid Source Rejection
    test_results["invalid_source"] = tester.test_invalid_source_rejection()
    
    # SCENARIO 4: Health Connections Status
    test_results["health_connections"] = tester.test_health_connections()
    
    # SCENARIO 5: Connect/Disconnect Apple Health
    test_results["apple_health_toggle"] = tester.test_connect_disconnect_apple_health()
    
    # SCENARIO 6: Recent Health Data
    test_results["recent_health_data"] = tester.test_recent_health_data()
    
    # SCENARIO 7: Strava Demo Sync
    test_results["strava_demo_sync"] = tester.test_strava_demo_sync()
    
    # SCENARIO 8: Source Meta (NO AUTH REQUIRED)
    test_results["source_meta"] = tester.test_source_meta()
    
    # SCENARIO 9: Strava Webhook Verify
    test_results["strava_webhook"] = tester.test_strava_webhook_verify()
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    
    print(f"✅ Authentication: SUCCESS")
    
    for scenario, result in test_results.items():
        status = "✅ SUCCESS" if result else "❌ FAILED"
        print(f"{status}: {scenario}")
    
    # Overall result
    overall_success = all(test_results.values())
    
    print(f"\n🎯 OVERALL RESULT: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
    
    if not overall_success:
        failed_tests = [test for test, result in test_results.items() if not result]
        print(f"\n⚠️  Failed tests: {', '.join(failed_tests)}")

if __name__ == "__main__":
    main()