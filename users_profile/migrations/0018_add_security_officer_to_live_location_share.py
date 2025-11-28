from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users_profile', '0017_live_share_plan_and_reason'),
        ('users', '0001_initial'),  # Adjust if needed based on your users app migrations
    ]

    operations = [
        migrations.AlterField(
            model_name='livelocationshare',
            name='user',
            field=models.ForeignKey(
                blank=True,
                help_text='User sharing their location (null if security_officer is set)',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='live_location_sessions',
                to='users.user'
            ),
        ),
        migrations.AddField(
            model_name='livelocationshare',
            name='security_officer',
            field=models.ForeignKey(
                blank=True,
                help_text='Security officer sharing their location (null if user is set)',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='live_location_sessions',
                to='users.securityofficer'
            ),
        ),
        migrations.AddConstraint(
            model_name='livelocationshare',
            constraint=models.CheckConstraint(
                check=models.Q(('user__isnull', False), ('security_officer__isnull', True)) | models.Q(('user__isnull', True), ('security_officer__isnull', False)),
                name='user_or_security_officer_required'
            ),
        ),
    ]

