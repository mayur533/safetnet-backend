from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import User, Organization, SecurityOfficer
from security_app.models import OfficerProfile


class Command(BaseCommand):
    help = 'Create a security officer user account'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='security_officer_001',
            help='Username for the security officer',
        )
        parser.add_argument(
            '--password',
            type=str,
            default='SecurityOfficer123!',
            help='Password for the security officer',
        )
        parser.add_argument(
            '--email',
            type=str,
            default='security.officer@safetnet.com',
            help='Email for the security officer',
        )

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']
        
        # Get or create organization
        organization = Organization.objects.first()
        if not organization:
            organization = Organization.objects.create(
                name="Default Organization",
                description="Default organization for security officers"
            )
            self.stdout.write(
                self.style.SUCCESS(f'✅ Created organization: {organization.name}')
            )
        
        # Create or update user
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': 'Security',
                'last_name': 'Officer',
                'role': 'security_officer',
                'organization': organization,
                'is_active': True
            }
        )
        
        if not created:
            self.stdout.write(
                self.style.WARNING(f'⚠️  User {username} already exists. Updating...')
            )
            user.email = email
            user.role = 'security_officer'
            user.is_active = True
            user.organization = organization
        
        user.set_password(password)
        user.save()
        
        # Create or get SecurityOfficer record
        officer, officer_created = SecurityOfficer.objects.get_or_create(
            username=username,
            defaults={
                'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email,
                'organization': user.organization,
                'is_active': True
            }
        )
        
        if not officer_created:
            self.stdout.write(
                self.style.WARNING(f'⚠️  SecurityOfficer record already exists. Updating...')
            )
            officer.email = user.email
            officer.is_active = True
            officer.organization = user.organization
            officer.save()
        else:
            self.stdout.write(self.style.SUCCESS(f'✅ Created SecurityOfficer record for {username}'))
        
        # Create or update OfficerProfile
        profile, profile_created = OfficerProfile.objects.get_or_create(
            officer=officer,
            defaults={
                'on_duty': True,
                'last_seen_at': timezone.now(),
                'battery_level': 100,
            }
        )
        
        if not profile_created:
            self.stdout.write(
                self.style.WARNING(f'⚠️  OfficerProfile already exists. Keeping existing profile.')
            )
        else:
            self.stdout.write(self.style.SUCCESS(f'✅ Created OfficerProfile'))
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS('SECURITY OFFICER CREATED SUCCESSFULLY!'))
        self.stdout.write('='*70)
        self.stdout.write(f'Username: {username}')
        self.stdout.write(f'Password: {password}')
        self.stdout.write(f'Email: {email}')
        self.stdout.write(f'Role: security_officer')
        self.stdout.write(f'Organization: {organization.name}')
        self.stdout.write(f'SecurityOfficer Profile: ✅ Created')
        self.stdout.write(f'OfficerProfile: ✅ Created')
        self.stdout.write(f'On Duty: {profile.on_duty}')
        if officer.assigned_geofence:
            self.stdout.write(f'Assigned Geofence: {officer.assigned_geofence.name} (ID: {officer.assigned_geofence.id})')
        else:
            self.stdout.write(f'Assigned Geofence: None (use assign_geofence_to_officer command to assign)')
        self.stdout.write(f'\nLogin API Endpoint: POST /api/security/login/')
        self.stdout.write(f'Request Body: {{"username": "{username}", "password": "{password}"}}')
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))



