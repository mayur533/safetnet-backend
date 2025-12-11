from django.core.management.base import BaseCommand
from users.models import User, Organization


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
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('SECURITY OFFICER CREATED SUCCESSFULLY!'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(f'Username: {username}')
        self.stdout.write(f'Password: {password}')
        self.stdout.write(f'Email: {email}')
        self.stdout.write(f'Role: security_officer')
        self.stdout.write(f'Organization: {organization.name}')
        self.stdout.write(f'\nLogin API Endpoint: POST /api/security/login/')
        self.stdout.write(f'Request Body: {{"username": "{username}", "password": "{password}"}}')
        self.stdout.write(self.style.SUCCESS('='*60))


