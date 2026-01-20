#!/usr/bin/env python
"""
Script to create a security officer user in the SafeTNet database.
Run this with: python manage.py shell < create_security_officer.py
"""

import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import User

def create_security_officer():
    """Create a security officer user with the specified credentials."""

    # User credentials
    username = 'officer001'
    email = 'officer001@safetnet.com'
    password = 'test123'

    try:
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            print(f"❌ User '{username}' already exists!")
            return False

        if User.objects.filter(email=email).exists():
            print(f"❌ User with email '{email}' already exists!")
            return False

        # Create the user with security_officer role
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role='security_officer',
            first_name='Security',
            last_name='Officer',
            is_active=True,
            is_staff=False,
            is_superuser=False
        )

        print("✅ Security Officer created successfully!")
        print(f"   Username: {username}")
        print(f"   Email: {email}")
        print(f"   Role: {user.role}")
        print(f"   Name: {user.first_name} {user.last_name}")
        print(f"   Active: {user.is_active}")

        return True

    except Exception as e:
        print(f"❌ Error creating security officer: {str(e)}")
        return False

if __name__ == '__main__':
    print("🚔 SafeTNet Security Officer Creation Script")
    print("=" * 50)
    create_security_officer()