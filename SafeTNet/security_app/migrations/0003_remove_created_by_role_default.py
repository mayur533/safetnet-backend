# Generated migration to remove default from created_by_role

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('security_app', '0002_add_created_by_role_to_sosalert'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sosalert',
            name='created_by_role',
            field=models.CharField(
                choices=[('USER', 'User'), ('OFFICER', 'Officer')],
                help_text='Role of the user who created this alert',
                max_length=10
            ),
        ),
    ]
