#!/usr/bin/env python
"""
Test script to verify alertsStore.updateAlert safety guard
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

def test_update_alert_safety_guard():
    print("🧪 Testing alertsStore.updateAlert safety guard...")
    
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
    
    # Test 1: Update USER-created alert (should succeed)
    print(f"\n🧪 Test 1: Update USER-created alert (should succeed)")
    client = APIClient()
    client.force_authenticate(user=officer_user)
    
    response = client.patch(f'/api/sos-alerts/{user_alert.id}/', {'priority': 'high'})
    print(f"   API Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✅ SUCCESS: USER-created alert can be updated")
        print(f"   Updated priority: {response.data.get('priority', 'N/A')}")
    else:
        print(f"   ❌ FAILED: Expected 200, got {response.status_code}")
        print(f"   Error: {response.data}")
    
    # Test 2: Update OFFICER-created alert (should be blocked by backend)
    print(f"\n🧪 Test 2: Update OFFICER-created alert (should be blocked by backend)")
    response = client.patch(f'/api/sos-alerts/{officer_alert.id}/', {'priority': 'high'})
    print(f"   API Status: {response.status_code}")
    if response.status_code == 403:
        print("   ✅ SUCCESS: OFFICER-created alert blocked by backend")
        print(f"   Error: {response.data}")
    else:
        print(f"   ❌ FAILED: Expected 403, got {response.status_code}")
    
    # Test 3: Simulate frontend safety guard behavior
    print(f"\n🧪 Test 3: Frontend safety guard simulation")
    
    # Simulate alertsStore behavior
    alerts_in_store = [
        {
            'id': user_alert.id,
            'created_by_role': 'USER',
            'message': user_alert.message,
            'priority': 'medium'
        },
        {
            'id': officer_alert.id,
            'created_by_role': 'OFFICER',
            'message': officer_alert.message,
            'priority': 'medium'
        }
    ]
    
    def simulate_update_alert(alert_id, update_data):
        """Simulate alertsStore.updateAlert with safety guard"""
        original_alert = next((alert for alert in alerts_in_store if alert['id'] == alert_id), None)
        
        if not original_alert:
            return {"error": f"Alert with id {alert_id} not found"}
        
        # SAFETY GUARD: Only allow updates to USER-created alerts
        if original_alert['created_by_role'] != 'USER':
            return {"blocked": True, "reason": f"Cannot update {original_alert['created_by_role']}-created alert"}
        
        # Simulate successful update
        return {"success": True, "updated_alert": {**original_alert, **update_data}}
    
    # Test USER alert update
    user_result = simulate_update_alert(user_alert.id, {'priority': 'high'})
    print(f"   USER Alert Update: {'✅ SUCCESS' if user_result.get('success') else '❌ FAILED'}")
    if user_result.get('success'):
        print(f"   Updated priority: {user_result['updated_alert']['priority']}")
    
    # Test OFFICER alert update
    officer_result = simulate_update_alert(officer_alert.id, {'priority': 'high'})
    print(f"   OFFICER Alert Update: {'✅ BLOCKED' if officer_result.get('blocked') else '❌ FAILED'}")
    if officer_result.get('blocked'):
        print(f"   Block reason: {officer_result['reason']}")
    
    # Cleanup
    user_alert.delete()
    officer_alert.delete()
    officer_user.delete()
    regular_user.delete()
    geofence.delete()
    
    print(f"\n🎉 Update alert safety guard test completed!")

if __name__ == '__main__':
    test_update_alert_safety_guard()
