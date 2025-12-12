from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import SecurityOfficer
from security_app.models import OfficerProfile, SOSAlert, Case, Incident, Notification
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = 'Delete a security officer user and all related records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            required=True,
            help='Username of the security officer to delete',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force deletion without confirmation',
        )

    def handle(self, *args, **options):
        username = options['username']
        force = options.get('force', False)
        
        self.stdout.write(self.style.WARNING('\n' + '='*80))
        self.stdout.write(self.style.WARNING(f'DELETING SECURITY OFFICER: {username}'))
        self.stdout.write('='*80 + '\n')
        
        # Check if user exists
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ User "{username}" does not exist'))
            return
        
        # Check if it's a security officer
        if user.role != 'security_officer':
            self.stdout.write(self.style.ERROR(f'❌ User "{username}" is not a security officer (role: {user.role})'))
            return
        
        # Show what will be deleted
        self.stdout.write(f'📋 User Details:')
        self.stdout.write(f'   Username: {user.username}')
        self.stdout.write(f'   Email: {user.email}')
        self.stdout.write(f'   Role: {user.role}')
        self.stdout.write(f'   Is Active: {user.is_active}')
        
        # Check SecurityOfficer
        try:
            officer = SecurityOfficer.objects.get(username=username)
            self.stdout.write(f'\n👮 SecurityOfficer:')
            self.stdout.write(f'   Name: {officer.name}')
            self.stdout.write(f'   Geofence: {officer.assigned_geofence.name if officer.assigned_geofence else "None"}')
            
            # Count related records
            profile_count = OfficerProfile.objects.filter(officer=officer).count()
            sos_count = SOSAlert.objects.filter(assigned_officer=officer).count()
            case_count = Case.objects.filter(officer=officer).count()
            incident_count = Incident.objects.filter(officer=officer).count()
            notification_count = Notification.objects.filter(officer=officer).count()
            
            self.stdout.write(f'\n📊 Related Records:')
            self.stdout.write(f'   OfficerProfile: {profile_count}')
            self.stdout.write(f'   SOS Alerts: {sos_count}')
            self.stdout.write(f'   Cases: {case_count}')
            self.stdout.write(f'   Incidents: {incident_count}')
            self.stdout.write(f'   Notifications: {notification_count}')
            
        except SecurityOfficer.DoesNotExist:
            self.stdout.write(f'\n👮 SecurityOfficer: Not found')
            officer = None
        
        # Confirmation
        if not force:
            self.stdout.write(self.style.WARNING('\n⚠️  WARNING: This will permanently delete:'))
            self.stdout.write('   - User account')
            self.stdout.write('   - SecurityOfficer profile')
            self.stdout.write('   - OfficerProfile')
            self.stdout.write('   - All related SOS alerts, cases, incidents, and notifications')
            self.stdout.write(self.style.ERROR('\nThis action cannot be undone!'))
            
            confirm = input('\nType "DELETE" to confirm: ')
            if confirm != 'DELETE':
                self.stdout.write(self.style.SUCCESS('❌ Deletion cancelled'))
                return
        
        # Perform deletion
        try:
            with transaction.atomic():
                # Delete related records first
                if officer:
                    # Delete notifications
                    Notification.objects.filter(officer=officer).delete()
                    self.stdout.write(self.style.SUCCESS(f'✅ Deleted {notification_count} notifications'))
                    
                    # Delete incidents
                    Incident.objects.filter(officer=officer).delete()
                    self.stdout.write(self.style.SUCCESS(f'✅ Deleted {incident_count} incidents'))
                    
                    # Delete cases
                    Case.objects.filter(officer=officer).delete()
                    self.stdout.write(self.style.SUCCESS(f'✅ Deleted {case_count} cases'))
                    
                    # Unassign SOS alerts (set assigned_officer to None instead of deleting)
                    sos_updated = SOSAlert.objects.filter(assigned_officer=officer).update(assigned_officer=None)
                    if sos_updated > 0:
                        self.stdout.write(self.style.SUCCESS(f'✅ Unassigned {sos_updated} SOS alerts'))
                    
                    # Delete OfficerProfile
                    OfficerProfile.objects.filter(officer=officer).delete()
                    self.stdout.write(self.style.SUCCESS(f'✅ Deleted OfficerProfile'))
                    
                    # Delete SecurityOfficer
                    officer.delete()
                    self.stdout.write(self.style.SUCCESS(f'✅ Deleted SecurityOfficer profile'))
                
                # Delete User (this will cascade delete other related records)
                user.delete()
                self.stdout.write(self.style.SUCCESS(f'✅ Deleted User account'))
                
                self.stdout.write(self.style.SUCCESS('\n' + '='*80))
                self.stdout.write(self.style.SUCCESS('✅ SECURITY OFFICER DELETED SUCCESSFULLY'))
                self.stdout.write('='*80 + '\n')
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error during deletion: {str(e)}'))
            self.stdout.write(self.style.ERROR('Transaction rolled back. No changes were made.'))
            raise

