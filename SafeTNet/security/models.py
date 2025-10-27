from django.db import models
from django.contrib.auth import get_user_model
from users.models import SecurityOfficer

User = get_user_model()


class SOSAlert(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('resolved', 'Resolved'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sos_alerts'
    )
    location_lat = models.FloatField(help_text="Latitude coordinate")
    location_long = models.FloatField(help_text="Longitude coordinate")
    message = models.TextField(
        blank=True, 
        null=True, 
        help_text="Optional message from the user"
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='active'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'SOS Alert'
        verbose_name_plural = 'SOS Alerts'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"SOS Alert from {self.user.username} at {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class Case(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('resolved', 'Resolved'),
    ]

    sos_alert = models.ForeignKey(
        SOSAlert,
        on_delete=models.CASCADE,
        related_name='cases'
    )
    assigned_officer = models.ForeignKey(
        SecurityOfficer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='security_cases'
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending'
    )
    notes = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Case'
        verbose_name_plural = 'Cases'
        ordering = ['-updated_at']

    def __str__(self):
        return f"Case #{self.id} for SOS {self.sos_alert_id} [{self.status}]"