"""
Script to set role='security_officer' for all users who have a corresponding
SecurityOfficer record created by a subadmin.
This fixes any existing data inconsistencies.
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import SecurityOfficer

User = get_user_model()

def set_security_officer_roles(dry_run=True):
    """
    Set role='security_officer' for users with SecurityOfficer records
    
    Args:
        dry_run: If True, only show what would be changed without making changes
    """
    
    print("=" * 70)
    print(f"🔧 Setting Security Officer Roles")
    print(f"   Mode: {'DRY RUN (no changes)' if dry_run else 'LIVE (will make changes)'}")
    print("=" * 70)
    
    # Get all SecurityOfficer records
    officers = SecurityOfficer.objects.select_related('created_by', 'organization').all()
    
    print(f"\n📋 Found {officers.count()} SecurityOfficer record(s)")
    
    updated_count = 0
    not_found_count = 0
    already_correct_count = 0
    missing_user_count = 0
    
    for officer in officers:
        print(f"\n--- Processing: {officer.name} (username: {officer.username}) ---")
        
        # Skip if no username
        if not officer.username:
            print(f"   ⚠️  Skipping: No username set")
            continue
        
        # Try to find matching User record
        try:
            user = User.objects.get(username=officer.username)
            
            print(f"   User found: {user.username}")
            print(f"   - Current role: '{user.role}'")
            print(f"   - Email: {user.email}")
            print(f"   - Is Active: {user.is_active}")
            print(f"   - Organization: {user.organization.name if user.organization else 'None'}")
            
            # Check if role needs to be updated
            if user.role == 'security_officer':
                print(f"   ✅ Role is already 'security_officer'")
                already_correct_count += 1
            else:
                print(f"   ⚠️  Role is '{user.role}', should be 'security_officer'")
                
                if not dry_run:
                    user.role = 'security_officer'
                    # Also ensure user is active
                    if not user.is_active:
                        print(f"   ⚠️  User is not active, activating...")
                        user.is_active = True
                    
                    # Ensure organization matches SecurityOfficer
                    if officer.organization and user.organization != officer.organization:
                        print(f"   ⚠️  Organization mismatch, updating...")
                        print(f"      User org: {user.organization}")
                        print(f"      Officer org: {officer.organization}")
                        user.organization = officer.organization
                    
                    user.save()
                    print(f"   ✅ Updated role to 'security_officer'")
                    updated_count += 1
                else:
                    print(f"   [DRY RUN] Would update role to 'security_officer'")
                    updated_count += 1
                    
        except User.DoesNotExist:
            print(f"   ❌ User record NOT found for username: {officer.username}")
            print(f"   ⚠️  This security officer cannot login - User record is missing")
            print(f"   💡 Recommendation: Delete and recreate this officer through subadmin panel")
            missing_user_count += 1
            not_found_count += 1
        except User.MultipleObjectsReturned:
            print(f"   ❌ Multiple User records found for username: {officer.username}")
            print(f"   ⚠️  This is a data integrity issue - multiple users with same username")
            not_found_count += 1
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    print(f"   Total SecurityOfficer records: {officers.count()}")
    print(f"   ✅ Already correct (role='security_officer'): {already_correct_count}")
    print(f"   {'[DRY RUN] Would update' if dry_run else '✅ Updated'}: {updated_count}")
    print(f"   ❌ Missing User records: {missing_user_count}")
    print(f"   ⚠️  Other issues: {not_found_count - missing_user_count}")
    
    if dry_run and updated_count > 0:
        print(f"\n💡 To apply changes, run:")
        print(f"   python set_security_officer_roles.py --apply")
    elif not dry_run:
        print(f"\n✅ Changes applied successfully!")
        if missing_user_count > 0:
            print(f"\n⚠️  Warning: {missing_user_count} security officers are missing User records.")
            print(f"   These officers cannot login. Consider recreating them through the subadmin panel.")

if __name__ == '__main__':
    # Check for --apply flag
    apply_changes = '--apply' in sys.argv
    
    if not apply_changes:
        print("\n⚠️  DRY RUN MODE - No changes will be made")
        print("   Add --apply flag to make actual changes\n")
    
    set_security_officer_roles(dry_run=not apply_changes)

