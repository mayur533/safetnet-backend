"""
Fix script to set the role field for Django superusers
Django superusers need role='SUPER_ADMIN' to work with the API
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def fix_superuser_role(username=None):
    """Fix superuser role to match API requirements"""
    
    print("=" * 70)
    print("🔧 Fixing Superuser Role")
    print("=" * 70)
    
    if username:
        try:
            users = [User.objects.get(username=username)]
        except User.DoesNotExist:
            print(f"\n❌ User '{username}' not found")
            return
    else:
        # Get all superusers
        users = User.objects.filter(is_superuser=True)
    
    if not users.exists():
        print(f"\n⚠️  No superusers found")
        return
    
    print(f"\n📋 Found {users.count()} superuser(s):")
    
    for user in users:
        print(f"\n   User: {user.username}")
        print(f"   - Email: {user.email}")
        print(f"   - Current role: '{user.role}'")
        print(f"   - is_superuser: {user.is_superuser}")
        print(f"   - is_active: {user.is_active}")
        
        if user.role != 'SUPER_ADMIN':
            print(f"   ⚠️  Role is '{user.role}', should be 'SUPER_ADMIN'")
            user.role = 'SUPER_ADMIN'
            user.is_active = True  # Ensure user is active
            user.save()
            print(f"   ✅ Updated role to 'SUPER_ADMIN'")
        else:
            print(f"   ✅ Role is already 'SUPER_ADMIN'")
        
        if not user.is_active:
            print(f"   ⚠️  User is not active")
            user.is_active = True
            user.save()
            print(f"   ✅ Activated user")
    
    print("\n" + "=" * 70)
    print("✅ Fix Complete!")
    print("=" * 70)
    print("\n💡 Next Steps:")
    print("   1. Have the user log out and log back in")
    print("   2. This will generate a new JWT token")
    print("   3. The new token will include the correct role")

if __name__ == '__main__':
    username = sys.argv[1] if len(sys.argv) > 1 else None
    fix_superuser_role(username)

