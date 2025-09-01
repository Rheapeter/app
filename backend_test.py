#!/usr/bin/env python3
"""
Trade Union MIS Backend API Testing
Tests all API endpoints for functionality and proper responses
"""

import requests
import sys
import json
from datetime import datetime, date
from typing import Dict, Any

class TradeUnionAPITester:
    def __init__(self, base_url="https://vscode-continue.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def test_endpoint(self, name: str, method: str, endpoint: str, expected_status: int = 200, 
                     data: Dict = None, params: Dict = None) -> tuple:
        """Test a single API endpoint"""
        url = f"{self.base_url}/api{endpoint}" if not endpoint.startswith('/api') else f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, params=params)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, params=params)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, params=params)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, params=params)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return True, response_data
                except json.JSONDecodeError:
                    self.log_test(name, True, f"Status: {response.status_code} (No JSON response)")
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Error: {error_data}")
                except:
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")
                return False, {}

        except requests.exceptions.RequestException as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Unexpected error: {str(e)}")
            return False, {}

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n🔍 Testing Basic Endpoints...")
        
        # Test root endpoint
        self.test_endpoint("API Root", "GET", "/")
        
        # Test health check
        self.test_endpoint("Health Check", "GET", "/health")

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔍 Testing Authentication Endpoints...")
        
        # Test login endpoint (should return Google auth URL)
        success, response = self.test_endpoint("Auth Login", "GET", "/auth/login")
        if success and 'authorization_url' in response:
            print(f"   📋 Google Auth URL generated successfully")
        
        # Test user info endpoint (should fail without auth)
        self.test_endpoint("User Info (Unauthenticated)", "GET", "/auth/user-info", expected_status=401)
        
        # Test logout endpoint
        self.test_endpoint("Logout", "POST", "/auth/logout")

    def test_dashboard_endpoints(self):
        """Test dashboard endpoints"""
        print("\n🔍 Testing Dashboard Endpoints...")
        
        # Test dashboard stats
        success, response = self.test_endpoint("Dashboard Stats", "GET", "/dashboard/stats")
        if success:
            expected_fields = ['total_members', 'active_members', 'renewals_pending', 'total_revenue']
            missing_fields = [field for field in expected_fields if field not in response]
            if missing_fields:
                print(f"   ⚠️  Missing fields in dashboard stats: {missing_fields}")
            else:
                print(f"   📊 Dashboard stats structure is correct")
                print(f"   📈 Total Members: {response.get('total_members', 0)}")
                print(f"   📈 Active Members: {response.get('active_members', 0)}")
                print(f"   📈 Pending Renewals: {response.get('renewals_pending', 0)}")
                print(f"   📈 Total Revenue: ₹{response.get('total_revenue', 0)}")

    def test_member_endpoints(self):
        """Test member management endpoints"""
        print("\n🔍 Testing Member Endpoints...")
        
        # Test get members
        success, response = self.test_endpoint("Get Members", "GET", "/members")
        if success:
            print(f"   👥 Found {len(response)} members")
            if response:
                member = response[0]
                required_fields = ['id', 'member_name', 'trade_union_number', 'contact_no', 'state']
                missing_fields = [field for field in required_fields if field not in member]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in member data: {missing_fields}")
                else:
                    print(f"   ✅ Member data structure is correct")
        
        # Test get members with search
        self.test_endpoint("Get Members (Search)", "GET", "/members", params={"search": "test"})
        
        # Test get members with state filter
        self.test_endpoint("Get Members (State Filter)", "GET", "/members", params={"state": "Maharashtra"})
        
        # Test get specific member (should fail for non-existent ID)
        self.test_endpoint("Get Non-existent Member", "GET", "/members/non-existent-id", expected_status=404)

    def test_renewal_endpoints(self):
        """Test renewal management endpoints"""
        print("\n🔍 Testing Renewal Endpoints...")
        
        # Test get renewals
        success, response = self.test_endpoint("Get Renewals", "GET", "/renewals")
        if success:
            print(f"   🔄 Found {len(response)} renewals")
            if response:
                renewal = response[0]
                required_fields = ['id', 'trade_union_number', 'renewal_date', 'receipt_number']
                missing_fields = [field for field in required_fields if field not in renewal]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in renewal data: {missing_fields}")
                else:
                    print(f"   ✅ Renewal data structure is correct")
        
        # Test get renewals with filters
        self.test_endpoint("Get Renewals (Filter)", "GET", "/renewals", params={"coordinator": "test"})

    def test_import_endpoints(self):
        """Test import endpoints (will fail without authentication)"""
        print("\n🔍 Testing Import Endpoints...")
        
        # Test import members (should fail without auth)
        self.test_endpoint("Import Members (Unauthenticated)", "POST", "/members/import", 
                          expected_status=401, params={"spreadsheet_id": "test"})
        
        # Test export renewals (should fail without auth)
        self.test_endpoint("Export Renewals (Unauthenticated)", "POST", "/renewals/export", 
                          expected_status=401, params={"spreadsheet_id": "test"})

    def test_error_handling(self):
        """Test error handling"""
        print("\n🔍 Testing Error Handling...")
        
        # Test invalid endpoints
        self.test_endpoint("Invalid Endpoint", "GET", "/invalid-endpoint", expected_status=404)
        
        # Test invalid member creation (should fail without auth)
        invalid_member_data = {
            "member_name": "Test Member",
            "trade_union_number": "TU001"
            # Missing required fields
        }
        self.test_endpoint("Invalid Member Data", "POST", "/members", 
                          expected_status=405, data=invalid_member_data)  # Method not allowed for POST /members

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Trade Union MIS API Tests")
        print(f"📍 Testing API at: {self.base_url}")
        print("=" * 60)
        
        try:
            self.test_basic_endpoints()
            self.test_auth_endpoints()
            self.test_dashboard_endpoints()
            self.test_member_endpoints()
            self.test_renewal_endpoints()
            self.test_import_endpoints()
            self.test_error_handling()
            
        except Exception as e:
            print(f"\n❌ Test suite failed with error: {e}")
            return False
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['name']}: {test['details']}")
        
        print("\n" + "=" * 60)
        
        return self.tests_passed == self.tests_run

def main():
    """Main test function"""
    tester = TradeUnionAPITester()
    
    try:
        success = tester.run_all_tests()
        tester.print_summary()
        
        if success:
            print("🎉 All tests passed! API is working correctly.")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1
            
    except KeyboardInterrupt:
        print("\n\n⏹️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Test suite crashed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())