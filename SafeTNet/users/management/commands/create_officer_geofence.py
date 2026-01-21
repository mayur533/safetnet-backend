from django.core.management.base import BaseCommand
from users.models import User, Organization, Geofence

class Command(BaseCommand):
    help = 'Create a geofence for security officer officer001 with specified coordinates'

    def handle(self, *args, **options):
        """Create geofence for officer001 with the specified coordinates."""

        # Geofence coordinates provided by user
        # Point 1: 18.64739, 73.78467
        # Point 2: 18.64739, 73.78446
        # Point 3: 18.64706, 73.78468
        # Point 4: 18.64705, 73.78445

        # Format as GeoJSON polygon (note: GeoJSON uses [longitude, latitude])
        # Close the polygon by repeating the first point
        # Reorder the original points to form a square shape
        # Original points: (18.64739,73.78467), (18.64739,73.78446), (18.64706,73.78468), (18.64705,73.78445)
        # Reordered for square: top-left, top-right, bottom-right, bottom-left
        coordinates = [
            [
                [73.78445, 18.64739],  # Top-left: use min lng, max lat (original range)
                [73.78467, 18.64739],  # Top-right: use max lng, max lat (original range)
                [73.78468, 18.64705],  # Bottom-right: use max lng, min lat (original range)
                [73.78446, 18.64705],  # Bottom-left: use min lng, min lat (original range)
                [73.78445, 18.64739]   # Close polygon with first point
            ]
        ]

        geojson_polygon = {
            "type": "Polygon",
            "coordinates": coordinates
        }

        try:
            # Get or create organization
            org, created = Organization.objects.get_or_create(
                name='Default Organization',
                defaults={'description': 'Default organization for SafeTNet'}
            )
            if created:
                self.stdout.write(self.style.SUCCESS('Created default organization'))
            else:
                self.stdout.write('Using existing organization')

            # Find the security officer
            try:
                officer = User.objects.get(username='officer001', role='security_officer')
                self.stdout.write(self.style.SUCCESS(f'Found security officer: {officer.username}'))
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR("Security officer 'officer001' not found"))
                return

            # Create the geofence with the correct name
            geofence_name = f"Jay Ganesh Vision"
            geofence = Geofence.objects.create(
                name=geofence_name,
                description=f"Assigned security patrol area for officer {officer.username}",
                polygon_json=geojson_polygon,
                organization=org,
                active=True,
                created_by=officer if officer.role == 'SUB_ADMIN' else None
            )

            self.stdout.write(self.style.SUCCESS(f'Created geofence: {geofence.name}'))
            self.stdout.write(f'   Coordinates: {len(coordinates[0])-1} points')  # -1 because we repeat first point

            # Assign geofence to officer
            officer.geofences.add(geofence)
            officer.save()

            self.stdout.write(self.style.SUCCESS(f'Assigned geofence to officer: {officer.username}'))
            self.stdout.write(f'   Officer now has {officer.geofences.count()} geofence(s) assigned')

            # Display geofence details
            self.stdout.write("\nGeofence Details:")
            self.stdout.write(f"   Name: {geofence.name}")
            self.stdout.write(f"   Organization: {geofence.organization.name}")
            self.stdout.write("   Coordinates:")
            for i, coord in enumerate(coordinates[0][:-1], 1):  # Exclude closing point
                self.stdout.write(".6f")

            self.stdout.write("\nSUCCESS: Geofence successfully created and assigned to officer001!")
            self.stdout.write("   You should now be able to see this geofence on the geofence map page.")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating geofence: {e}'))
            import traceback
            traceback.print_exc()