#!/usr/bin/env python
"""
Simple test to verify assigned_geofence fix works
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from users.models import SecurityOfficer, Geofence
from users.serializers import SecurityOfficerCreateSerializer

def test_simple_geofence_fix():
    """Simple test to verify the assigned_geofence fix"""
    print("🧪 Testing assigned_geofence Fix (Simple)")
    print("=" * 50)
    
    try:
        # Test 1: Check if we have geofences
        print("✅ Test 1: Check available geofences")
        geofences = Geofence.objects.all()
        print(f"   Available geofences: {geofences.count()}")
        
        if geofences.count() == 0:
            print("   ⚠️  No geofences found. Cannot test assigned_geofence fix.")
            return False
        
        geofence_id = geofences.first().id
        print(f"   Using geofence with ID: {geofence_id}")
        
        # Test 2: Test serializer with assigned_geofence
        print("✅ Test 2: Test SecurityOfficerCreateSerializer with assigned_geofence")
        test_data = {
            'username': 'test_officer_simple',
            'name': 'Test Officer Simple',
            'email': 'test_simple@example.com',
            'contact': '1234567890',
            'password': 'testpass123',
            'assigned_geofence': geofence_id
        }
        
        serializer = SecurityOfficerCreateSerializer(data=test_data)
        print(f"   Serializer created: {serializer.__class__.__name__}")
        print(f"   Serializer is valid: {serializer.is_valid()}")
        
        if not serializer.is_valid():
            print(f"   ❌ Validation errors: {serializer.errors}")
            return False
        
        # Test 3: Check if the assigned_geofence ID is properly handled
        print("✅ Test 3: Check assigned_geofence handling")
        validated_data = serializer.validated_data
        print(f"   assigned_geofence in validated_data: {validated_data.get('assigned_geofence')}")
        
        # The key test: assigned_geofence should be an integer that can be converted to Geofence instance
        assigned_geofence_value = validated_data.get('assigned_geofence')
        if assigned_geofence_value is not None:
            print(f"   ✅ assigned_geofence is properly handled as: {type(assigned_geofence_value)} = {assigned_geofence_value}")
            
            # Test that we can get the geofence instance
            try:
                geofence_instance = Geofence.objects.get(id=assigned_geofence_value)
                print(f"   ✅ Can retrieve Geofence instance: {geofence_instance.name}")
            except Geofence.DoesNotExist:
                print(f"   ❌ Geofence with ID {assigned_geofence_value} does not exist")
                return False
        else:
            print("   ⚠️  assigned_geofence is None (optional field)")
        
        print("\n🎉 Simple test passed! assigned_geofence fix is working.")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_simple_geofence_fix()
    sys.exit(0 if success else 1)
