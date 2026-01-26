"""
Debug script to check why user is getting 403 errors
This helps diagnose authentication and permission issues
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import Organization
from users.permissions import IsSuperAdminOrSubAdmin

User = get_user_model()

def check_user_permissions(username):
    """Check a user's authentication and permission status"""
    
    print("=" * 70)
    print(f"🔍 Debugging 403 Error for User: {username}")
    print("=" * 70)
    
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        print(f"\n❌ ERROR: User '{username}' not found in database")
        return
    
    print(f"\n📋 User Information:")
    print(f"   - ID: {user.id}")
    print(f"   - Username: {user.username}")
    print(f"   - Email: {user.email}")
    print(f"   - Role: '{user.role}'")
    print(f"   - Is Active: {user.is_active}")
    print(f"   - Is Staff: {user.is_staff}")
    print(f"   - Is Superuser: {user.is_superuser}")
    print(f"   - Organization: {user.organization.name if user.organization else 'None'}")
    
    # Check role format
    print(f"\n📋 Role Check:")
    expected_roles = ['SUPER_ADMIN', 'SUB_ADMIN']
    if user.role in expected_roles:
        print(f"   ✅ Role '{user.role}' is in expected roles: {expected_roles}")
    else:
        print(f"   ❌ Role '{user.role}' is NOT in expected roles: {expected_roles}")
        print(f"   ⚠️  This will cause 403 errors!")
        print(f"   💡 Fix: Update user role to exactly 'SUB_ADMIN' or 'SUPER_ADMIN'")
    
    # Check if user is active
    print(f"\n📋 Active Status Check:")
    if user.is_active:
        print(f"   ✅ User is active")
    else:
        print(f"   ❌ User is NOT active")
        print(f"   ⚠️  Inactive users cannot authenticate!")
        print(f"   💡 Fix: Set user.is_active = True")
    
    # Check organization (for SUB_ADMIN)
    print(f"\n📋 Organization Check:")
    if user.role == 'SUB_ADMIN':
        if user.organization:
            print(f"   ✅ SUB_ADMIN has organization: {user.organization.name}")
        else:
            print(f"   ❌ SUB_ADMIN does NOT have an organization")
            print(f"   ⚠️  Some endpoints require SUB_ADMIN to have an organization")
            print(f"   💡 Fix: Assign an organization to this user")
    elif user.role == 'SUPER_ADMIN':
        print(f"   ℹ️  SUPER_ADMIN doesn't require organization")
    else:
        print(f"   ℹ️  Role '{user.role}' may not require organization")
    
    # Test permission class
    print(f"\n📋 Permission Class Test:")
    from unittest.mock import Mock
    mock_request = Mock()
    mock_request.user = user
    mock_view = Mock()
    mock_view.__class__.__name__ = "TestView"
    
    permission = IsSuperAdminOrSubAdmin()
    has_permission = permission.has_permission(mock_request, mock_view)
    
    if has_permission:
        print(f"   ✅ IsSuperAdminOrSubAdmin permission: GRANTED")
    else:
        print(f"   ❌ IsSuperAdminOrSubAdmin permission: DENIED")
        print(f"   ⚠️  This is why you're getting 403 errors!")
    
    # Check authentication
    print(f"\n📋 Authentication Check:")
    if user.is_authenticated:
        print(f"   ✅ User.is_authenticated: True")
    else:
        print(f"   ❌ User.is_authenticated: False (normal in Django shell)")
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    
    issues = []
    if user.role not in ['SUPER_ADMIN', 'SUB_ADMIN']:
        issues.append(f"❌ Role is '{user.role}', should be 'SUPER_ADMIN' or 'SUB_ADMIN'")
    if not user.is_active:
        issues.append("❌ User is not active")
    if user.role == 'SUB_ADMIN' and not user.organization:
        issues.append("❌ SUB_ADMIN has no organization")
    if not has_permission:
        issues.append("❌ Permission check failed")
    
    if issues:
        print("\n🔴 ISSUES FOUND:")
        for issue in issues:
            print(f"   {issue}")
        print("\n💡 TO FIX:")
        print(f"   python manage.py shell")
        print(f"   >>> from django.contrib.auth import get_user_model")
        print(f"   >>> User = get_user_model()")
        print(f"   >>> user = User.objects.get(username='{username}')")
        if user.role not in ['SUPER_ADMIN', 'SUB_ADMIN']:
            print(f"   >>> user.role = 'SUB_ADMIN'  # or 'SUPER_ADMIN'")
            print(f"   >>> user.save()")
        if not user.is_active:
            print(f"   >>> user.is_active = True")
            print(f"   >>> user.save()")
        if user.role == 'SUB_ADMIN' and not user.organization:
            org_name = input("Enter organization name to assign: ")
            print(f"   >>> from users.models import Organization")
            print(f"   >>> org = Organization.objects.get(name='{org_name}')")
            print(f"   >>> user.organization = org")
            print(f"   >>> user.save()")
    else:
        print("\n✅ NO ISSUES FOUND - User should have access")
        print("   If still getting 403, check:")
        print("   1. JWT token is valid and not expired")
        print("   2. Token is being sent in Authorization header")
        print("   3. Backend is using the correct database")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        username = sys.argv[1]
        check_user_permissions(username)
    else:
        print("Usage: python debug_403_error.py <username>")
        print("Example: python debug_403_error.py subadmin1")

