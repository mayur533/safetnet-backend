#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from rest_framework.test import APIClient
from users.models import User
from django.contrib.auth import get_user_model

def test_delete_endpoint():
    print("Testing DELETE endpoint for SOS alerts...")

    # Get the security officer
    User = get_user_model()
    officer = User.objects.filter(role='security_officer').first()
    print(f'Officer: {officer.username if officer else "None"}')

    if not officer:
        print("No security officer found!")
        return

    client = APIClient()
    client.force_authenticate(user=officer)

    # Try to get SOS alerts first
    response = client.get('/api/security/sos/')
    print(f'GET /api/security/sos/ status: {response.status_code}')

    if hasattr(response.data, 'get') and 'results' in response.data:
        alerts = response.data['results']
    elif isinstance(response.data, list):
        alerts = response.data
    else:
        alerts = []

    print(f'GET response alerts count: {len(alerts)}')

    # Try to delete the first alert
    if response.status_code == 200 and alerts:
        alert_id = alerts[0]['id']
        print(f'Attempting to delete alert ID: {alert_id}')

        # First check if we can access this specific alert
        detail_response = client.get(f'/api/security/sos/{alert_id}/')
        print(f'GET /api/security/sos/{alert_id}/ status: {detail_response.status_code}')

        # Try DELETE
        delete_response = client.delete(f'/api/security/sos/{alert_id}/')
        print(f'DELETE status: {delete_response.status_code}')
        print(f'DELETE response: {delete_response.data}')

        # Check if it was actually deleted (soft delete)
        check_response = client.get(f'/api/security/sos/{alert_id}/')
        print(f'GET after DELETE status: {check_response.status_code}')

        # Check if it's in the main list
        list_response = client.get('/api/security/sos/')
        if hasattr(list_response.data, 'get') and 'results' in list_response.data:
            remaining_alerts = list_response.data['results']
        elif isinstance(list_response.data, list):
            remaining_alerts = list_response.data
        else:
            remaining_alerts = []

        print(f'Remaining alerts count: {len(remaining_alerts)}')
    else:
        print("No alerts found to delete")

if __name__ == '__main__':
    test_delete_endpoint()