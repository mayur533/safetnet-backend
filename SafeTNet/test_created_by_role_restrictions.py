#!/usr/bin/env python
"""
Test script to verify created_by_role restrictions in SOSAlertViewSet
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
from security_app.views import SOSAlertViewSet
from users.models import Geofence

User = get_user_model()

def test_status_update_restrictions():
    print("🧪 Testing exact SOSAlertViewSet permission requirements...")
    print("📋 Rules: OFFICER-created alerts = BLOCK ALL writes, USER-created alerts = security_officer only")
    
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
    
    # Create test alerts (created_by_role will be set by serializer)
    user_alert = SOSAlert.objects.create(
        user=regular_user,
        geofence=geofence,
        alert_type='emergency',
        message='User created alert',
        location_lat=37.7749,
        location_long=-122.4194,
        created_by_role='USER'  # Manually set for test
    )
    
    officer_alert = SOSAlert.objects.create(
        user=officer_user,
        geofence=geofence,
        alert_type='security',
        message='Officer created alert',
        location_lat=37.7749,
        location_long=-122.4194,
        created_by_role='OFFICER'  # Manually set for test
    )
    
    # Setup API client
    client = APIClient()
    client.force_authenticate(user=officer_user)
    
    print(f"✅ Created test alerts:")
    print(f"   User Alert ID: {user_alert.id} (created_by_role: {user_alert.created_by_role})")
    print(f"   Officer Alert ID: {officer_alert.id} (created_by_role: {officer_alert.created_by_role})")
    print(f"   Request User: {officer_user.username} (role: {officer_user.role})")
    
    # Test 1: OFFICER-created alert - BLOCK ALL write operations
    print(f"\n🧪 Test 1: OFFICER-created alert - BLOCK ALL writes (PUT, PATCH, DELETE, custom actions)")
    
    # Test PUT
    response = client.put(f'/api/sos-alerts/{officer_alert.id}/', {
        'message': 'Updated by officer',
        'priority': 'high'
    })
    print(f"   PUT Status: {response.status_code} {'✅ BLOCKED' if response.status_code == 403 else '❌ FAILED'}")
    
    # Test PATCH
    response = client.patch(f'/api/sos-alerts/{officer_alert.id}/', {'priority': 'high'})
    print(f"   PATCH Status: {response.status_code} {'✅ BLOCKED' if response.status_code == 403 else '❌ FAILED'}")
    
    # Test DELETE
    response = client.delete(f'/api/sos-alerts/{officer_alert.id}/')
    print(f"   DELETE Status: {response.status_code} {'✅ BLOCKED' if response.status_code == 403 else '❌ FAILED'}")
    
    # Test custom action (resolve)
    response = client.patch(f'/api/sos-alerts/{officer_alert.id}/resolve/')
    print(f"   resolve action Status: {response.status_code} {'✅ BLOCKED' if response.status_code == 403 else '❌ FAILED'}")
    
    # Test 2: USER-created alert - ALLOW writes for security_officer
    print(f"\n🧪 Test 2: USER-created alert - ALLOW writes for security_officer")
    
    # Test PUT
    response = client.put(f'/api/sos-alerts/{user_alert.id}/', {
        'message': 'Updated by officer',
        'priority': 'high'
    })
    print(f"   PUT Status: {response.status_code} {'✅ ALLOWED' if response.status_code == 200 else '❌ FAILED'}")
    
    # Test PATCH
    response = client.patch(f'/api/sos-alerts/{user_alert.id}/', {'priority': 'high'})
    print(f"   PATCH Status: {response.status_code} {'✅ ALLOWED' if response.status_code == 200 else '❌ FAILED'}")
    
    # Test custom action (resolve)
    response = client.patch(f'/api/sos-alerts/{user_alert.id}/resolve/')
    print(f"   resolve action Status: {response.status_code} {'✅ ALLOWED' if response.status_code == 200 else '❌ FAILED'}")
    
    # Test DELETE
    response = client.delete(f'/api/sos-alerts/{user_alert.id}/')
    print(f"   DELETE Status: {response.status_code} {'✅ ALLOWED' if response.status_code == 204 else '❌ FAILED'}")
    
    # Cleanup (officer_alert wasn't deleted in test 1)
    if user_alert.id in [alert.id for alert in SOSAlert.objects.all()]:
        pass  # Already deleted in test 2
    officer_alert.delete()
    officer_user.delete()
    regular_user.delete()
    geofence.delete()
    
    print(f"\n🎉 Permission requirements test completed!")

if __name__ == '__main__':
    test_status_update_restrictions()
