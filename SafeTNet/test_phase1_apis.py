import requests
import json

# Base URL for testing
BASE_URL = "http://127.0.0.1:8000/api/security"

def test_phase1_apis():
    print("=== TESTING PHASE 1 ALERTS APIs ===\n")
    
    # Step 1: Login to get token
    print("1. Testing Login...")
    login_data = {
        "username": "officer001",
        "password": "password"
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
    
    # Step 2: Test List All Alerts
    print("\n2. Testing GET /sos/ (List all alerts)...")
    try:
        alerts_response = requests.get(f"{BASE_URL}/sos/", headers=headers)
        print(f"Status: {alerts_response.status_code}")
        if alerts_response.status_code == 200:
            alerts_data = alerts_response.json()
            if isinstance(alerts_data, dict) and 'results' in alerts_data:
                print(f"✅ Got {len(alerts_data['results'])} alerts (paginated)")
                print(f"   Total count: {alerts_data.get('count', 0)}")
            elif isinstance(alerts_data, list):
                print(f"✅ Got {len(alerts_data)} alerts (direct array)")
            else:
                print(f"✅ Got alerts data: {type(alerts_data)}")
        else:
            print(f"❌ Failed: {alerts_response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Step 3: Test Active Alerts
    print("\n3. Testing GET /sos/active/ (Active alerts only)...")
    try:
        active_response = requests.get(f"{BASE_URL}/sos/active/", headers=headers)
        print(f"Status: {active_response.status_code}")
        if active_response.status_code == 200:
            active_data = active_response.json()
            if isinstance(active_data, dict) and 'results' in active_data:
                print(f"✅ Got {len(active_data['results'])} active alerts")
            elif isinstance(active_data, list):
                print(f"✅ Got {len(active_data)} active alerts")
            else:
                print(f"✅ Got active alerts data: {type(active_data)}")
        else:
            print(f"❌ Failed: {active_response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Step 4: Test Resolved Alerts
    print("\n4. Testing GET /sos/resolved/ (Resolved alerts only)...")
    try:
        resolved_response = requests.get(f"{BASE_URL}/sos/resolved/", headers=headers)
        print(f"Status: {resolved_response.status_code}")
        if resolved_response.status_code == 200:
            resolved_data = resolved_response.json()
            if isinstance(resolved_data, dict) and 'results' in resolved_data:
                print(f"✅ Got {len(resolved_data['results'])} resolved alerts")
            elif isinstance(resolved_data, list):
                print(f"✅ Got {len(resolved_data)} resolved alerts")
            else:
                print(f"✅ Got resolved alerts data: {type(resolved_data)}")
        else:
            print(f"❌ Failed: {resolved_response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Step 5: Test Alert Details (get first alert if available)
    print("\n5. Testing GET /sos/{id}/ (Alert details)...")
    try:
        # First get a list of alerts to get an ID
        alerts_response = requests.get(f"{BASE_URL}/sos/", headers=headers)
        if alerts_response.status_code == 200:
            alerts_data = alerts_response.json()
            alerts_list = alerts_data.get('results', []) if isinstance(alerts_data, dict) else alerts_data
            
            if alerts_list and len(alerts_list) > 0:
                first_alert_id = alerts_list[0].get('id')
                if first_alert_id:
                    detail_response = requests.get(f"{BASE_URL}/sos/{first_alert_id}/", headers=headers)
                    print(f"Status: {detail_response.status_code}")
                    if detail_response.status_code == 200:
                        alert_detail = detail_response.json()
                        print(f"✅ Got alert details for ID {first_alert_id}")
                        print(f"   Alert Type: {alert_detail.get('alert_type', 'N/A')}")
                        print(f"   Status: {alert_detail.get('status', 'N/A')}")
                        print(f"   Message: {alert_detail.get('message', 'N/A')[:50]}...")
                    else:
                        print(f"❌ Failed: {detail_response.text}")
                else:
                    print("⚠️ No alert ID found in first alert")
            else:
                print("⚠️ No alerts available to test details endpoint")
        else:
            print("❌ Could not get alerts list for testing")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n=== PHASE 1 API TESTING COMPLETE ===")

if __name__ == "__main__":
    test_phase1_apis()
