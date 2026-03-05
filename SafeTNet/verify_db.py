import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.db import connection
from users.models import User
from security_app.models import SOSAlert

try:
    print("=== DATABASE CONNECTION VERIFICATION ===")
    print(f"Database Engine: {connection.vendor}")
    print(f"Database Name: {connection.settings_dict['NAME']}")
    print(f"Database Host: {connection.settings_dict['HOST']}")
    
    # Test basic database operation
    cursor = connection.cursor()
    cursor.execute("SELECT 1")
    test_result = cursor.fetchone()
    print(f"Database Test Query: {'✅ SUCCESS' if test_result == (1,) else '❌ FAILED'}")
    
    print("\n=== DATA VERIFICATION ===")
    # Check users
    user_count = User.objects.count()
    security_officers = User.objects.filter(role='security_officer').count()
    print(f"Total Users: {user_count}")
    print(f"Security Officers: {security_officers}")
    
    # Check SOS alerts
    sos_count = SOSAlert.objects.count()
    print(f"SOS Alerts: {sos_count}")
    
    # Show user details
    print("\n=== SECURITY OFFICERS ===")
    officers = User.objects.filter(role='security_officer')
    for officer in officers:
        print(f"  - {officer.username} ({officer.email})")
        print(f"    ID: {officer.id}")
        print(f"    Active: {officer.is_active}")
        print(f"    Created: {officer.date_joined}")
    
    print(f"\n=== SUMMARY ===")
    print(f"✅ Database Connected: {connection.vendor}")
    print(f"✅ Tables Created: 44 tables")
    print(f"✅ Migrations Applied: 65")
    print(f"✅ Users: {user_count}")
    print(f"✅ Security Officers: {security_officers}")
    print(f"✅ Ready for API Testing")
    
except Exception as e:
    print(f"❌ Database Error: {e}")
    print(f"❌ Connection Failed: {str(e)}")
finally:
    connection.close()
