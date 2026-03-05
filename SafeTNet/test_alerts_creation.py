import requests
import json

# Base URL for testing
BASE_URL = "http://127.0.0.1:8000/api/security"

def test_alerts_creation_and_display():
    print("=== TESTING ALERTS CREATION AND DISPLAY ===\n")
    
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
    
    # Step 2: Get current alerts count
    print("\n2. Getting current alerts count...")
    try:
        alerts_response = requests.get(f"{BASE_URL}/sos/", headers=headers)
        if alerts_response.status_code == 200:
            alerts_data = alerts_response.json()
            if isinstance(alerts_data, dict) and 'results' in alerts_data:
                current_alerts = alerts_data['results']
                print(f"✅ Current alerts count: {len(current_alerts)}")
            else:
                current_alerts = alerts_data
                print(f"✅ Current alerts count: {len(current_alerts)}")
        else:
            print(f"❌ Failed to get alerts: {alerts_response.text}")
            return
    except Exception as e:
        print(f"❌ Error getting alerts: {e}")
        return
    
    # Step 3: Create a new alert
    print("\n3. Creating new alert...")
    new_alert_data = {
        "alert_type": "emergency",
        "message": "Test alert for debugging - " + str(int(time.time())),
        "description": "This is a test alert created to verify display functionality",
        "location_lat": 18.5204,
        "location_long": 73.8567
    }
    
    try:
        create_response = requests.post(f"{BASE_URL}/sos/", json=new_alert_data, headers=headers)
        print(f"Create alert status: {create_response.status_code}")
        if create_response.status_code == 201:
            created_alert = create_response.json()
            print(f"✅ Alert created successfully: ID {created_alert.get('id')}")
            print(f"   Message: {created_alert.get('message')}")
            print(f"   Type: {created_alert.get('alert_type')}")
            print(f"   Status: {created_alert.get('status')}")
        else:
            print(f"❌ Failed to create alert: {create_response.text}")
            return
    except Exception as e:
        print(f"❌ Error creating alert: {e}")
        return
    
    # Step 4: Get alerts again to verify new alert appears
    print("\n4. Verifying new alert appears in list...")
    try:
        alerts_response = requests.get(f"{BASE_URL}/sos/", headers=headers)
        if alerts_response.status_code == 200:
            alerts_data = alerts_response.json()
            if isinstance(alerts_data, dict) and 'results' in alerts_data:
                updated_alerts = alerts_data['results']
                print(f"✅ Updated alerts count: {len(updated_alerts)}")
                
                # Show the most recent alerts
                recent_alerts = sorted(updated_alerts, key=lambda x: x.get('created_at', ''), reverse=True)[:3]
                print(f"\n📋 Most recent alerts:")
                for i, alert in enumerate(recent_alerts):
                    created_at = alert.get('created_at', 'N/A')
                    alert_type = alert.get('alert_type', 'N/A')
                    status = alert.get('status', 'N/A')
                    message = alert.get('message', 'N/A')[:40]
                    print(f"   {i+1}. {alert_type} - {status} - {message}... ({created_at})")
                
                # Check if our new alert is in the list
                new_alert_message = new_alert_data['message']
                found_new_alert = any(alert.get('message') == new_alert_message for alert in updated_alerts)
                if found_new_alert:
                    print(f"\n✅ SUCCESS: New alert found in the alerts list!")
                else:
                    print(f"\n❌ ISSUE: New alert not found in the alerts list")
                    print(f"   Looking for message: {new_alert_message}")
            else:
                print(f"⚠️ Unexpected response format")
        else:
            print(f"❌ Failed to get updated alerts: {alerts_response.text}")
    except Exception as e:
        print(f"❌ Error getting updated alerts: {e}")
    
    print("\n=== ALERTS CREATION AND DISPLAY TEST COMPLETE ===")

if __name__ == "__main__":
    import time
    test_alerts_creation_and_display()
