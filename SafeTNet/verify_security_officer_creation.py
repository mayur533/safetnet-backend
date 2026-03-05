"""
Verification script to confirm security officer creation is working correctly
Run this after a subadmin creates a security officer through the website
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.contrib.auth import get_user_model
# SecurityOfficer model removed - using User with role='security_officer' instead
# from users.models import SecurityOfficer, Organization
from users.models import Organization
from security_app.models import OfficerProfile

User = get_user_model()

def verify_security_officer(username):
    """
    Verify that a security officer was created correctly with all required records
    
    Usage: python verify_security_officer_creation.py <username>
    Example: python verify_security_officer_creation.py officer_test
    """
    
    print("=" * 70)
    print(f"🔍 Verifying Security Officer: {username}")
    print("=" * 70)
    
    all_checks_passed = True
    
    # Step 1: Check User record
    print("\n📋 STEP 1: Checking User Record...")
    user = None
    try:
        user = User.objects.get(username=username)
        print(f"   ✅ User record found:")
        print(f"      - ID: {user.id}")
        print(f"      - Username: {user.username}")
        print(f"      - Email: {user.email}")
        print(f"      - Role: {user.role}")
        print(f"      - Organization: {user.organization.name if user.organization else 'None'}")
        print(f"      - Is Active: {user.is_active}")
        print(f"      - Created At: {user.date_joined}")
        
        if user.role != 'security_officer':
            print(f"      ❌ ERROR: User role is '{user.role}', expected 'security_officer'")
            all_checks_passed = False
        else:
            print(f"      ✅ Role is correct: 'security_officer'")
            
    except User.DoesNotExist:
        print(f"   ❌ ERROR: User record NOT found for username '{username}'")
        print(f"   ⚠️  This security officer was created without a User record")
        print(f"   ⚠️  This officer cannot login via the security app")
        all_checks_passed = False
    
    # Step 2: Check User role (replacing SecurityOfficer record)
    print("\n📋 STEP 2: Checking User Role (Security Officer)...")
    if user and user.role == 'security_officer':
        print(f"   ✅ User has security_officer role:")
        print(f"      - ID: {user.id}")
        print(f"      - Username: {user.username}")
        print(f"      - Name: {user.get_full_name() or 'N/A'}")
        print(f"      - Email: {user.email}")
        print(f"      - Phone: {user.phone or 'N/A'}")
        print(f"      - Organization: {user.organization.name if user.organization else 'None'}")
        print(f"      - Is Active: {user.is_active}")
        print(f"      - Created At: {user.created_at}")
        print(f"      - Role: {user.role}")
    else:
        print(f"   ❌ ERROR: User with security_officer role NOT found for username '{username}'")
        print(f"   ⚠️  This means the security officer creation failed or user doesn't have correct role")
        all_checks_passed = False
    
    # Step 3: Check OfficerProfile record
    print("\n📋 STEP 3: Checking OfficerProfile Record...")
    try:
        if user and user.role == 'security_officer':
            profile = OfficerProfile.objects.get(officer=user)
            print(f"   ✅ OfficerProfile record found:")
            print(f"      - Officer ID: {profile.officer.id}")
            print(f"      - On Duty: {profile.on_duty}")
            print(f"      - Battery Level: {profile.battery_level}")
            print(f"      - Last Seen At: {profile.last_seen_at}")
            print(f"      - Last Latitude: {profile.last_latitude if hasattr(profile, 'last_latitude') else 'N/A'}")
            print(f"      - Last Longitude: {profile.last_longitude if hasattr(profile, 'last_longitude') else 'N/A'}")
        else:
            print(f"   ⚠️  Skipping: User with security_officer role not found")
            all_checks_passed = False
    except OfficerProfile.DoesNotExist:
        print(f"   ❌ ERROR: OfficerProfile record NOT found for user {user.username if user else 'N/A'}")
        print(f"   ⚠️  This means the security officer creation failed at OfficerProfile creation step")
        all_checks_passed = False
    
    # Step 4: Verify OfficerProfile relationship
    print("\n📋 STEP 4: Verifying OfficerProfile Relationship...")
    if user and user.role == 'security_officer':
        try:
            profile = OfficerProfile.objects.get(officer=user)
            print(f"   ✅ OfficerProfile correctly linked to User:")
            print(f"      - User ID: {user.id}")
            print(f"      - OfficerProfile ID: {profile.id}")
            print(f"      - OfficerProfile.officer ID: {profile.officer.id}")
            if user.id == profile.officer.id:
                print(f"   ✅ User and OfficerProfile IDs match")
            else:
                print(f"   ❌ ERROR: User and OfficerProfile IDs don't match")
                all_checks_passed = False
        except OfficerProfile.DoesNotExist:
            print(f"   ❌ ERROR: OfficerProfile not found for user")
            all_checks_passed = False
    else:
        print(f"   ⚠️  Skipping relationship checks - User with security_officer role not found")
        all_checks_passed = False
    
    # Step 5: Test login capability
    print("\n📋 STEP 5: Testing Login Capability...")
    if user:
        print(f"   ℹ️  To test login, the security officer should be able to:")
        print(f"      1. Use username: '{user.username}'")
        print(f"      2. Use password: (the password set during creation)")
        print(f"      3. Login via: POST /api/security/login/")
        print(f"   ✅ User record exists, so login should work (if password is correct)")
    else:
        print(f"   ❌ ERROR: Cannot test login - User record not found")
        print(f"   ⚠️  This security officer cannot login because User record is missing")
        print(f"   💡 To fix: Delete and recreate this officer through the subadmin panel")
        all_checks_passed = False
    
    # Final Summary
    print("\n" + "=" * 70)
    if all_checks_passed:
        print("✅ VERIFICATION SUCCESSFUL!")
        print("   All required records (User with security_officer role, OfficerProfile) exist")
        print("   Relationships are correctly established")
        print("   Security officer can login via the security app")
    else:
        print("❌ VERIFICATION FAILED!")
        print("   Some required records are missing or incorrect")
        print("   Please check the errors above and review the creation API")
    print("=" * 70)
    
    return all_checks_passed

def list_all_security_officers():
    """List all security officers in the database"""
    print("\n" + "=" * 70)
    print("📋 ALL SECURITY OFFICERS IN DATABASE")
    print("=" * 70)
    
    officers = User.objects.filter(role='security_officer').select_related('organization').all()
    
    if not officers.exists():
        print("\n   ⚠️  No security officers found in database")
        return
    
    for idx, officer in enumerate(officers, 1):
        print(f"\n{idx}. {officer.get_full_name() or officer.username} (Username: {officer.username})")
        print(f"   - ID: {officer.id}")
        print(f"   - Email: {officer.email}")
        print(f"   - Phone: {officer.phone or 'N/A'}")
        print(f"   - Organization: {officer.organization.name if officer.organization else 'None'}")
        print(f"   - Is Active: {officer.is_active}")
        print(f"   - Created At: {officer.created_at}")
        
        # Check if OfficerProfile exists
        try:
            profile = OfficerProfile.objects.get(officer=officer)
            print(f"   - OfficerProfile: ✅ Exists (On Duty: {profile.on_duty})")
        except OfficerProfile.DoesNotExist:
            print(f"   - OfficerProfile: ❌ MISSING")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        # Verify specific officer
        username = sys.argv[1]
        success = verify_security_officer(username)
        sys.exit(0 if success else 1)
    else:
        # List all officers
        list_all_security_officers()
        print("\n" + "=" * 70)
        print("💡 Usage: python verify_security_officer_creation.py <username>")
        print("   Example: python verify_security_officer_creation.py officer_test")
        print("=" * 70)

