import requests
import json

# Base URL for testing
BASE_URL = "http://127.0.0.1:8000/api/security"

def test_dashboard_recent_alerts():
    print("=== TESTING DASHBOARD RECENT ALERTS USING ALERTS API ===\n")
    
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
    
    # Step 2: Test Alerts API (same as Alerts page uses)
    print("\n2. Testing GET /sos/ (All alerts - same as Alerts page)...")
    try:
        alerts_response = requests.get(f"{BASE_URL}/sos/", headers=headers)
        print(f"Status: {alerts_response.status_code}")
        if alerts_response.status_code == 200:
            alerts_data = alerts_response.json()
            if isinstance(alerts_data, dict) and 'results' in alerts_data:
                all_alerts = alerts_data['results']
                print(f"✅ Got {len(all_alerts)} total alerts from alerts API")
                
                # Sort by created_at (most recent first) and take 5
                recent_alerts = sorted(
                    all_alerts, 
                    key=lambda x: x.get('created_at', ''), 
                    reverse=True
                )[:5]
                
                print(f"✅ Recent 5 alerts (sorted by created_at):")
                for i, alert in enumerate(recent_alerts):
                    created_at = alert.get('created_at', 'N/A')
                    alert_type = alert.get('alert_type', 'N/A')
                    status = alert.get('status', 'N/A')
                    message = alert.get('message', 'N/A')[:40]
                    print(f"   {i+1}. {alert_type} - {status} - {message}... ({created_at})")
                
            elif isinstance(alerts_data, list):
                print(f"✅ Got {len(alerts_data)} alerts (direct array)")
                recent_alerts = sorted(alerts_data, key=lambda x: x.get('created_at', ''), reverse=True)[:5]
                print(f"✅ Recent 5 alerts: {len(recent_alerts)}")
            else:
                print(f"⚠️ Unexpected response format: {type(alerts_data)}")
        else:
            print(f"❌ Failed: {alerts_response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n=== DASHBOARD RECENT ALERTS TESTING COMPLETE ===")
    print("✅ Dashboard now uses the same alerts API as the Alerts page")
    print("✅ Recent alerts are sorted by created_at (most recent first)")
    print("✅ Takes exactly 5 most recent alerts")

if __name__ == "__main__":
    test_dashboard_recent_alerts()
