from django.core.management.base import BaseCommand
from users.models import User


class Command(BaseCommand):
    help = 'List all users with their credentials (known passwords from seed data)'

    def handle(self, *args, **options):
        users = User.objects.all().order_by('id')
        
        self.stdout.write('\n' + '='*80)
        self.stdout.write(self.style.SUCCESS('ALL USERS IN THE SYSTEM'))
        self.stdout.write('='*80 + '\n')
        
        if not users.exists():
            self.stdout.write(self.style.WARNING('No users found in the system.'))
            return
        
        for user in users:
            self.stdout.write(self.style.SUCCESS(f'\nUser ID: {user.id}'))
            self.stdout.write(f'Username: {user.username}')
            self.stdout.write(f'Email: {user.email}')
            self.stdout.write(f'Full Name: {user.first_name} {user.last_name}')
            self.stdout.write(f'Role: {user.role}')
            self.stdout.write(f'Organization: {user.organization.name if user.organization else "None"}')
            self.stdout.write(f'Is Active: {user.is_active}')
            self.stdout.write(f'Is Staff: {user.is_staff}')
            self.stdout.write(f'Date Joined: {user.date_joined}')
            
            # Known passwords from initial_data.json and common defaults
            known_password = None
            if user.username in ['superadmin', 'subadmin1', 'subadmin2', 'user1', 'user2']:
                known_password = 'testpass123!'
            elif user.username == 'security_officer_001':
                known_password = 'SecurityOfficer123!'
            
            if known_password:
                self.stdout.write(self.style.SUCCESS(f'Password (from seed data): {known_password}'))
            else:
                self.stdout.write(self.style.WARNING('Password: [Hashed - not retrievable]'))
            
            self.stdout.write('-'*80)
        
        self.stdout.write('\n' + '='*80)
        self.stdout.write(self.style.SUCCESS('SUMMARY'))
        self.stdout.write('='*80)
        self.stdout.write(f'Total Users: {users.count()}')
        
        role_counts = {}
        for user in users:
            role_counts[user.role] = role_counts.get(user.role, 0) + 1
        
        for role, count in role_counts.items():
            self.stdout.write(f'{role}: {count}')
        
        self.stdout.write('\n' + '='*80)
        self.stdout.write(self.style.SUCCESS('KNOWN CREDENTIALS FROM SEED DATA'))
        self.stdout.write('='*80)
        self.stdout.write('These passwords are known from initial_data.json and created accounts:')
        self.stdout.write('\nDefault Users (password: testpass123!):')
        default_users = users.filter(username__in=['superadmin', 'subadmin1', 'subadmin2', 'user1', 'user2'])
        for user in default_users:
            self.stdout.write(f'  - {user.username} ({user.role})')
        
        security_officers = users.filter(username='security_officer_001')
        if security_officers.exists():
            self.stdout.write('\nSecurity Officers (password: SecurityOfficer123!):')
            for user in security_officers:
                self.stdout.write(f'  - {user.username} ({user.role})')
        
        self.stdout.write('\n' + '='*80 + '\n')




