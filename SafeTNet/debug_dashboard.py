import requests
import json

# Base URL for testing
BASE_URL = "http://127.0.0.1:8000/api/security"

def test_dashboard_debug():
    print("=== DEBUGGING DASHBOARD RECENT ALERTS ISSUE ===\n")
    
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
    
    # Step 2: Test Dashboard API
    print("\n2. Testing Dashboard API...")
    try:
        dashboard_response = requests.get(f"{BASE_URL}/dashboard/", headers=headers)
        print(f"Status: {dashboard_response.status_code}")
        if dashboard_response.status_code == 200:
            dashboard_data = dashboard_response.json()
            print(f"✅ Dashboard data: {dashboard_data}")
            print(f"   - recent_alerts: {dashboard_data.get('recent_alerts', 'NOT_FOUND')}")
            print(f"   - recent_alerts count: {len(dashboard_data.get('recent_alerts', []))}")
        else:
            print(f"❌ Dashboard failed: {dashboard_response.text}")
    except Exception as e:
        print(f"❌ Dashboard error: {e}")
    
    # Step 3: Test Alerts API (what dashboard should use)
    print("\n3. Testing Alerts API...")
    try:
        alerts_response = requests.get(f"{BASE_URL}/sos/", headers=headers)
        print(f"Status: {alerts_response.status_code}")
        if alerts_response.status_code == 200:
            alerts_data = alerts_response.json()
            if isinstance(alerts_data, dict) and 'results' in alerts_data:
                all_alerts = alerts_data['results']
                print(f"✅ Got {len(all_alerts)} total alerts from alerts API")
                
                # Show raw alerts data
                print("   Raw alerts data:")
                for i, alert in enumerate(all_alerts):
                    print(f"   {i+1}. ID: {alert.get('id')}, Created: {alert.get('created_at')}, Message: {alert.get('message', 'N/A')[:30]}")
                
                # Sort by created_at (most recent first) and take 5
                recent_alerts = sorted(
                    all_alerts, 
                    key=lambda x: x.get('created_at', ''), 
                    reverse=True
                )[:5]
                
                print(f"\n✅ Recent 5 alerts (sorted by created_at):")
                for i, alert in enumerate(recent_alerts):
                    created_at = alert.get('created_at', 'N/A')
                    alert_type = alert.get('alert_type', 'N/A')
                    status = alert.get('status', 'N/A')
                    message = alert.get('message', 'N/A')[:40]
                    print(f"   {i+1}. {alert_type} - {status} - {message}... ({created_at})")
                
            else:
                print(f"⚠️ Unexpected alerts response format: {type(alerts_data)}")
                print(f"   Raw response: {alerts_data}")
        else:
            print(f"❌ Alerts failed: {alerts_response.text}")
    except Exception as e:
        print(f"❌ Alerts error: {e}")
    
    print("\n=== DEBUGGING COMPLETE ===")

if __name__ == "__main__":
    test_dashboard_debug()
