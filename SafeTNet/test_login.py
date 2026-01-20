#!/usr/bin/env python
"""
Test script to verify login API works with the new security officer
"""

import requests
import json

def test_login():
    """Test login API with the security officer credentials"""

    url = 'http://localhost:8000/api/security/login/'
    data = {
        'username': 'officer001',
        'password': 'test123'
    }

    print("Testing login API...")
    print(f"URL: {url}")
    print(f"Username: {data['username']}")

    try:
        response = requests.post(url, json=data, timeout=10)

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print("SUCCESS: Login successful!")
            print(f"User: {result.get('name', 'N/A')}")
            print(f"Role: {result.get('security_role', 'N/A')}")
            print("SUCCESS: JWT Token received")

            # Test accessing protected endpoint
            headers = {
                'Authorization': f"Bearer {result.get('access', '')}"
            }

            print("\nTesting protected endpoint...")
            protected_url = 'http://localhost:8000/api/security/dashboard/'
            protected_response = requests.get(protected_url, headers=headers, timeout=10)

            print(f"Dashboard Status: {protected_response.status_code}")
            if protected_response.status_code == 200:
                print("SUCCESS: Protected endpoint accessible!")
            else:
                print(f"FAILED: Protected endpoint failed: {protected_response.text}")

        else:
            print(f"FAILED: Login failed: {response.text}")

    except requests.exceptions.ConnectionError:
        print("FAILED: Connection failed - Backend not running")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == '__main__':
    test_login()