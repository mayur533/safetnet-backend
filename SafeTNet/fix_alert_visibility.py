#!/usr/bin/env python
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from security_app.models import SOSAlert
from django.contrib.auth import get_user_model

User = get_user_model()

print('🔧 FIXING ALERT VISIBILITY ISSUE')

# Get the first security officer
officer = User.objects.filter(role='security_officer').first()
if officer:
    print(f'🔧 Found officer: {officer.username} (ID: {officer.id})')
    
    # Get officer's first geofence
    geofence = officer.geofences.first()
    geofence_name = geofence.name if geofence else "NONE"
    print(f'🔧 Using geofence: {geofence_name}')
    
    # Update all alerts to be visible to this officer
    updated = SOSAlert.objects.filter(assigned_officer__isnull=True).update(
        assigned_officer=officer,
        geofence=geofence
    )
    print(f'✅ Updated {updated} alerts to be visible to officer {officer.username}')
    
    # Verify the fix
    total = SOSAlert.objects.count()
    with_officer = SOSAlert.objects.filter(assigned_officer__isnull=False).count()
    print(f'📊 Verification: {with_officer}/{total} alerts now have assigned_officer')
    
else:
    print('❌ No security officer found')

print('🎯 FIX COMPLETE!')
