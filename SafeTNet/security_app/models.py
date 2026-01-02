from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from users.models import Geofence


User = get_user_model()


class SOSAlert(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('resolved', 'Resolved'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='security_app_sos_alerts'
    )
    geofence = models.ForeignKey(
        Geofence,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sos_alerts'
    )
    location_lat = models.FloatField()
    location_long = models.FloatField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    assigned_officer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_security_app_alerts',
        limit_choices_to={'role': 'security_officer'},
        help_text="Security officer assigned to this SOS alert (User with role='security_officer')"
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'SOS Alert'
        verbose_name_plural = 'SOS Alerts'

    def __str__(self):
        return f"SOSAlert #{self.id} ({self.status})"


class Case(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('accepted', 'Accepted'),
        ('resolved', 'Resolved'),
    ]

    sos_alert = models.ForeignKey(
        SOSAlert,
        on_delete=models.CASCADE,
        related_name='cases'
    )
    officer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_cases',
        limit_choices_to={'role': 'security_officer'},
        help_text="Security officer assigned to this case (User with role='security_officer')"
    )
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Case'
        verbose_name_plural = 'Cases'

    def __str__(self):
        return f"Case #{self.id} for SOS {self.sos_alert_id} [{self.status}]"


class OfficerProfile(models.Model):
    """Lightweight profile for security officer runtime attributes."""
    officer = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='officer_profile',
        limit_choices_to={'role': 'security_officer'},
        help_text="Security officer user (User with role='security_officer')"
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text='Phone number or mobile phone for the security officer'
    )
    on_duty = models.BooleanField(default=True)
    last_latitude = models.FloatField(null=True, blank=True)
    last_longitude = models.FloatField(null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    battery_level = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        officer_name = f"{self.officer.first_name} {self.officer.last_name}".strip() or self.officer.username
        return f"Profile({officer_name}) on_duty={self.on_duty}"

    def update_location(self, latitude=None, longitude=None, battery_level=None):
        """Convenience helper for officer apps to update runtime telemetry."""
        if latitude is not None and longitude is not None:
            self.last_latitude = latitude
            self.last_longitude = longitude
            self.last_seen_at = timezone.now()
        if battery_level is not None:
            self.battery_level = max(0, min(100, int(battery_level)))
        self.save(update_fields=['last_latitude', 'last_longitude', 'last_seen_at', 'battery_level', 'updated_at'])


class Incident(models.Model):
    STATUS_CHOICES = [
        ('resolved', 'Resolved'),
        ('manual', 'Manual'),
    ]

    officer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='security_app_incidents',
        limit_choices_to={'role': 'security_officer'},
        help_text="Security officer who reported this incident (User with role='security_officer')"
    )
    sos_alert = models.ForeignKey(
        SOSAlert,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidents'
    )
    case = models.ForeignKey(
        Case,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidents'
    )
    description = models.TextField(blank=True, null=True)
    location_lat = models.FloatField(blank=True, null=True)
    location_long = models.FloatField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='resolved')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Incident'
        verbose_name_plural = 'Incidents'

    def __str__(self):
        return f"Incident #{self.id} ({self.status})"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('sos_alert', 'SOS Alert'),
        ('case_assigned', 'Case Assigned'),
        ('case_resolved', 'Case Resolved'),
        ('system', 'System'),
    ]

    officer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='security_app_notifications',
        limit_choices_to={'role': 'security_officer'},
        help_text="Security officer who should receive this notification (User with role='security_officer')"
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='system')
    is_read = models.BooleanField(default=False)
    sos_alert = models.ForeignKey(
        SOSAlert,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'

    def __str__(self):
        officer_name = f"{self.officer.first_name} {self.officer.last_name}".strip() or self.officer.username if self.officer else "Unknown"
        return f"Notification for {officer_name}: {self.title}"

    def mark_as_read(self):
        from django.utils import timezone
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=['is_read', 'read_at'])
