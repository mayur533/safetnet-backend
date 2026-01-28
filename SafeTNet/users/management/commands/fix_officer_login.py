from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import SecurityOfficer
from security_app.models import OfficerProfile
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = 'Fix security officer login issues - ensure user exists, is active, and has correct setup'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            required=True,
            help='Username of the security officer to fix',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Set a new password for the user (optional)',
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Email for the user (optional)',
        )

    def handle(self, *args, **options):
        username = options['username']
        new_password = options.get('password')
        email = options.get('email', f'{username}@safetnet.com')
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*80))
        self.stdout.write(self.style.SUCCESS(f'FIXING LOGIN ISSUES FOR: {username}'))
        self.stdout.write('='*80 + '\n')
        
        issues_found = []
        fixes_applied = []
        
        # Step 1: Check/Create User
        try:
            user = User.objects.get(username=username)
            self.stdout.write(f'✅ User exists: {username}')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ User does not exist: {username}'))
            issues_found.append("User does not exist")
            
            # Create user
            from users.models import Organization
            organization = Organization.objects.first()
            if not organization:
                self.stdout.write(self.style.ERROR('❌ No organization found. Cannot create user.'))
                return
            
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name='Security',
                last_name='Officer',
                role='security_officer',
                organization=organization,
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS(f'✅ Created user: {username}'))
            fixes_applied.append("Created user")
        
        # Step 2: Check if user is active
        if not user.is_active:
            self.stdout.write(self.style.WARNING(f'⚠️  User is NOT active'))
            issues_found.append("User is not active")
            user.is_active = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'✅ Activated user'))
            fixes_applied.append("Activated user")
        else:
            self.stdout.write(f'✅ User is active')
        
        # Step 3: Check role
        if user.role != 'security_officer':
            self.stdout.write(self.style.WARNING(f'⚠️  User role is "{user.role}", expected "security_officer"'))
            issues_found.append(f"Wrong role: {user.role}")
            user.role = 'security_officer'
            user.save()
            self.stdout.write(self.style.SUCCESS(f'✅ Set role to security_officer'))
            fixes_applied.append("Fixed role")
        else:
            self.stdout.write(f'✅ Role is correct: security_officer')
        
        # Step 4: Set password
        if new_password:
            user.set_password(new_password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'✅ Password updated'))
            fixes_applied.append("Password updated")
        else:
            # Check if user has a password set
            if not user.has_usable_password():
                self.stdout.write(self.style.WARNING(f'⚠️  User has no password set'))
                issues_found.append("No password set")
                default_password = f'{username}123!'
                user.set_password(default_password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f'✅ Set default password: {default_password}'))
                fixes_applied.append(f"Set default password: {default_password}")
        
        # Step 5: Check/Create SecurityOfficer
        try:
            officer = SecurityOfficer.objects.get(username=username)
            self.stdout.write(f'✅ SecurityOfficer profile exists')
            if not officer.is_active:
                self.stdout.write(self.style.WARNING(f'⚠️  SecurityOfficer is NOT active'))
                issues_found.append("SecurityOfficer is not active")
                officer.is_active = True
                officer.save()
                self.stdout.write(self.style.SUCCESS(f'✅ Activated SecurityOfficer'))
                fixes_applied.append("Activated SecurityOfficer")
        except SecurityOfficer.DoesNotExist:
            self.stdout.write(self.style.WARNING(f'⚠️  SecurityOfficer profile does not exist'))
            issues_found.append("SecurityOfficer profile missing")
            
            if not user.organization:
                self.stdout.write(self.style.ERROR('❌ User has no organization. Cannot create SecurityOfficer.'))
                return
            
            officer = SecurityOfficer.objects.create(
                username=username,
                name=f"{user.first_name} {user.last_name}".strip() or user.username,
                email=user.email or email,
                organization=user.organization,
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS(f'✅ Created SecurityOfficer profile'))
            fixes_applied.append("Created SecurityOfficer profile")
        
        # Step 6: Check/Create OfficerProfile
        try:
            profile = OfficerProfile.objects.get(officer=officer)
            self.stdout.write(f'✅ OfficerProfile exists')
        except OfficerProfile.DoesNotExist:
            self.stdout.write(self.style.WARNING(f'⚠️  OfficerProfile does not exist'))
            issues_found.append("OfficerProfile missing")
            profile = OfficerProfile.objects.create(
                officer=officer,
                on_duty=False,
                last_seen_at=timezone.now()
            )
            self.stdout.write(self.style.SUCCESS(f'✅ Created OfficerProfile'))
            fixes_applied.append("Created OfficerProfile")
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\n' + '='*80))
        self.stdout.write(self.style.SUCCESS('SUMMARY'))
        self.stdout.write('='*80)
        
        if issues_found:
            self.stdout.write(self.style.WARNING(f'\n⚠️  Issues Found: {len(issues_found)}'))
            for issue in issues_found:
                self.stdout.write(f'  - {issue}')
        
        if fixes_applied:
            self.stdout.write(self.style.SUCCESS(f'\n✅ Fixes Applied: {len(fixes_applied)}'))
            for fix in fixes_applied:
                self.stdout.write(f'  - {fix}')
        
        # Final credentials
        password_to_use = new_password if new_password else (default_password if 'default_password' in locals() else '[unchanged]')
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*80))
        self.stdout.write(self.style.SUCCESS('LOGIN CREDENTIALS'))
        self.stdout.write('='*80)
        self.stdout.write(f'Username: {username}')
        if password_to_use != '[unchanged]':
            self.stdout.write(f'Password: {password_to_use}')
        else:
            self.stdout.write(self.style.WARNING('Password: [Not changed - use --password to set new password]'))
        self.stdout.write(f'Email: {user.email}')
        self.stdout.write(f'Is Active: ✅ YES')
        self.stdout.write(f'Role: {user.role}')
        self.stdout.write(f'\nLogin Endpoint: POST /api/security/login/')
        self.stdout.write(f'Request Body: {{"username": "{username}", "password": "{password_to_use if password_to_use != "[unchanged]" else "[your password]"}"}}')
        self.stdout.write('='*80 + '\n')
        
        if not issues_found and not fixes_applied:
            self.stdout.write(self.style.SUCCESS('✅ No issues found! User should be able to login.'))
        else:
            self.stdout.write(self.style.SUCCESS('✅ All issues fixed! User should be able to login now.'))

