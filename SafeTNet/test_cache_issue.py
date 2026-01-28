import requests
import json

# Base URL for testing
BASE_URL = "http://127.0.0.1:8000/api/security"

def test_alerts_cache_issue():
    print("=== TESTING ALERTS CACHE ISSUE ===\n")
    
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
    
    # Step 2: Test multiple API calls to see if we get fresh data
    print("\n2. Testing API calls for fresh data...")
    
    for i in range(3):
        print(f"\n--- API Call {i+1} ---")
        try:
            alerts_response = requests.get(f"{BASE_URL}/sos/", headers=headers)
            print(f"Status: {alerts_response.status_code}")
            
            if alerts_response.status_code == 200:
                alerts_data = alerts_response.json()
                if isinstance(alerts_data, dict) and 'results' in alerts_data:
                    current_alerts = alerts_data['results']
                    print(f"Alerts count: {len(current_alerts)}")
                    
                    # Show the most recent alert
                    if current_alerts:
                        most_recent = max(current_alerts, key=lambda x: x.get('created_at', ''))
                        print(f"Most recent: ID {most_recent.get('id')} - {most_recent.get('message', 'N/A')[:30]}... ({most_recent.get('created_at', 'N/A')})")
                else:
                    print(f"Unexpected format: {type(alerts_data)}")
            else:
                print(f"❌ Failed: {alerts_response.text}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
        
        # Small delay between calls
        import time
        time.sleep(1)
    
    # Step 3: Create a new alert and immediately check if it appears
    print("\n3. Creating new alert and checking immediate visibility...")
    new_alert_data = {
        "alert_type": "security",
        "message": "Cache test alert - " + str(int(time.time())),
        "description": "Testing if new alerts appear immediately",
        "location_lat": 18.5204,
        "location_long": 73.8567
    }
    
    try:
        create_response = requests.post(f"{BASE_URL}/sos/", json=new_alert_data, headers=headers)
        if create_response.status_code == 201:
            created_alert = create_response.json()
            print(f"✅ Created alert ID: {created_alert.get('id')}")
            
            # Immediately check if it appears in the list
            print("Checking if new alert appears immediately...")
            check_response = requests.get(f"{BASE_URL}/sos/", headers=headers)
            if check_response.status_code == 200:
                check_data = check_response.json()
                if isinstance(check_data, dict) and 'results' in check_data:
                    alerts_list = check_data['results']
                    found_new_alert = any(alert.get('id') == created_alert.get('id') for alert in alerts_list)
                    print(f"New alert visible immediately: {found_new_alert}")
                    
                    if found_new_alert:
                        print("✅ SUCCESS: New alert appears immediately")
                    else:
                        print("❌ ISSUE: New alert not visible immediately")
                        print(f"Looking for ID: {created_alert.get('id')}")
                        print(f"Available IDs: {[alert.get('id') for alert in alerts_list]}")
        else:
            print(f"❌ Failed to create alert: {create_response.text}")
    except Exception as e:
        print(f"❌ Error creating/checking alert: {e}")
    
    print("\n=== CACHE TEST COMPLETE ===")

if __name__ == "__main__":
    import time
    test_alerts_cache_issue()
