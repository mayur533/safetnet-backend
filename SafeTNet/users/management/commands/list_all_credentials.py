from django.core.management.base import BaseCommand
from users.models import User


class Command(BaseCommand):
    help = 'List all users with complete credential information'

    def handle(self, *args, **options):
        users = User.objects.all().order_by('id')
        
        self.stdout.write('\n' + '='*100)
        self.stdout.write(self.style.SUCCESS('COMPLETE USER CREDENTIALS LIST'))
        self.stdout.write('='*100 + '\n')
        
        if not users.exists():
            self.stdout.write(self.style.WARNING('No users found in the system.'))
            return
        
        # Known passwords from seed data and created accounts
        known_passwords = {
            'superadmin': 'testpass123!',
            'subadmin1': 'testpass123!',
            'subadmin2': 'testpass123!',
            'user1': 'testpass123!',
            'user2': 'testpass123!',
            'security_officer_001': 'SecurityOfficer123!',
            'admin1': 'testpass123!',  # Common default
            'admin2': 'testpass123!',  # Common default
            'subadmin3': 'testpass123!',  # Common default
            # Common passwords that might have been used
            'john.doe': 'testpass123',
            'premium1': 'testpass123',
            'premium2': 'testpass123',
            'free1': 'testpass123',
            'free2': 'testpass123',
            'free3': 'testpass123',
            'sos.user': 'testpass123',
        }
        
        credentials_table = []
        
        for user in users:
            password = known_passwords.get(user.username, '[UNKNOWN - Hashed in DB]')
            
            credentials_table.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'password': password,
                'role': user.role,
                'organization': user.organization.name if user.organization else 'None',
                'is_active': user.is_active,
                'full_name': f'{user.first_name} {user.last_name}'.strip() or 'N/A'
            })
            
            full_name = f'{user.first_name} {user.last_name}'.strip() or 'N/A'
            self.stdout.write(self.style.SUCCESS(f'\n[{user.id}] {user.username}'))
            self.stdout.write(f'  Email: {user.email}')
            self.stdout.write(f'  Full Name: {full_name}')
            self.stdout.write(f'  Role: {user.role}')
            self.stdout.write(f'  Organization: {user.organization.name if user.organization else "None"}')
            self.stdout.write(f'  Is Active: {user.is_active}')
            if password != '[UNKNOWN - Hashed in DB]':
                self.stdout.write(self.style.SUCCESS(f'  Password: {password}'))
            else:
                self.stdout.write(self.style.WARNING(f'  Password: {password}'))
            self.stdout.write('-'*100)
        
        # Summary table
        self.stdout.write('\n\n' + '='*100)
        self.stdout.write(self.style.SUCCESS('CREDENTIALS SUMMARY TABLE'))
        self.stdout.write('='*100)
        self.stdout.write(f'\n{"ID":<5} {"Username":<25} {"Password":<30} {"Role":<20} {"Organization":<25}')
        self.stdout.write('-'*100)
        
        for cred in credentials_table:
            password_display = cred['password'][:28] if len(cred['password']) > 28 else cred['password']
            self.stdout.write(
                f'{cred["id"]:<5} '
                f'{cred["username"]:<25} '
                f'{password_display:<30} '
                f'{cred["role"]:<20} '
                f'{cred["organization"][:24]:<25}'
            )
        
        # Statistics
        self.stdout.write('\n\n' + '='*100)
        self.stdout.write(self.style.SUCCESS('STATISTICS'))
        self.stdout.write('='*100)
        self.stdout.write(f'Total Users: {users.count()}')
        
        role_counts = {}
        known_pwd_count = 0
        for user in users:
            role_counts[user.role] = role_counts.get(user.role, 0) + 1
            if user.username in known_passwords:
                known_pwd_count += 1
        
        for role, count in role_counts.items():
            self.stdout.write(f'{role}: {count}')
        
        self.stdout.write(f'\nUsers with known passwords: {known_pwd_count}/{users.count()}')
        
        # Quick reference
        self.stdout.write('\n\n' + '='*100)
        self.stdout.write(self.style.SUCCESS('QUICK REFERENCE - ALL KNOWN CREDENTIALS'))
        self.stdout.write('='*100 + '\n')
        
        for cred in credentials_table:
            if cred['password'] != '[UNKNOWN - Hashed in DB]':
                self.stdout.write(
                    f'{self.style.SUCCESS(cred["username"]):<25} '
                    f'{self.style.WARNING(cred["password"]):<30} '
                    f'({cred["role"]})'
                )
        
        self.stdout.write('\n' + '='*100 + '\n')

