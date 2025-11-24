"""
New API endpoints for additional features
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
from .views import _is_user_premium
import json

# Nearby Help Map API
@api_view(['GET'])
@permission_classes([permissions.AllowAny])  # Allow anyone to see nearby help
def nearby_help_map(request):
    """
    Get nearby emergency services (hospitals, police stations, etc.)
    GET /api/users/nearby_help/?latitude=40.7128&longitude=-74.0060&radius=5000
    """
    latitude_str = request.query_params.get('latitude')
    longitude_str = request.query_params.get('longitude')
    radius_str = request.query_params.get('radius', '5000')  # Default 5km
    
    try:
        latitude = float(latitude_str) if latitude_str else None
        longitude = float(longitude_str) if longitude_str else None
        radius = int(radius_str) if radius_str else 5000
    except (ValueError, TypeError):
        latitude = None
        longitude = None
        radius = 5000
    
    if not latitude or not longitude:
        return Response(
            {'error': 'Latitude and longitude are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Mock data - In production, use Google Places API or similar
    nearby_places = [
        {
            'id': 1,
            'name': 'City Hospital',
            'type': 'hospital',
            'latitude': latitude + 0.01,
            'longitude': longitude + 0.01,
            'distance': 1.2,
            'phone': '+1234567890',
            'address': '123 Main St'
        },
        {
            'id': 2,
            'name': 'Police Station',
            'type': 'police',
            'latitude': latitude - 0.01,
            'longitude': longitude + 0.01,
            'distance': 1.5,
            'phone': '+1234567891',
            'address': '456 Oak Ave'
        },
        {
            'id': 3,
            'name': 'Fire Department',
            'type': 'fire',
            'latitude': latitude + 0.02,
            'longitude': longitude - 0.01,
            'distance': 2.1,
            'phone': '+1234567892',
            'address': '789 Pine Rd'
        }
    ]
    
    return Response({
        'places': nearby_places,
        'user_location': {'latitude': latitude, 'longitude': longitude},
        'radius': radius
    })


# Safety Tips Feed API
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def safety_tips_feed(request):
    """
    Get safety tips feed
    GET /api/users/safety_tips/
    """
    tips = [
        {
            'id': 1,
            'title': 'Stay Alert in Public Places',
            'content': 'Always be aware of your surroundings, especially in crowded areas. Trust your instincts if something feels wrong.',
            'category': 'general',
            'image_url': None
        },
        {
            'id': 2,
            'title': 'Share Your Location',
            'content': 'Let trusted contacts know where you are, especially when traveling alone or to unfamiliar places.',
            'category': 'location',
            'image_url': None
        },
        {
            'id': 3,
            'title': 'Emergency Contacts Ready',
            'content': 'Keep your emergency contacts updated and easily accessible. Test your SOS button regularly.',
            'category': 'emergency',
            'image_url': None
        },
        {
            'id': 4,
            'title': 'Night Safety Tips',
            'content': 'When walking at night, stay in well-lit areas, avoid shortcuts, and keep your phone charged.',
            'category': 'night_safety',
            'image_url': None
        },
        {
            'id': 5,
            'title': 'Trust Your Instincts',
            'content': 'If a situation feels unsafe, leave immediately. It\'s better to be cautious than sorry.',
            'category': 'general',
            'image_url': None
        }
    ]
    
    category = request.query_params.get('category')
    if category:
        tips = [tip for tip in tips if tip['category'] == category]
    
    return Response({
        'tips': tips,
        'total': len(tips)
    })


# Emergency Response Center API (Premium)
class EmergencyResponseCenterView(APIView):
    """
    Emergency Response Center Integration (Premium only)
    POST /api/users/<user_id>/emergency_response/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        """Connect to emergency response center."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Emergency Response Center is a Premium feature. Upgrade to Premium for 24x7 support.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get location from request
        location = request.data.get('location', {})
        message = request.data.get('message', 'Emergency assistance needed')
        
        # In production, connect to actual emergency response center
        return Response({
            'message': 'Connected to Emergency Response Center',
            'response_id': f'ERC-{timezone.now().timestamp()}',
            'status': 'active',
            'estimated_response_time': '2-5 minutes',
            'location': location
        }, status=status.HTTP_200_OK)


# Trusted Circle Feature API (Premium)
class TrustedCircleView(APIView):
    """
    Trusted Circle Feature (Premium only)
    GET /api/users/<user_id>/trusted_circle/
    POST /api/users/<user_id>/trusted_circle/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        """Get trusted circle members."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Trusted Circle is a Premium feature. Upgrade to Premium to use this feature.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get trusted circle members (family contacts with trusted circle flag)
        from .models import FamilyContact
        trusted_members = FamilyContact.objects.filter(user=user)
        
        return Response({
            'members': [
                {
                    'id': member.id,
                    'name': member.name,
                    'phone': member.phone,
                    'relationship': member.relationship,
                    'can_track': True,
                    'can_receive_checkins': True
                }
                for member in trusted_members
            ]
        })
    
    def post(self, request, user_id):
        """Add member to trusted circle or send check-in."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Trusted Circle is a Premium feature.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        action = request.data.get('action')  # 'checkin' or 'add_member'
        
        if action == 'checkin':
            location = request.data.get('location', {})
            return Response({
                'message': 'Check-in sent to trusted circle',
                'timestamp': timezone.now().isoformat(),
                'location': location
            })
        
        return Response({'message': 'Action completed'}, status=status.HTTP_200_OK)


# Custom Alert Messages API (Premium)
class CustomAlertMessagesView(APIView):
    """
    Custom Alert Messages (Premium only)
    GET /api/users/<user_id>/custom_alerts/
    POST /api/users/<user_id>/custom_alerts/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        """Get custom alert messages."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Custom Alert Messages is a Premium feature.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Return user's custom messages
        return Response({
            'messages': [
                {
                    'id': 1,
                    'title': 'Default Emergency',
                    'message': 'I need help immediately. My location is being shared.',
                    'is_default': True
                }
            ]
        })
    
    def post(self, request, user_id):
        """Create or update custom alert message."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Custom Alert Messages is a Premium feature.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        title = request.data.get('title')
        message = request.data.get('message')
        
        return Response({
            'id': 1,
            'title': title,
            'message': message,
            'created_at': timezone.now().isoformat()
        }, status=status.HTTP_201_CREATED)


# AI Threat Detection API (Premium)
class AIThreatDetectionView(APIView):
    """
    AI Threat Detection (Premium only)
    POST /api/users/<user_id>/ai_threat_detection/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        """Detect threats using AI analysis."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'AI Threat Detection is a Premium feature. Upgrade to Premium to use this feature.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get sensor data from request
        accelerometer_data = request.data.get('accelerometer', {})
        audio_data = request.data.get('audio', {})
        location_data = request.data.get('location', {})
        
        # Mock AI analysis - In production, use actual ML model
        threat_score = 0.0
        threats_detected = []
        
        # Analyze accelerometer for sudden movements
        if accelerometer_data:
            x = accelerometer_data.get('x', 0)
            y = accelerometer_data.get('y', 0)
            z = accelerometer_data.get('z', 0)
            magnitude = (x**2 + y**2 + z**2)**0.5
            if magnitude > 15:  # Threshold for sudden movement
                threat_score += 0.3
                threats_detected.append({
                    'type': 'abnormal_movement',
                    'severity': 'medium',
                    'description': 'Sudden movement pattern detected'
                })
        
        # Analyze audio for loud sounds
        if audio_data:
            decibels = audio_data.get('decibels', 0)
            if decibels > 80:  # Threshold for loud sound
                threat_score += 0.4
                threats_detected.append({
                    'type': 'loud_sound',
                    'severity': 'high',
                    'description': 'Unusually loud sound detected'
                })
        
        # Analyze location for route deviation
        if location_data:
            # In production, compare with expected route
            threat_score += 0.1
        
        should_alert = threat_score > 0.5
        
        return Response({
            'threat_detected': should_alert,
            'threat_score': round(threat_score, 2),
            'threats': threats_detected,
            'recommendation': 'trigger_sos' if should_alert else 'monitor',
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)


# Audio/Video Recording API (Premium)
class RecordingView(APIView):
    """
    Audio/Video Recording Management (Premium only)
    POST /api/users/<user_id>/recordings/
    GET /api/users/<user_id>/recordings/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        """Upload recording (audio/video) for SOS event."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Audio/Video Recording is a Premium feature.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        recording_type = request.data.get('type')  # 'audio' or 'video'
        sos_event_id = request.data.get('sos_event_id')
        file_url = request.data.get('file_url')  # URL to uploaded file
        
        # In production, handle file upload and store in cloud storage
        # For now, return mock response
        recording_url = f'https://storage.example.com/recordings/{user_id}/{timezone.now().timestamp()}.{recording_type}'
        
        # Update SOS event with recording URL
        if sos_event_id:
            try:
                from .models import SOSEvent
                sos_event = SOSEvent.objects.get(id=sos_event_id, user=user)
                if recording_type == 'audio':
                    sos_event.audio_recording_url = recording_url
                elif recording_type == 'video':
                    sos_event.video_recording_url = recording_url
                sos_event.save()
            except SOSEvent.DoesNotExist:
                pass
        
        return Response({
            'recording_id': f'rec-{timezone.now().timestamp()}',
            'type': recording_type,
            'url': recording_url,
            'uploaded_at': timezone.now().isoformat()
        }, status=status.HTTP_201_CREATED)
    
    def get(self, request, user_id):
        """Get recordings for user."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Audio/Video Recording is a Premium feature.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        from .models import SOSEvent
        # Get all SOS events for user, filter in Python to check for recordings
        sos_events = SOSEvent.objects.filter(user=user)
        
        recordings = []
        for event in sos_events:
            if event.audio_recording_url:
                recordings.append({
                    'id': event.id,
                    'type': 'audio',
                    'url': event.audio_recording_url,
                    'sos_event_id': event.id,
                    'created_at': event.triggered_at.isoformat()
                })
            if event.video_recording_url:
                recordings.append({
                    'id': event.id,
                    'type': 'video',
                    'url': event.video_recording_url,
                    'sos_event_id': event.id,
                    'created_at': event.triggered_at.isoformat()
                })
        
        return Response({
            'recordings': recordings,
            'total': len(recordings)
        })


# Cloud Backup API (Premium)
class CloudBackupView(APIView):
    """
    Cloud Backup Management (Premium only)
    POST /api/users/<user_id>/cloud_backup/
    GET /api/users/<user_id>/cloud_backup/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        """Create cloud backup for SOS event."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Cloud Backup is a Premium feature.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        sos_event_id = request.data.get('sos_event_id')
        
        # In production, backup SOS event data to cloud storage
        backup_url = f'https://backup.example.com/sos/{user_id}/{sos_event_id}/{timezone.now().timestamp()}.backup'
        
        if sos_event_id:
            try:
                from .models import SOSEvent
                sos_event = SOSEvent.objects.get(id=sos_event_id, user=user)
                sos_event.cloud_backup_url = backup_url
                sos_event.save()
            except SOSEvent.DoesNotExist:
                return Response(
                    {'error': 'SOS event not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response({
            'backup_id': f'backup-{timezone.now().timestamp()}',
            'url': backup_url,
            'created_at': timezone.now().isoformat(),
            'status': 'completed'
        }, status=status.HTTP_201_CREATED)
    
    def get(self, request, user_id):
        """Get cloud backups for user."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Cloud Backup is a Premium feature.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        from .models import SOSEvent
        sos_events = SOSEvent.objects.filter(
            user=user
        ).exclude(cloud_backup_url__isnull=True).exclude(cloud_backup_url='')
        
        backups = [
            {
                'id': event.id,
                'sos_event_id': event.id,
                'url': event.cloud_backup_url,
                'created_at': event.triggered_at.isoformat()
            }
            for event in sos_events
        ]
        
        return Response({
            'backups': backups,
            'total': len(backups)
        })


# Panic Mode Automation API (Premium)
class PanicModeAutomationView(APIView):
    """
    Panic Mode Automation (Premium only)
    POST /api/users/<user_id>/panic_mode/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        """Start panic mode automation."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Panic Mode Automation is a Premium feature.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        location = request.data.get('location', {})
        duration_seconds = request.data.get('duration', 300)  # Default 5 minutes
        
        # In production, this would:
        # 1. Start continuous location tracking
        # 2. Start audio recording
        # 3. Send updates every 5 seconds to emergency contacts
        # 4. Create SOS event
        
        return Response({
            'panic_mode_id': f'panic-{timezone.now().timestamp()}',
            'status': 'active',
            'duration_seconds': duration_seconds,
            'update_interval': 5,  # Send updates every 5 seconds
            'features': [
                'continuous_location_tracking',
                'audio_recording',
                'live_feed_to_contacts',
                'automatic_sos_trigger'
            ],
            'started_at': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)


# Multi-device Sync API (Premium)
class MultiDeviceSyncView(APIView):
    """
    Multi-device Sync (Premium only)
    GET /api/users/<user_id>/devices/
    POST /api/users/<user_id>/devices/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        """Get synced devices for user."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Multi-device Sync is a Premium feature.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # In production, track devices in database
        # For now, return mock data
        return Response({
            'devices': [
                {
                    'id': 'device-1',
                    'name': 'iPhone 14',
                    'type': 'mobile',
                    'last_sync': timezone.now().isoformat(),
                    'is_active': True
                },
                {
                    'id': 'device-2',
                    'name': 'Apple Watch',
                    'type': 'wearable',
                    'last_sync': (timezone.now() - timedelta(minutes=5)).isoformat(),
                    'is_active': True
                }
            ],
            'total': 2
        })
    
    def post(self, request, user_id):
        """Register a new device for sync."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Multi-device Sync is a Premium feature.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        device_name = request.data.get('device_name', 'Unknown Device')
        device_type = request.data.get('device_type', 'mobile')
        device_id = request.data.get('device_id', f'device-{timezone.now().timestamp()}')
        
        return Response({
            'device_id': device_id,
            'name': device_name,
            'type': device_type,
            'registered_at': timezone.now().isoformat(),
            'status': 'active'
        }, status=status.HTTP_201_CREATED)

