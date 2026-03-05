import requests
import json
import time

# Base URL for testing
BASE_URL = "http://127.0.0.1:8000/api/security"

def debug_alerts_flow():
    print("=== DEBUGGING ALERTS FLOW ===\n")
    
    # Step 1: Login
    print("1. Login...")
    login_data = {"username": "officer001", "password": "password"}
    login_response = requests.post(f"{BASE_URL}/login/", json=login_data)
    if login_response.status_code == 200:
        token = login_response.json().get('access')
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful")
    else:
        print(f"❌ Login failed: {login_response.text}")
        return
    
    # Step 2: Get initial alerts
    print("\n2. Getting initial alerts...")
    alerts_response = requests.get(f"{BASE_URL}/sos/", headers=headers)
    if alerts_response.status_code == 200:
        alerts_data = alerts_response.json()
        if isinstance(alerts_data, dict) and 'results' in alerts_data:
            initial_alerts = alerts_data['results']
        else:
            initial_alerts = alerts_data
        print(f"✅ Initial alerts count: {len(initial_alerts)}")
        if initial_alerts:
            print(f"   Most recent: ID {initial_alerts[0].get('id')} - {initial_alerts[0].get('created_at')}")
    else:
        print(f"❌ Failed to get alerts: {alerts_response.text}")
        return
    
    # Step 3: Create new alert
    print("\n3. Creating new alert...")
    timestamp = int(time.time())
    new_alert_data = {
        "alert_type": "security",
        "message": f"Debug test alert - {timestamp}",
        "description": "Testing cache issues",
        "location_lat": 18.5204,
        "location_long": 73.8567
    }
    
    create_response = requests.post(f"{BASE_URL}/sos/", json=new_alert_data, headers=headers)
    if create_response.status_code == 201:
        created_alert = create_response.json()
        print(f"✅ Created alert ID: {created_alert.get('id')}")
        print(f"   Message: {created_alert.get('message')}")
        print(f"   Created at: {created_alert.get('created_at')}")
    else:
        print(f"❌ Failed to create alert: {create_response.text}")
        return
    
    # Step 4: Check if new alert appears immediately
    print("\n4. Checking if new alert appears immediately...")
    check_response = requests.get(f"{BASE_URL}/sos/", headers=headers)
    if check_response.status_code == 200:
        check_data = check_response.json()
        if isinstance(check_data, dict) and 'results' in check_data:
            updated_alerts = check_data['results']
        else:
            updated_alerts = check_data
        
        print(f"✅ Updated alerts count: {len(updated_alerts)}")
        
        # Find the new alert
        found_alert = None
        for alert in updated_alerts:
            if alert.get('id') == created_alert.get('id'):
                found_alert = alert
                break
        
        if found_alert:
            print(f"✅ New alert found in list!")
            print(f"   Position: {updated_alerts.index(found_alert) + 1} of {len(updated_alerts)}")
            print(f"   Created at: {found_alert.get('created_at')}")
        else:
            print(f"❌ New alert NOT found in list!")
            print(f"   Looking for ID: {created_alert.get('id')}")
            print(f"   Available IDs: {[alert.get('id') for alert in updated_alerts]}")
    else:
        print(f"❌ Failed to check alerts: {check_response.text}")
    
    # Step 5: Test with cache-busting parameter
    print("\n5. Testing with cache-busting parameter...")
    cache_bust_response = requests.get(f"{BASE_URL}/sos/?_t={int(time.time() * 1000)}", headers=headers)
    if cache_bust_response.status_code == 200:
        cache_bust_data = cache_bust_response.json()
        if isinstance(cache_bust_data, dict) and 'results' in cache_bust_data:
            cache_bust_alerts = cache_bust_data['results']
        else:
            cache_bust_alerts = cache_bust_data
        
        print(f"✅ Cache-bust alerts count: {len(cache_bust_alerts)}")
        
        # Find the new alert again
        found_alert = None
        for alert in cache_bust_alerts:
            if alert.get('id') == created_alert.get('id'):
                found_alert = alert
                break
        
        if found_alert:
            print(f"✅ New alert found with cache-busting!")
        else:
            print(f"❌ New alert still NOT found even with cache-busting!")
    
    print("\n=== DEBUG COMPLETE ===")

if __name__ == "__main__":
    debug_alerts_flow()
