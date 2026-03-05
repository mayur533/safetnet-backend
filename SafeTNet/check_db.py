import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SafeTNet.settings')
django.setup()

from django.db import connection

try:
    cursor = connection.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    print("Database Tables:")
    for table in tables:
        print(f"  - {table}")
    
    print(f"\nTotal tables: {len(tables)}")
    print(f"Database engine: {connection.vendor}")
    print(f"Database name: {connection.settings_dict['NAME']}")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    connection.close()
