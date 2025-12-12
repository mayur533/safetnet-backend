from django.core.management.base import BaseCommand
from users.models import User, SecurityOfficer, Geofence, Organization


class Command(BaseCommand):
    help = 'Assign a geofence (area) to a security officer'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            required=True,
            help='Username of the security officer',
        )
        parser.add_argument(
            '--geofence-name',
            type=str,
            help='Name of the geofence to assign (creates if not exists)',
        )
        parser.add_argument(
            '--geofence-id',
            type=int,
            help='ID of existing geofence to assign',
        )

    def handle(self, *args, **options):
        username = options['username']
        geofence_name = options.get('geofence_name')
        geofence_id = options.get('geofence_id')
        
        # Get the user
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ User "{username}" not found'))
            return
        
        if user.role != 'security_officer':
            self.stdout.write(self.style.ERROR(f'❌ User "{username}" is not a security officer (role: {user.role})'))
            return
        
        # Get or create SecurityOfficer record
        try:
            officer = SecurityOfficer.objects.get(username=username)
        except SecurityOfficer.DoesNotExist:
            # Create SecurityOfficer record if it doesn't exist
            if not user.organization:
                self.stdout.write(self.style.ERROR(f'❌ User "{username}" has no organization. Cannot create SecurityOfficer.'))
                return
            officer = SecurityOfficer.objects.create(
                username=username,
                name=f"{user.first_name} {user.last_name}".strip() or user.username,
                email=user.email,
                organization=user.organization,
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS(f'✅ Created SecurityOfficer record for {username}'))
        
        # Get or create geofence
        geofence = None
        if geofence_id:
            try:
                geofence = Geofence.objects.get(id=geofence_id)
                self.stdout.write(self.style.SUCCESS(f'✅ Found existing geofence: {geofence.name}'))
            except Geofence.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'❌ Geofence with ID {geofence_id} not found'))
                return
        elif geofence_name:
            # Check if geofence exists
            geofence = Geofence.objects.filter(name=geofence_name, organization=user.organization).first()
            
            if not geofence:
                # Create new geofence for Pune PCMC area
                if 'pune' in geofence_name.lower() or 'pcmc' in geofence_name.lower():
                    # Pune PCMC approximate coordinates
                    # Creating a polygon around Pune PCMC area
                    pune_pcmc_polygon = {
                        "type": "Polygon",
                        "coordinates": [[
                            [73.7500, 18.5000],  # Southwest
                            [73.9500, 18.5000],  # Southeast
                            [73.9500, 18.5500],  # Northeast
                            [73.7500, 18.5500],  # Northwest
                            [73.7500, 18.5000]   # Close polygon
                        ]]
                    }
                    
                    geofence = Geofence.objects.create(
                        name=geofence_name,
                        description=f"Geofence covering {geofence_name} area",
                        polygon_json=pune_pcmc_polygon,
                        organization=user.organization,
                        active=True,
                        created_by=user
                    )
                    self.stdout.write(self.style.SUCCESS(f'✅ Created new geofence: {geofence_name}'))
                else:
                    self.stdout.write(self.style.ERROR(f'❌ Geofence "{geofence_name}" not found. Please create it first or use --geofence-id'))
                    return
        else:
            self.stdout.write(self.style.ERROR('❌ Please provide either --geofence-name or --geofence-id'))
            return
        
        # Assign geofence to officer
        officer.assigned_geofence = geofence
        officer.save()
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('GEOFENCE ASSIGNMENT SUCCESSFUL!'))
        self.stdout.write('='*60)
        self.stdout.write(f'Security Officer: {officer.name} ({username})')
        self.stdout.write(f'Assigned Geofence: {geofence.name}')
        self.stdout.write(f'Organization: {officer.organization.name}')
        self.stdout.write(f'Geofence ID: {geofence.id}')
        self.stdout.write('='*60 + '\n')


