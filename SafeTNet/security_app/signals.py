"""
Signals for security_app to handle cross-app data synchronization.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Case, SOSAlert, Notification
from .fcm_service import fcm_service
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender='users_profile.SOSEvent')
def sync_sos_event_to_security_alert(sender, instance, created, **kwargs):
    """
    Sync SOSEvent to SOSAlert when a new SOSEvent is created.
    Only sync on creation, not updates.
    """
    if not created:
        return
    
    # Skip if SOSAlert already exists for this SOSEvent
    from .models import SOSAlert
    if SOSAlert.objects.filter(source_sos_event=instance).exists():
        logger.info(f"SOSAlert already exists for SOSEvent {instance.id}, skipping sync")
        return
    
    try:
        from django.db import transaction
        with transaction.atomic():
            # Validate location data
            if not instance.location or not isinstance(instance.location, dict):
                logger.error(f"SOSEvent {instance.id} has invalid location data: {instance.location}")
                return
            
            # Support multiple coordinate key formats
            latitude = (instance.location.get('latitude') or 
                       instance.location.get('lat'))
            longitude = (instance.location.get('longitude') or 
                        instance.location.get('lng'))
            
            if latitude is None or longitude is None:
                logger.error(f"SOSEvent {instance.id} missing latitude/longitude in location data")
                return
            
            # Validate coordinates are numeric
            try:
                lat_float = float(latitude)
                lon_float = float(longitude)
            except (ValueError, TypeError):
                logger.error(f"SOSEvent {instance.id} has invalid coordinates: lat={latitude}, lon={longitude}")
                return
            
            # Create corresponding SOSAlert
            sos_alert = SOSAlert.objects.create(
                user=instance.user,
                created_by_role="USER",
                message=instance.notes or '',
                location_lat=lat_float,
                location_long=lon_float,
                status="pending",
                priority="high",
                source_sos_event=instance
            )
            
            logger.info(f"Successfully synced SOSEvent {instance.id} → SOSAlert {sos_alert.id}")
            
    except Exception as e:
        logger.exception(f"Failed to sync SOSEvent {instance.id} to SOSAlert: {str(e)}")
        # Do not re-raise to avoid breaking the original SOSEvent creation


@receiver(post_save, sender=Case)
def update_sos_alert_status_on_case_save(sender, instance, created, **kwargs):
    """
    Update SOSAlert status when Case status changes
    """
    if not created:  # Only on updates, not creation
        sos_alert = instance.sos_alert
        
        # Map case status to SOS alert status
        status_mapping = {
            'accepted': 'accepted',
            'resolved': 'resolved',
            'open': 'pending'  # Keep as pending if case is open
        }
        
        new_status = status_mapping.get(instance.status)
        if new_status and sos_alert.status != new_status:
            sos_alert.status = new_status
            sos_alert.save(update_fields=['status'])


@receiver(post_delete, sender=Case)
def update_sos_alert_status_on_case_delete(sender, instance, **kwargs):
    """
    Reset SOSAlert status to pending when Case is deleted
    """
    sos_alert = instance.sos_alert
    if sos_alert.status != 'pending':
        sos_alert.status = 'pending'
        sos_alert.save(update_fields=['status'])


@receiver(post_save, sender=SOSAlert)
def send_sos_alert_notification(sender, instance, created, **kwargs):
    """
    Send FCM notification when a new SOS alert is created
    """
    if created:  # Only for new SOS alerts
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Get all active security officers (Users with role='security_officer') in the same organization
        if instance.user.organization:
            officers = User.objects.filter(
                role='security_officer',
                organization=instance.user.organization,
                is_active=True
            )
        else:
            # If no organization, notify all active security officers
            officers = User.objects.filter(role='security_officer', is_active=True)
        
        # Create notifications and send FCM
        for officer in officers:
            # Create database notification
            notification = Notification.objects.create(
                officer=officer,
                title="New SOS Alert",
                message=f"SOS alert from {instance.user.username} at {instance.location_lat}, {instance.location_long}",
                notification_type='sos_alert',
                sos_alert=instance
            )
            
            # Send FCM push notification
            fcm_service.send_to_officer(
                officer=officer,
                title="🚨 New SOS Alert",
                body=f"Emergency alert from {instance.user.username}",
                data={
                    'type': 'sos_alert',
                    'sos_alert_id': str(instance.id),
                    'notification_id': str(notification.id),
                    'location': f"{instance.location_lat},{instance.location_long}"
                }
            )


@receiver(post_save, sender=Case)
def send_case_assignment_notification(sender, instance, created, **kwargs):
    """
    Send notification when a case is assigned to an officer
    """
    if created and instance.officer:  # Only for new cases with assigned officer
        # Create database notification
        notification = Notification.objects.create(
            officer=instance.officer,
            title="New Case Assigned",
            message=f"Case #{instance.id} assigned for SOS Alert #{instance.sos_alert.id}",
            notification_type='case_assigned',
            case=instance,
            sos_alert=instance.sos_alert
        )
        
        # Send FCM push notification
        fcm_service.send_to_officer(
            officer=instance.officer,
            title="📋 New Case Assigned",
            body=f"Case #{instance.id} - {instance.sos_alert.user.username if instance.sos_alert else 'Unknown user'}",
            data={
                'type': 'case_assigned',
                'case_id': str(instance.id),
                'sos_alert_id': str(instance.sos_alert.id) if instance.sos_alert else None,
                'notification_id': str(notification.id)
            }
        )
