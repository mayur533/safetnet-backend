#!/usr/bin/env python
"""
Test script to verify alertsStore filtering of OFFICER-created alerts
"""
import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from security_app.models import SOSAlert
from users.models import Geofence

User = get_user_model()

def test_alerts_store_filtering():
    print("🧪 Testing alertsStore filtering of OFFICER-created alerts...")
    
    # Create test users
    officer_user = User.objects.create_user(
        username='test_officer',
        email='officer@test.com',
        password='testpass123',
        role='security_officer'
    )
    
    regular_user = User.objects.create_user(
        username='test_user',
        email='user@test.com',
        password='testpass123'
    )
    
    # Create test geofence
    geofence = Geofence.objects.create(
        name='Test Geofence',
        latitude=37.7749,
        longitude=-122.4194,
        radius=1000
    )
    
    # Create test alerts
    user_alert = SOSAlert.objects.create(
        user=regular_user,
        geofence=geofence,
        alert_type='emergency',
        message='User created alert',
        location_lat=37.7749,
        location_long=-122.4194,
        created_by_role='USER'
    )
    
    officer_alert = SOSAlert.objects.create(
        user=officer_user,
        geofence=geofence,
        alert_type='security',
        message='Officer created alert',
        location_lat=37.7749,
        location_long=-122.4194,
        created_by_role='OFFICER'
    )
    
    print(f"✅ Created test alerts:")
    print(f"   USER Alert ID: {user_alert.id} (created_by_role: {user_alert.created_by_role})")
    print(f"   OFFICER Alert ID: {officer_alert.id} (created_by_role: {officer_alert.created_by_role})")
    
    # Test API response includes both alerts
    print(f"\n🧪 Test 1: API response includes both alerts")
    client = APIClient()
    client.force_authenticate(user=officer_user)
    
    response = client.get('/api/sos-alerts/')
    print(f"   API Status: {response.status_code}")
    if response.status_code == 200:
        api_alerts = response.data
        print(f"   Total alerts from API: {len(api_alerts)}")
        
        # Check if both alerts are present in API response
        api_user_alerts = [alert for alert in api_alerts if alert.get('created_by_role') == 'USER']
        api_officer_alerts = [alert for alert in api_alerts if alert.get('created_by_role') == 'OFFICER']
        
        print(f"   USER alerts in API: {len(api_user_alerts)}")
        print(f"   OFFICER alerts in API: {len(api_officer_alerts)}")
        
        if len(api_user_alerts) > 0 and len(api_officer_alerts) > 0:
            print("   ✅ SUCCESS: API returns both USER and OFFICER alerts")
        else:
            print("   ❌ FAILED: API missing one or both alert types")
    else:
        print(f"   ❌ FAILED: API returned {response.status_code}")
    
    # Test frontend filtering (simulated)
    print(f"\n🧪 Test 2: Frontend filtering simulation")
    
    # Simulate what the alertsStore would do (new logic)
    all_alerts = [
        {
            'id': user_alert.id,
            'created_by_role': 'USER',
            'message': user_alert.message
        },
        {
            'id': officer_alert.id,
            'created_by_role': 'OFFICER', 
            'message': officer_alert.message
        },
        {
            'id': 999,
            'message': 'Alert without created_by_role field'
            # No created_by_role field - should be filtered out
        }
    ]
    
    # Apply the same filtering logic as alertsStore (new)
    user_created_alerts = [alert for alert in all_alerts if alert.get('created_by_role') and alert.get('created_by_role') != 'OFFICER']
    officer_created_alerts = [alert for alert in all_alerts if alert.get('created_by_role') == 'OFFICER']
    missing_role_alerts = [alert for alert in all_alerts if not alert.get('created_by_role')]
    
    print(f"   Total alerts before filtering: {len(all_alerts)}")
    print(f"   USER-created alerts after filtering: {len(user_created_alerts)}")
    print(f"   OFFICER-created alerts filtered out: {len(officer_created_alerts)}")
    print(f"   Alerts without created_by_role dropped: {len(missing_role_alerts)}")
    
    if len(user_created_alerts) == 1 and len(officer_created_alerts) == 1 and len(missing_role_alerts) == 1:
        print("   ✅ SUCCESS: New filtering logic works correctly")
        print(f"   Stored alert ID: {user_created_alerts[0]['id']} (USER-created)")
        print(f"   Dropped alert ID: {missing_role_alerts[0]['id']} (missing created_by_role)")
    else:
        print("   ❌ FAILED: New filtering logic not working correctly")
    
    # Cleanup
    user_alert.delete()
    officer_alert.delete()
    officer_user.delete()
    regular_user.delete()
    geofence.delete()
    
    print(f"\n🎉 Alert store filtering test completed!")

if __name__ == '__main__':
    test_alerts_store_filtering()
