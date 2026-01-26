@echo off
SET DATABASE_URL=postgresql://neondb_owner:npg_Q6V0LwCybNvY@ep-red-queen-ahjbhshv-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
cd SafeTNet
python manage.py migrate
pause