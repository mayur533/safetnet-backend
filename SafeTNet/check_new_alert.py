import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from security_app.models import SOSAlert
from users.models import User

# Get the officer
officer = User.objects.get(username='officer001')

# Get the most recent alerts
recent_alerts = SOSAlert.objects.all().order_by('-created_at')[:10]
print(f'Total alerts in database: {SOSAlert.objects.count()}')
print(f'\nMost recent alerts:')
for i, alert in enumerate(recent_alerts):
    print(f'  {i+1}. ID: {alert.id}, Type: {alert.alert_type}, Status: {alert.status}')
    print(f'     Message: {alert.message[:50]}...')
    print(f'     Created: {alert.created_at}')
    print(f'     User: {alert.user.username}')
    print(f'     Assigned Officer: {alert.assigned_officer}')
    print(f'     Geofence: {alert.geofence.name if alert.geofence else "None"}')
    print()

# Check if the new alert (ID 40) exists
try:
    new_alert = SOSAlert.objects.get(id=40)
    print(f'\n✅ New alert ID 40 found in database:')
    print(f'   Type: {new_alert.alert_type}')
    print(f'   Status: {new_alert.status}')
    print(f'   Message: {new_alert.message}')
    print(f'   User: {new_alert.user.username}')
    print(f'   Assigned Officer: {new_alert.assigned_officer}')
    print(f'   Geofence: {new_alert.geofence.name if new_alert.geofence else "None"}')
    
    # Check if officer can see this alert
    can_see = (
        (new_alert.assigned_officer == officer) or 
        (new_alert.geofence and new_alert.geofence in officer.geofences.all())
    )
    print(f'\n🔍 Officer can see this alert: {can_see}')
    
    if not can_see:
        print('❌ REASON: Alert is not assigned to officer AND not in officer\'s geofence')
        if new_alert.assigned_officer:
            print(f'   Assigned to: {new_alert.assigned_officer.username}')
        if new_alert.geofence:
            print(f'   Alert geofence: {new_alert.geofence.name}')
        print(f'   Officer geofences: {[g.name for g in officer.geofences.all()]}')
    
except SOSAlert.DoesNotExist:
    print('\n❌ New alert ID 40 not found in database')
