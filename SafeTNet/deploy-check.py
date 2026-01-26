#!/usr/bin/env python
"""
Deployment check script for SafeTNet Django backend.
Run this to verify configuration before deployment.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.conf import settings
from django.db import connection

def check_database():
    """Check database configuration and connection."""
    print("DATABASE CHECK")
    print("=" * 50)

    db_config = settings.DATABASES['default']
    print(f"Engine: {db_config.get('ENGINE', 'Unknown')}")
    print(f"Name: {db_config.get('NAME', 'Unknown')}")
    print(f"Host: {db_config.get('HOST', 'Unknown')}")
    print(f"Port: {db_config.get('PORT', 'Unknown')}")
    print(f"User: {db_config.get('USER', 'Unknown')}")

    # Test connection
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        print("Database connection successful")
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False

    return True

def check_environment():
    """Check environment variables."""
    print("\nENVIRONMENT CHECK")
    print("=" * 50)

    env_vars = ['DEBUG', 'RENDER', 'DATABASE_URL', 'SECRET_KEY']
    for var in env_vars:
        value = os.getenv(var)
        if var == 'DATABASE_URL' and value:
            # Mask sensitive info
            masked = value[:30] + "..." if len(value) > 30 else value
            print(f"{var}: {masked}")
        else:
            print(f"{var}: {value}")

def check_settings():
    """Check Django settings."""
    print("\nDJANGO SETTINGS CHECK")
    print("=" * 50)

    print(f"DEBUG: {settings.DEBUG}")
    print(f"SECRET_KEY: {'Set' if settings.SECRET_KEY else 'Not set'}")
    print(f"ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
    print(f"INSTALLED_APPS count: {len(settings.INSTALLED_APPS)}")

def main():
    print("SafeTNet Deployment Check")
    print("=" * 50)

    check_environment()
    check_settings()
    db_ok = check_database()

    print("\n" + "=" * 50)
    if db_ok:
        print("Deployment check passed!")
        print("Ready for deployment")
    else:
        print("Deployment check failed!")
        print("Fix database issues before deploying")
        sys.exit(1)

if __name__ == '__main__':
    main()