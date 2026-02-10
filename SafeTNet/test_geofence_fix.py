#!/usr/bin/env python
"""
Test script to verify assigned_geofence fix in SecurityOfficer creation
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from users.models import SecurityOfficer, User, Organization, Geofence
from users.serializers import SecurityOfficerCreateSerializer
from django.contrib.auth import get_user_model

def test_assigned_geofence_fix():
    """Test that assigned_geofence field handles ID to Geofence instance conversion"""
    print("🧪 Testing assigned_geofence Fix")
    print("=" * 50)
    
    try:
        # Test 1: Check if we have any geofences to work with
        print("✅ Test 1: Check available geofences")
        geofences = Geofence.objects.all()
        print(f"   Available geofences: {geofences.count()}")
        
        if geofences.count() == 0:
            print("   ⚠️  No geofences found. Creating a test geofence...")
            test_geofence = Geofence.objects.create(
                name="Test Geofence",
                description="Test geofence for officer assignment",
                latitude=0.0,
                longitude=0.0,
                radius=100.0
            )
            print(f"   Created test geofence with ID: {test_geofence.id}")
            geofence_id = test_geofence.id
        else:
            geofence_id = geofences.first().id
            print(f"   Using existing geofence with ID: {geofence_id}")
        
        # Test 2: Test SecurityOfficerCreateSerializer with assigned_geofence
        print("✅ Test 2: Test SecurityOfficerCreateSerializer with assigned_geofence")
        
        # Get or create a test organization
        org, created = Organization.objects.get_or_create(
            name="Test Organization",
            defaults={'description': 'Test org for officer creation'}
        )
        print(f"   Organization: {org.name} (created: {created})")
        
        test_data = {
            'username': 'test_officer_geofence',
            'name': 'Test Officer with Geofence',
            'email': 'test_geofence@example.com',
            'contact': '1234567890',
            'password': 'testpass123',
            'organization': org.id,
            'assigned_geofence': geofence_id
        }
        
        try:
            serializer = SecurityOfficerCreateSerializer(data=test_data)
            print(f"   Serializer created: {serializer.__class__.__name__}")
            print(f"   Serializer is valid: {serializer.is_valid()}")
            
            if not serializer.is_valid():
                print(f"   ❌ Validation errors: {serializer.errors}")
                return False
            
            # Test 3: Try to create the officer (this should work now)
            print("✅ Test 3: Create SecurityOfficer with assigned_geofence")
            
            # Get a user for created_by (use super admin if exists, or create one)
            User = get_user_model()
            created_by_user = User.objects.filter(role='SUPER_ADMIN').first()
            if not created_by_user:
                created_by_user = User.objects.create_user(
                    username='test_admin',
                    email='admin@example.com',
                    password='admin123',
                    role='SUPER_ADMIN'
                )
                print(f"   Created admin user: {created_by_user.username}")
            
            # Mock the request
            class MockRequest:
                def __init__(self, user):
                    self.user = user
            
            mock_request = MockRequest(created_by_user)
            
            # Set context before validation
            serializer.context = {'request': mock_request}
            
            # This should work without the assigned_geofence error
            officer = serializer.save(created_by=created_by_user)
            print(f"   ✅ Officer created successfully: {officer.name}")
            print(f"   Officer ID: {officer.id}")
            print(f"   Assigned geofence: {officer.assigned_geofence}")
            
            # Clean up
            officer.delete()
            print("   🧹 Cleaned up test officer")
            
        except Exception as e:
            print(f"   ❌ Officer creation failed: {e}")
            import traceback
            traceback.print_exc()
            return False
        
        print("\n🎉 All tests passed! assigned_geofence fix is working.")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_assigned_geofence_fix()
    sys.exit(0 if success else 1)
