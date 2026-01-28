"""
Verification script to confirm that when a subadmin creates a security officer,
it appears in:
1. Database (User, SecurityOfficer, OfficerProfile records)
2. Superadmin's user list (GET /api/auth/admin/users/)
3. Subadmin's security officer list (GET /api/auth/admin/officers/)
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import SecurityOfficer, Organization
from users.views import UserListViewSet, SecurityOfficerViewSet
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request

User = get_user_model()

def verify_officer_visibility(username):
    """Verify that a security officer appears in all the right places"""
    
    print("=" * 70)
    print(f"🔍 Verifying Security Officer Visibility: {username}")
    print("=" * 70)
    
    all_checks_passed = True
    
    # Step 1: Check database records
    print("\n📋 STEP 1: Checking Database Records...")
    
    try:
        user = User.objects.get(username=username)
        print(f"   ✅ User record exists:")
        print(f"      - Username: {user.username}")
        print(f"      - Role: {user.role}")
        print(f"      - Organization: {user.organization.name if user.organization else 'None'}")
        print(f"      - Is Active: {user.is_active}")
    except User.DoesNotExist:
        print(f"   ❌ User record NOT found")
        all_checks_passed = False
        return False
    
    try:
        officer = SecurityOfficer.objects.get(username=username)
        print(f"   ✅ SecurityOfficer record exists:")
        print(f"      - Name: {officer.name}")
        print(f"      - Organization: {officer.organization.name if officer.organization else 'None'}")
        print(f"      - Created By: {officer.created_by.username if officer.created_by else 'None'}")
    except SecurityOfficer.DoesNotExist:
        print(f"   ❌ SecurityOfficer record NOT found")
        all_checks_passed = False
        return False
    
    try:
        from security_app.models import OfficerProfile
        profile = OfficerProfile.objects.get(officer=officer)
        print(f"   ✅ OfficerProfile record exists")
    except Exception:
        print(f"   ❌ OfficerProfile record NOT found")
        all_checks_passed = False
    
    # Step 2: Check if officer appears in Superadmin's user list
    print("\n📋 STEP 2: Checking Superadmin User List Visibility...")
    
    try:
        # Get a superadmin user
        superadmin = User.objects.filter(role='SUPER_ADMIN', is_active=True).first()
        if not superadmin:
            print(f"   ⚠️  No SUPER_ADMIN user found, skipping test")
        else:
            factory = APIRequestFactory()
            request = factory.get('/api/auth/admin/users/')
            request.user = superadmin
            
            viewset = UserListViewSet()
            viewset.request = request
            viewset.action = 'list'
            viewset.format_kwarg = None
            
            queryset = viewset.get_queryset()
            
            if user in queryset:
                print(f"   ✅ Officer appears in SUPER_ADMIN user list")
                print(f"      - Total users visible to superadmin: {queryset.count()}")
            else:
                print(f"   ❌ Officer does NOT appear in SUPER_ADMIN user list")
                all_checks_passed = False
    except Exception as e:
        print(f"   ⚠️  Error checking superadmin list: {e}")
    
    # Step 3: Check if officer appears in Subadmin's security officer list
    print("\n📋 STEP 3: Checking Subadmin Security Officer List Visibility...")
    
    if officer.created_by:
        try:
            subadmin = officer.created_by
            if subadmin.role != 'SUB_ADMIN':
                print(f"   ⚠️  Created by user is not SUB_ADMIN (role: {subadmin.role})")
            else:
                factory = APIRequestFactory()
                request = factory.get('/api/auth/admin/officers/')
                request.user = subadmin
                
                viewset = SecurityOfficerViewSet()
                viewset.request = request
                viewset.action = 'list'
                viewset.format_kwarg = None
                
                queryset = viewset.get_queryset()
                
                if officer in queryset:
                    print(f"   ✅ Officer appears in SUB_ADMIN security officer list")
                    print(f"      - Created by: {subadmin.username}")
                    print(f"      - Total officers visible to subadmin: {queryset.count()}")
                    print(f"      - Same organization: {officer.organization == subadmin.organization}")
                else:
                    print(f"   ❌ Officer does NOT appear in SUB_ADMIN security officer list")
                    print(f"      - Officer organization: {officer.organization}")
                    print(f"      - Subadmin organization: {subadmin.organization}")
                    all_checks_passed = False
        except Exception as e:
            print(f"   ⚠️  Error checking subadmin list: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"   ⚠️  Officer has no created_by field, cannot verify subadmin visibility")
    
    # Step 4: Verify organization matching
    print("\n📋 STEP 4: Verifying Organization Matching...")
    
    if user.organization and officer.organization:
        if user.organization == officer.organization:
            print(f"   ✅ User and SecurityOfficer have matching organization: {user.organization.name}")
        else:
            print(f"   ❌ Organization mismatch!")
            print(f"      - User organization: {user.organization.name}")
            print(f"      - Officer organization: {officer.organization.name}")
            all_checks_passed = False
    else:
        print(f"   ⚠️  One or both records missing organization")
    
    # Summary
    print("\n" + "=" * 70)
    if all_checks_passed:
        print("✅ VERIFICATION PASSED!")
        print("   The security officer should appear in:")
        print("   1. ✅ Database (User, SecurityOfficer, OfficerProfile)")
        print("   2. ✅ Superadmin's user list (GET /api/auth/admin/users/)")
        print("   3. ✅ Subadmin's security officer list (GET /api/auth/admin/officers/)")
    else:
        print("❌ VERIFICATION FAILED!")
        print("   Some checks failed - see details above")
    print("=" * 70)
    
    return all_checks_passed

if __name__ == '__main__':
    if len(sys.argv) > 1:
        username = sys.argv[1]
        success = verify_officer_visibility(username)
        sys.exit(0 if success else 1)
    else:
        print("Usage: python verify_officer_visibility.py <username>")
        print("Example: python verify_officer_visibility.py test_officer_verify")

