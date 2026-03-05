# Generated migration for adding source_sos_event field to SOSAlert

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users_profile', '0001_initial'),
        ('security_app', '0009_fix_created_by_role_for_existing_alerts'),
    ]

    operations = [
        migrations.AddField(
            model_name='sosalert',
            name='source_sos_event',
            field=models.OneToOneField(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='users_profile.sosevent',
                related_name='linked_alert'
            ),
        ),
    ]
