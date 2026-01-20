#!/usr/bin/env python
import requests

print("=== Quick Login Test ===")
print()

url = 'http://localhost:8000/api/security/login/'
data = {'username': 'officer001', 'password': 'test123'}

try:
    response = requests.post(url, json=data, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Time: {response.elapsed.total_seconds():.1f}s")

    if response.status_code == 200:
        result = response.json()
        print("SUCCESS: Login works!")
        print(f"Access token: {'Yes' if 'access' in result else 'No'}")
        print(f"Refresh token: {'Yes' if 'refresh' in result else 'No'}")
    else:
        print("FAILED: Login error")
        try:
            error = response.json()
            print(f"Error: {error.get('error', 'Unknown')}")
            print(f"Detail: {error.get('detail', 'No details')[:80]}...")
        except:
            print(f"Response: {response.text[:100]}...")

except Exception as e:
    print(f"ERROR: {e}")

print()
print("=== Test Complete ===")