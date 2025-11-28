#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Reset password for free user
free_user = User.objects.filter(email='freeuser@example.com').first()
if free_user:
    free_user.set_password('testpass123')
    free_user.save()
    print(f'✓ Password reset for freeuser@example.com')
    print(f'  Password check: {free_user.check_password("testpass123")}')
else:
    print('✗ freeuser@example.com not found')

# Reset password for premium user
premium_user = User.objects.filter(email='premiumuser@example.com').first()
if premium_user:
    premium_user.set_password('testpass123')
    premium_user.save()
    print(f'✓ Password reset for premiumuser@example.com')
    print(f'  Password check: {premium_user.check_password("testpass123")}')
else:
    print('✗ premiumuser@example.com not found')


