#!/usr/bin/env python
import os
import django
import sys

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
import json

def test_login():
    print('=== Django Test Client Login Test ===')
    print()

    # Create test client
    client = Client()

    # Test login data
    login_data = {
        'username': 'officer001',
        'password': 'test123'
    }

    print('Testing login with Django test client...')
    response = client.post('/api/auth/login/', data=json.dumps(login_data),
                          content_type='application/json')

    print(f'Status Code: {response.status_code}')
    print(f'Content-Type: {response.get("Content-Type", "Not set")}')

    if response.status_code == 200:
        try:
            data = response.json()
            print()
            print('Response JSON:')
            for key, value in data.items():
                if 'token' in key.lower() or 'access' in key.lower() or 'refresh' in key.lower():
                    if isinstance(value, str) and len(value) > 20:
                        print(f'  {key}: {value[:20]}... (length: {len(value)})')
                    else:
                        print(f'  {key}: {value}')
                else:
                    print(f'  {key}: {value}')

            print()
            print('Token Analysis:')
            print(f'  access token present: {"access" in data}')
            print(f'  refresh token present: {"refresh" in data}')
            if 'access' in data:
                print(f'  access token length: {len(data["access"])}')
            if 'refresh' in data:
                print(f'  refresh token length: {len(data["refresh"])}')

        except json.JSONDecodeError as e:
            print(f'JSON decode error: {e}')
            print('Raw response:', response.content.decode()[:500])

    else:
        print('Login failed!')
        try:
            error = response.json()
            print(f'Error response: {error}')
        except:
            print(f'Raw error response: {response.content.decode()[:500]}')

    print()
    print('=== Test Complete ===')

if __name__ == '__main__':
    test_login()