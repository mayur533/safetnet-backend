import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from security_app.models import SOSAlert
from users.models import User
from django.utils import timezone
import random

# Get the security officer
officer = User.objects.get(username='officer001')

# Create test alerts
alert_types = ['emergency', 'security', 'general']
messages = [
    'Emergency assistance needed immediately',
    'Suspicious activity reported', 
    'General safety check required',
    'Medical emergency in progress',
    'Security breach detected'
]

print('Creating test alerts...')
for i in range(5):
    alert = SOSAlert.objects.create(
        user=officer,
        alert_type=random.choice(alert_types),
        message=random.choice(messages),
        location_lat=18.5204 + random.uniform(-0.1, 0.1),
        location_long=73.8567 + random.uniform(-0.1, 0.1),
        status='pending' if i < 3 else 'completed',
        created_at=timezone.now() - timezone.timedelta(hours=i)
    )
    print(f'Created alert {i+1}: {alert.alert_type} - {alert.status}')

print(f'Total alerts created: {SOSAlert.objects.count()}')
print(f'Active alerts: {SOSAlert.objects.filter(status="pending").count()}')
print(f'Resolved alerts: {SOSAlert.objects.filter(status="completed").count()}')
