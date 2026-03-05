# Generated migration for adding created_by_role to SOSAlert

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('security_app', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='sosalert',
            name='created_by_role',
            field=models.CharField(
                choices=[('USER', 'User'), ('OFFICER', 'Officer')],
                default='USER',
                help_text='Role of the user who created this alert',
                max_length=10
            ),
        ),
    ]
