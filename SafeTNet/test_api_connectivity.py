#!/usr/bin/env python
"""
Comprehensive API Connectivity Test for SafeTNet
Tests all endpoints to ensure they're working with Neon database
"""

import requests
import json
import time

def test_api_connectivity():
    """Test all SafeTNet API endpoints"""

    print("SafeTNet API Connectivity Test")
    print("=" * 50)
    print()

    base_url = 'http://localhost:8000'
    test_user = {'username': 'officer001', 'password': 'test123'}

    results = {}

    # 1. Test Root API
    print("1. Testing Root API...")
    try:
        start_time = time.time()
        response = requests.get(f'{base_url}/', timeout=5)
        response_time = time.time() - start_time

        print(f"   Status: {response.status_code}")
        print(f"   Response time: {response_time:.2f}s")
        if response.status_code == 200:
            data = response.json()
            print(f"   API Version: {data.get('version', 'Unknown')}")
            print(f"   Available Endpoints: {len(data.get('endpoints', {}))}")
            results['root'] = 'PASS'
        else:
            print(f"   Unexpected status: {response.status_code}")
            results['root'] = 'FAIL'
    except Exception as e:
        print(f"   Connection failed: {e}")
        results['root'] = 'FAIL'

    print()

    # 2. Test Login API
    print("2. Testing Login API...")
    try:
        start_time = time.time()
        response = requests.post(f'{base_url}/api/security/login/',
                               json=test_user, timeout=10)
        response_time = time.time() - start_time

        print(f"   Status: {response.status_code}")
        print(f"   Response time: {response_time:.2f}s")
        if response.status_code == 200:
            data = response.json()
            if 'access' in data and 'refresh' in data:
                token = data['access']
                print("   Login successful - JWT tokens received")
                results['login'] = 'PASS'
                test_token = token
            else:
                print("   Login response missing tokens")
                results['login'] = 'FAIL'
                test_token = None
        else:
            print(f"   Login failed: {response.text[:100]}...")
            results['login'] = 'FAIL'
            test_token = None

    except Exception as e:
        print(f"   Login test failed: {e}")
        results['login'] = 'FAIL'
        test_token = None

    print()

    if test_token:
        headers = {'Authorization': f'Bearer {test_token}'}

        # 3. Test Dashboard API
        print("3. Testing Dashboard API...")
        try:
            start_time = time.time()
            response = requests.get(f'{base_url}/api/security/dashboard/',
                                  headers=headers, timeout=10)
            response_time = time.time() - start_time

            print(f"   Status: {response.status_code}")
            print(f"   Response time: {response_time:.2f}s")
            if response.status_code == 200:
                data = response.json()
                stats = data.get('stats', {})
                alerts = data.get('recent_alerts', [])
                print(f"   Stats: {stats.get('total', 0)} total alerts")
                print(f"   Recent alerts: {len(alerts)}")
                results['dashboard'] = 'PASS'
            else:
                print(f"   Dashboard failed: {response.text[:100]}...")
                results['dashboard'] = 'FAIL'

        except Exception as e:
            print(f"   Dashboard test failed: {e}")
            results['dashboard'] = 'FAIL'

        print()

        # 4. Test SOS/Alerts API
        print("4. Testing SOS/Alerts API...")
        try:
            start_time = time.time()
            response = requests.get(f'{base_url}/api/security/sos/',
                                  headers=headers, timeout=10)
            response_time = time.time() - start_time

            print(f"   Status: {response.status_code}")
            print(f"   Response time: {response_time:.2f}s")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"   Alerts returned: {len(data)}")
                    if len(data) > 0:
                        sample_alert = data[0]
                        print(f"   Sample alert keys: {list(sample_alert.keys())[:5]}...")
                else:
                    print("   Alert data returned")
                results['sos'] = 'PASS'
            else:
                print(f"   SOS API failed: {response.text[:100]}...")
                results['sos'] = 'FAIL'

        except Exception as e:
            print(f"   SOS test failed: {e}")
            results['sos'] = 'FAIL'

        print()

        # 5. Test Profile API
        print("5. Testing Profile API...")
        try:
            start_time = time.time()
            response = requests.get(f'{base_url}/api/security/profile/',
                                  headers=headers, timeout=10)
            response_time = time.time() - start_time

            print(f"   Status: {response.status_code}")
            print(f"   Response time: {response_time:.2f}s")
            if response.status_code == 200:
                data = response.json()
                print(f"   User: {data.get('username', 'Unknown')}")
                print(f"   Role: {data.get('role', 'Unknown')}")
                results['profile'] = 'PASS'
            else:
                print(f"   Profile failed: {response.text[:100]}...")
                results['profile'] = 'FAIL'

        except Exception as e:
            print(f"   Profile test failed: {e}")
            results['profile'] = 'FAIL'

    print()
    print("=" * 50)
    print("TEST RESULTS SUMMARY")
    print("=" * 50)

    all_passed = True
    for api, result in results.items():
        print(f"{api.upper():<12} : {result}")
        if 'FAIL' in result:
            all_passed = False

    print()
    if all_passed:
        print("ALL API TESTS PASSED! Neon database connection is working perfectly!")
        print("SafeTNet backend is fully operational with real database connectivity.")
    else:
        print("Some API tests failed. Check the backend logs for more details.")

    return all_passed

if __name__ == '__main__':
    test_api_connectivity()