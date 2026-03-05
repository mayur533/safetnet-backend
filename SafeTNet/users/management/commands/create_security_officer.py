from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import User

class Command(BaseCommand):
    help = 'Create a security officer user'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, required=True, help='Username for the security officer')
        parser.add_argument('--email', type=str, required=True, help='Email for the security officer')
        parser.add_argument('--password', type=str, required=True, help='Password for the security officer')
        parser.add_argument('--first-name', type=str, default='Security', help='First name')
        parser.add_argument('--last-name', type=str, default='Officer', help='Last name')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']

        self.stdout.write(
            self.style.SUCCESS(f'Creating Security Officer: {username}')
        )

        try:
            # Check if user already exists
            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.ERROR(f'User "{username}" already exists!')
                )
                return

            if User.objects.filter(email=email).exists():
                self.stdout.write(
                    self.style.ERROR(f'User with email "{email}" already exists!')
                )
                return

            # Create the user with security_officer role
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,  # Plain password will be hashed by create_user
                role='security_officer',
                first_name=first_name,
                last_name=last_name,
                is_active=True,
                is_staff=False,
                is_superuser=False
            )
            
            # Hash password properly using Django's built-in method
            user.set_password(password)
            user.save()

            self.stdout.write(
                self.style.SUCCESS('Security Officer created successfully!')
            )
            self.stdout.write(f'   Username: {username}')
            self.stdout.write(f'   Email: {email}')
            self.stdout.write(f'   Role: {user.role}')
            self.stdout.write(f'   Name: {user.first_name} {user.last_name}')
            self.stdout.write(f'   Active: {user.is_active}')

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating security officer: {str(e)}')
            )