#!/usr/bin/env python
"""
Script to add created_by_role field to SOSAlert model and update existing records
"""
import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.db import connection
from security_app.models import SOSAlert
from users.models import User

def main():
    print("🔧 Adding created_by_role field to SOSAlert...")
    
    # Check if migration already applied
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='security_app_sosalert';
        """)
        table_exists = cursor.fetchone()
        
        if table_exists:
            cursor.execute("PRAGMA table_info(security_app_sosalert);")
            columns = [row[1] for row in cursor.fetchall()]
            
            if 'created_by_role' not in columns:
                print("📝 Adding created_by_role column...")
                cursor.execute("""
                    ALTER TABLE security_app_sosalert 
                    ADD COLUMN created_by_role VARCHAR(10) DEFAULT 'USER';
                """)
                print("✅ Column added successfully")
            else:
                print("✅ created_by_role column already exists")
    
    # Update existing records based on user roles
    print("🔄 Updating existing SOSAlert records...")
    alerts_updated = 0
    
    for alert in SOSAlert.objects.all():
        if hasattr(alert.user, 'role') and alert.user.role == 'security_officer':
            alert.created_by_role = 'OFFICER'
            alerts_updated += 1
        else:
            alert.created_by_role = 'USER'
            alerts_updated += 1
        alert.save(update_fields=['created_by_role'])
    
    print(f"✅ Updated {alerts_updated} existing SOSAlert records")
    
    # Show summary
    user_alerts = SOSAlert.objects.filter(created_by_role='USER').count()
    officer_alerts = SOSAlert.objects.filter(created_by_role='OFFICER').count()
    total_alerts = SOSAlert.objects.count()
    
    print(f"\n📊 Summary:")
    print(f"   Total Alerts: {total_alerts}")
    print(f"   User Created: {user_alerts}")
    print(f"   Officer Created: {officer_alerts}")
    
    print("\n🎉 created_by_role field successfully added and populated!")

if __name__ == '__main__':
    main()
