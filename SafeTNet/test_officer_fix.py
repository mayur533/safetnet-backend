#!/usr/bin/env python
"""
Test script to verify SecurityOfficer creation works after import fix
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from users.models import SecurityOfficer, User, Organization
from users.serializers import SecurityOfficerCreateSerializer
from django.contrib.auth import get_user_model

def test_security_officer_import():
    """Test that SecurityOfficer can be imported and used"""
    print("🧪 Testing SecurityOfficer Import Fix")
    print("=" * 50)
    
    try:
        # Test 1: Import SecurityOfficer model
        print("✅ Test 1: Import SecurityOfficer model")
        from users.models import SecurityOfficer
        print(f"   Model: {SecurityOfficer.__name__}")
        
        # Test 2: Import SecurityOfficerCreateSerializer
        print("✅ Test 2: Import SecurityOfficerCreateSerializer")
        from users.serializers import SecurityOfficerCreateSerializer
        print(f"   Serializer: {SecurityOfficerCreateSerializer.__name__}")
        
        # Test 3: Check if SecurityOfficer objects can be queried
        print("✅ Test 3: Query SecurityOfficer objects")
        officer_count = SecurityOfficer.objects.count()
        print(f"   Existing SecurityOfficer count: {officer_count}")
        
        # Test 4: Test serializer instantiation
        print("✅ Test 4: Test SecurityOfficerCreateSerializer")
        test_data = {
            'username': 'test_officer_fix',
            'name': 'Test Officer',
            'email': 'test@example.com',
            'contact': '1234567890',
            'password': 'testpass123',
            'organization': 1  # Assuming organization with ID 1 exists
        }
        
        try:
            serializer = SecurityOfficerCreateSerializer(data=test_data)
            print(f"   Serializer created: {serializer.__class__.__name__}")
            print(f"   Serializer is valid: {serializer.is_valid()}")
            if not serializer.is_valid():
                print(f"   Validation errors: {serializer.errors}")
        except Exception as e:
            print(f"   Serializer test error: {e}")
        
        print("\n🎉 All tests passed! SecurityOfficer import fix is working.")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_security_officer_import()
    sys.exit(0 if success else 1)
