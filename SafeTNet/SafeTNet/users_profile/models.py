from django.db import models
from django.core.validators import RegexValidator
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


# -------------------- Custom User Manager --------------------
class UserProfileManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)

        if password:
            user.set_password(password)

        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


# -------------------- Custom User Model --------------------
class User(AbstractBaseUser):
    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True)

    plantype = models.CharField(max_length=20, default="free")
    planexpiry = models.DateField(null=True, blank=True)

    latitude = models.FloatField(null=True, blank=True)  # NEW
    longitude = models.FloatField(null=True, blank=True) # NEW
    last_location_update = models.DateTimeField(null=True, blank=True) # NEW

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserProfileManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    def __str__(self):
        return self.email

    def set_location(self, longitude, latitude):
        self.longitude = longitude
        self.latitude = latitude
        self.last_location_update = timezone.now()
        self.save()

    def get_location_dict(self):
        return {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "last_updated": self.last_location_update,
        }

# -------------------- Family Contact --------------------
class FamilyContact(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="family_contacts"
    )
    name = models.CharField(max_length=150)
    phone = models.CharField(
        max_length=15,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message="Phone must be +999999999 format."
            )
        ]
    )
    relationship = models.CharField(max_length=50, blank=True)
    is_primary = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "phone"]

    def save(self, *args, **kwargs):
        if self.is_primary:
            FamilyContact.objects.filter(
                user=self.user,
                is_primary=True
            ).exclude(id=self.id).update(is_primary=False)

        # Limit 3 contacts per user
        if not self.pk and FamilyContact.objects.filter(user=self.user).count() >= 3:
            raise ValueError("Maximum 3 family contacts allowed")

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.phone}"


# -------------------- Community Membership --------------------
class CommunityMembership(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="community_memberships"
    )
    community_id = models.CharField(max_length=100)
    community_name = models.CharField(max_length=200)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ["user", "community_id"]

    def __str__(self):
        return f"{self.user.email} -> {self.community_name}"


# -------------------- SOS Event --------------------
class SOSEvent(models.Model):
    STATUS_CHOICES = [
        ("triggered", "Triggered"),
        ("sms_sent", "SMS Sent"),
        ("police_called", "Police Called"),
        ("geofence_alerted", "Geofence Alerted"),
        ("resolved", "Resolved"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sos_events"
    )
    location = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="triggered")
    triggered_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"SOS by {self.user.email} at {self.triggered_at}"

# -------------------- User Devices --------------------
class UserDevice(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='devices')
    device_id = models.CharField(max_length=255, unique=True)
    device_type = models.CharField(max_length=50, choices=[('android','Android'), ('ios','iOS')])
    last_active = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} -> {self.device_type} ({self.device_id})"


# -------------------- Notifications --------------------
class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} -> {self.user.email}"


# -------------------- Geofence Zones --------------------
class GeofenceZone(models.Model):
    name = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    radius_meters = models.FloatField(default=100)

    def __str__(self):
        return f"{self.name} ({self.latitude}, {self.longitude})"

