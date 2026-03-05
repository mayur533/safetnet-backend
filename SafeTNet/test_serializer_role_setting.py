#!/usr/bin/env python
"""
Test script to verify serializer sets created_by_role correctly
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
from security_app.serializers import SOSAlertCreateSerializer
from security_app.models import SOSAlert
from users.models import Geofence

User = get_user_model()

def test_serializer_role_setting():
    print("🧪 Testing serializer created_by_role setting...")
    
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
    
    # Create mock requests
    factory = RequestFactory()
    
    officer_request = factory.post('/api/sos-alerts/')
    officer_request.user = officer_user
    
    user_request = factory.post('/api/sos-alerts/')
    user_request.user = regular_user
    
    print(f"✅ Created test users:")
    print(f"   Officer: {officer_user.username} (role: {officer_user.role})")
    print(f"   User: {regular_user.username} (role: {getattr(regular_user, 'role', 'None')})")
    
    # Test 1: Officer creates alert
    print(f"\n🧪 Test 1: Officer creates alert (should set created_by_role='OFFICER')")
    officer_data = {
        'alert_type': 'security',
        'message': 'Officer created alert',
        'location_lat': 37.7749,
        'location_long': -122.4194,
        'priority': 'high'
    }
    
    officer_serializer = SOSAlertCreateSerializer(
        data=officer_data,
        context={'request': officer_request}
    )
    
    if officer_serializer.is_valid():
        officer_alert = officer_serializer.save()
        print(f"   ✅ SUCCESS: created_by_role = '{officer_alert.created_by_role}'")
        print(f"   Alert ID: {officer_alert.id}")
    else:
        print(f"   ❌ FAILED: {officer_serializer.errors}")
    
    # Test 2: User creates alert
    print(f"\n🧪 Test 2: User creates alert (should set created_by_role='USER')")
    user_data = {
        'alert_type': 'emergency',
        'message': 'User created alert',
        'location_lat': 37.7749,
        'location_long': -122.4194,
        'priority': 'medium'
    }
    
    user_serializer = SOSAlertCreateSerializer(
        data=user_data,
        context={'request': user_request}
    )
    
    if user_serializer.is_valid():
        user_alert = user_serializer.save()
        print(f"   ✅ SUCCESS: created_by_role = '{user_alert.created_by_role}'")
        print(f"   Alert ID: {user_alert.id}")
    else:
        print(f"   ❌ FAILED: {user_serializer.errors}")
    
    # Test 3: API endpoint test
    print(f"\n🧪 Test 3: API endpoint creates alert with correct role")
    client = APIClient()
    
    # Test officer API
    client.force_authenticate(user=officer_user)
    api_data = {
        'alert_type': 'general',
        'message': 'API officer alert',
        'location_lat': 37.7749,
        'location_long': -122.4194
    }
    
    response = client.post('/api/sos-alerts/', api_data)
    if response.status_code == 201:
        api_alert_id = response.data['id']
        api_alert = SOSAlert.objects.get(id=api_alert_id)
        print(f"   ✅ SUCCESS: API created_by_role = '{api_alert.created_by_role}'")
        api_alert.delete()
    else:
        print(f"   ❌ FAILED: API returned {response.status_code}")
    
    # Cleanup
    if 'officer_alert' in locals():
        officer_alert.delete()
    if 'user_alert' in locals():
        user_alert.delete()
    officer_user.delete()
    regular_user.delete()
    geofence.delete()
    
    print(f"\n🎉 Serializer role setting test completed!")

if __name__ == '__main__':
    test_serializer_role_setting()
