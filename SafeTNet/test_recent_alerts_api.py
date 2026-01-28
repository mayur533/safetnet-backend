import requests
import json

# Base URL for testing
BASE_URL = "http://127.0.0.1:8000/api/security"

def test_recent_alerts_api():
    print("=== TESTING RECENT ALERTS API ===\n")
    
    # Step 1: Login to get token
    print("1. Testing Login...")
    login_data = {
        "username": "officer001",
        "password": "password123"
    }
    
    try:
        login_response = requests.post(f"{BASE_URL}/login/", json=login_data)
        if login_response.status_code == 200:
            token_data = login_response.json()
            token = token_data.get('access')
            print(f"✅ Login successful - Token received")
            headers = {"Authorization": f"Bearer {token}"}
        else:
            print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Step 2: Test Recent Alerts API
    print("\n2. Testing GET /sos/recent/ (Recent alerts)...")
    try:
        # Test with default limit (5)
        recent_response = requests.get(f"{BASE_URL}/sos/recent/", headers=headers)
        print(f"Status: {recent_response.status_code}")
        if recent_response.status_code == 200:
            recent_data = recent_response.json()
            print(f"✅ Got {len(recent_data)} recent alerts (default limit)")
            for i, alert in enumerate(recent_data[:3]):  # Show first 3
                print(f"   Alert {i+1}: {alert.get('alert_type', 'N/A')} - {alert.get('status', 'N/A')} - {alert.get('message', 'N/A')[:50]}...")
        else:
            print(f"❌ Failed: {recent_response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Step 3: Test Recent Alerts API with custom limit
    print("\n3. Testing GET /sos/recent/?limit=3 (Custom limit)...")
    try:
        recent_response = requests.get(f"{BASE_URL}/sos/recent/?limit=3", headers=headers)
        print(f"Status: {recent_response.status_code}")
        if recent_response.status_code == 200:
            recent_data = recent_response.json()
            print(f"✅ Got {len(recent_data)} recent alerts (custom limit)")
        else:
            print(f"❌ Failed: {recent_response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Step 4: Test Recent Alerts API with high limit (should be capped at 20)
    print("\n4. Testing GET /sos/recent/?limit=50 (High limit - should cap at 20)...")
    try:
        recent_response = requests.get(f"{BASE_URL}/sos/recent/?limit=50", headers=headers)
        print(f"Status: {recent_response.status_code}")
        if recent_response.status_code == 200:
            recent_data = recent_response.json()
            print(f"✅ Got {len(recent_data)} recent alerts (should be max 20)")
        else:
            print(f"❌ Failed: {recent_response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n=== RECENT ALERTS API TESTING COMPLETE ===")

if __name__ == "__main__":
    test_recent_alerts_api()
