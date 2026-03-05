from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
# SecurityOfficer model removed - using User with role='security_officer' instead
# from users.models import SecurityOfficer
from security_app.models import OfficerProfile

User = get_user_model()


class Command(BaseCommand):
    help = 'Check user status, OfficerProfile, and User role (legacy SecurityOfficer model deprecated)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Username to check (if not provided, checks all security officers)',
        )

    def handle(self, *args, **options):
        username = options.get('username')
        
        if username:
            # Check specific user
            try:
                user = User.objects.get(username=username)
                self.check_user_details(user)
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'❌ User "{username}" not found'))
        else:
            # Check all security officers
            self.stdout.write(self.style.SUCCESS('\n' + '='*80))
            self.stdout.write(self.style.SUCCESS('CHECKING ALL SECURITY OFFICER USERS'))
            self.stdout.write('='*80 + '\n')
            
            security_officers = User.objects.filter(role='security_officer')
            
            if not security_officers.exists():
                self.stdout.write(self.style.WARNING('⚠️  No security officer users found'))
                return
            
            for user in security_officers:
                self.check_user_details(user)
                self.stdout.write('-'*80 + '\n')
    
    def check_user_details(self, user):
        """Check and display user details"""
        self.stdout.write(f'\n📋 User: {user.username}')
        self.stdout.write(f'   Email: {user.email}')
        self.stdout.write(f'   Full Name: {user.get_full_name() or "N/A"}')
        self.stdout.write(f'   Role: {user.role}')
        self.stdout.write(f'   Is Active (User): {"✅ YES" if user.is_active else "❌ NO"}')
        self.stdout.write(f'   Is Staff: {"✅ YES" if user.is_staff else "❌ NO"}')
        self.stdout.write(f'   Is Superuser: {"✅ YES" if user.is_superuser else "❌ NO"}')
        self.stdout.write(f'   Date Joined: {user.date_joined}')
        self.stdout.write(f'   Last Login: {user.last_login or "Never"}')
        
        # Check User role instead of SecurityOfficer profile
        if user.role == 'security_officer':
            self.stdout.write(f'\n👮 Security Officer Status:')
            self.stdout.write(f'   ✅ User has security_officer role')
            self.stdout.write(f'   Name: {user.get_full_name() or user.username}')
            self.stdout.write(f'   Email: {user.email}')
            
            # Check OfficerProfile
            try:
                profile = OfficerProfile.objects.get(officer=user)
                self.stdout.write(f'   ✅ OfficerProfile exists')
                self.stdout.write(f'   On Duty: {"Yes" if profile.on_duty else "No"}')
                if profile.last_seen_at:
                    self.stdout.write(f'   Last Seen: {profile.last_seen_at}')
                else:
                    self.stdout.write(f'   Last Seen: Never')
            except OfficerProfile.DoesNotExist:
                self.stdout.write(f'   ❌ OfficerProfile DOES NOT EXIST')
                self.stdout.write(self.style.WARNING('   ⚠️  OfficerProfile needs to be created!'))
        else:
            self.stdout.write(f'\n👮 Security Officer Status:')
            self.stdout.write(f'   ❌ User is not a security officer (role: {user.role})')
        
        # Summary
        self.stdout.write(f'\n📊 Summary:')
        
        issues = []
        if not user.is_active:
            issues.append("User is not active")
        
        if user.role == 'security_officer':
            try:
                profile = OfficerProfile.objects.get(officer=user)
                if not profile.on_duty:
                    issues.append("Officer is not on duty")
            except OfficerProfile.DoesNotExist:
                issues.append("OfficerProfile missing")
        else:
            issues.append(f"User is not a security officer (role: {user.role})")
        
        if issues:
            self.stdout.write(self.style.ERROR(f'   ❌ Issues found: {", ".join(issues)}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'   ✅ All checks passed!'))
