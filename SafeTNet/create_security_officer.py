#!/usr/bin/env python
"""
Script to create a security officer user account.
This creates a User with role='security_officer' that can be used with the login API.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from users.models import User, Organization, SecurityOfficer

def create_security_officer():
    """Create a security officer user account"""
    
    # Get or create an organization (use the first one, or create a default one)
    try:
        organization = Organization.objects.first()
        if not organization:
            organization = Organization.objects.create(
                name="Default Organization",
                description="Default organization for security officers"
            )
            print(f"✅ Created default organization: {organization.name}")
        else:
            print(f"✅ Using existing organization: {organization.name}")
    except Exception as e:
        print(f"❌ Error getting organization: {e}")
        return None
    
    # Security officer credentials
    username = "security_officer_001"
    password = "SecurityOfficer123!"
    email = "security.officer@safetnet.com"
    first_name = "Security"
    last_name = "Officer"
    
    # Check if user already exists
    if User.objects.filter(username=username).exists():
        print(f"⚠️  User '{username}' already exists. Updating password...")
        user = User.objects.get(username=username)
        user.set_password(password)
        user.role = 'security_officer'
        user.is_active = True
        user.organization = organization
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.save()
        print(f"✅ Updated existing user '{username}'")
    else:
        # Create new user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='security_officer',
            organization=organization,
            is_active=True
        )
        print(f"✅ Created new security officer user: {username}")
    
    # Optionally create SecurityOfficer record
    try:
        security_officer, created = SecurityOfficer.objects.get_or_create(
            username=username,
            defaults={
                'name': f"{first_name} {last_name}",
                'email': email,
                'contact': '+1234567890',
                'organization': organization,
                'is_active': True,
                'password': user.password  # Store hashed password
            }
        )
        if created:
            print(f"✅ Created SecurityOfficer record")
        else:
            print(f"ℹ️  SecurityOfficer record already exists")
    except Exception as e:
        print(f"⚠️  Could not create SecurityOfficer record: {e}")
    
    print("\n" + "="*60)
    print("SECURITY OFFICER CREDENTIALS")
    print("="*60)
    print(f"Username: {username}")
    print(f"Password: {password}")
    print(f"Email: {email}")
    print(f"Role: security_officer")
    print(f"Organization: {organization.name}")
    print("\nLogin API Endpoint: POST /api/security/login/")
    print("="*60)
    
    return user

if __name__ == '__main__':
    try:
        create_security_officer()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)



