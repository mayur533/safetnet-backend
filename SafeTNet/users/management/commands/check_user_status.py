from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import SecurityOfficer
from security_app.models import OfficerProfile

User = get_user_model()


class Command(BaseCommand):
    help = 'Check user status, SecurityOfficer profile, and OfficerProfile'

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
        
        # Check SecurityOfficer profile
        try:
            officer = SecurityOfficer.objects.get(username=user.username)
            self.stdout.write(f'\n👮 SecurityOfficer Profile:')
            self.stdout.write(f'   ✅ EXISTS')
            self.stdout.write(f'   Name: {officer.name}')
            self.stdout.write(f'   Email: {officer.email}')
            self.stdout.write(f'   Contact: {officer.contact}')
            self.stdout.write(f'   Is Active (Officer): {"✅ YES" if officer.is_active else "❌ NO"}')
            self.stdout.write(f'   Organization: {officer.organization.name if officer.organization else "None"}')
            
            if officer.assigned_geofence:
                self.stdout.write(f'   Assigned Geofence: {officer.assigned_geofence.name} (ID: {officer.assigned_geofence.id})')
            else:
                self.stdout.write(f'   Assigned Geofence: ❌ NONE')
            
            # Check OfficerProfile (from security_app)
            try:
                profile = OfficerProfile.objects.get(officer=officer)
                self.stdout.write(f'\n📱 OfficerProfile (security_app):')
                self.stdout.write(f'   ✅ EXISTS')
                self.stdout.write(f'   On Duty: {"✅ YES" if profile.on_duty else "❌ NO"}')
                self.stdout.write(f'   Last Location: ({profile.last_latitude}, {profile.last_longitude})' if profile.last_latitude and profile.last_longitude else '   Last Location: None')
                self.stdout.write(f'   Last Seen: {profile.last_seen_at or "Never"}')
                self.stdout.write(f'   Battery Level: {profile.battery_level or "N/A"}%')
            except OfficerProfile.DoesNotExist:
                self.stdout.write(f'\n📱 OfficerProfile (security_app):')
                self.stdout.write(f'   ❌ DOES NOT EXIST')
                self.stdout.write(self.style.WARNING('   ⚠️  OfficerProfile needs to be created!'))
                
        except SecurityOfficer.DoesNotExist:
            self.stdout.write(f'\n👮 SecurityOfficer Profile:')
            self.stdout.write(f'   ❌ DOES NOT EXIST')
            self.stdout.write(self.style.ERROR('   ❌ SecurityOfficer record needs to be created!'))
        
        # Summary
        self.stdout.write(f'\n📊 Summary:')
        issues = []
        if not user.is_active:
            issues.append("User is not active")
        try:
            officer = SecurityOfficer.objects.get(username=user.username)
            if not officer.is_active:
                issues.append("SecurityOfficer is not active")
            if not officer.assigned_geofence:
                issues.append("No geofence assigned")
            try:
                profile = OfficerProfile.objects.get(officer=officer)
            except OfficerProfile.DoesNotExist:
                issues.append("OfficerProfile missing")
        except SecurityOfficer.DoesNotExist:
            issues.append("SecurityOfficer profile missing")
        
        if issues:
            self.stdout.write(self.style.ERROR(f'   ❌ Issues found: {", ".join(issues)}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'   ✅ All checks passed!'))

