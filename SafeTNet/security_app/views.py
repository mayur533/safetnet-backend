import logging
import traceback

# Set up logger
logger = logging.getLogger(__name__)

from rest_framework import viewsets, status, serializers
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
import math
from users.permissions import IsSuperAdminOrSubAdmin
from .models import SOSAlert, Case, Incident, OfficerProfile, Notification
# SecurityOfficer model removed - using User with role='security_officer' instead
from users.models import SecurityOfficer, Geofence
from django.shortcuts import get_object_or_404
from users_profile.models import LiveLocationShare, LiveLocationTrackPoint
from users_profile.serializers import LiveLocationShareSerializer, LiveLocationShareCreateSerializer
from users.models import Geofence
from users.serializers import GeofenceSerializer

from .permissions import IsSecurityOfficer
from .serializers import (
    SOSAlertSerializer,
    SOSAlertCreateSerializer,
    CaseSerializer,
    CaseCreateSerializer,
    CaseUpdateStatusSerializer,
    IncidentSerializer,
    NotificationSerializer,
    NotificationAcknowledgeSerializer,
    OfficerLoginSerializer,
    GeofenceSerializer,
)


class OfficerOnlyMixin:
    permission_classes = [IsAuthenticated, IsSecurityOfficer]


class SOSAlertViewSet(OfficerOnlyMixin, viewsets.ModelViewSet):
    queryset = SOSAlert.objects.filter(is_deleted=False)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'user']
    search_fields = ['user__username', 'user__email', 'message']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return SOSAlertCreateSerializer
        return SOSAlertSerializer

    def get_queryset(self):
        """
        Get queryset with expiry filtering and area-based alert handling.
        This implements the security requirement that expired alerts are not visible.
        """
        from django.utils import timezone
        
        user = self.request.user
        now = timezone.now()
        
        # Base queryset: non-deleted, non-expired alerts
        base_queryset = SOSAlert.objects.filter(
            is_deleted=False
        ).exclude(
            # Exclude expired area-based alerts
            alert_type='area_user_alert',
            expires_at__lt=now
        )

        # For Security Officers → show SOS alerts assigned to them or their geofence
        # Security officers are User records with role='security_officer'
        if user.role == 'security_officer':
            return base_queryset.filter(
                Q(assigned_officer=user) | Q(geofence__in=user.geofences.all())
            )

        # For Sub-Admins → show SOS alerts within their managed geofence
        elif hasattr(user, 'subadminprofile'):
            return base_queryset.filter(
                geofence=user.subadminprofile.geofence
            )

        # For Main Admins → see all active alerts (excluding expired)
        elif user.is_superuser:
            return base_queryset

        # For normal users → show only their own alerts (excluding expired area alerts sent to others)
        return base_queryset.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Override create to handle area-based user alerts with backend-authoritative logic.
        This method implements the core security requirements for evacuation alerts.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        alert_type = serializer.validated_data.get('alert_type', 'security')
        
        # Handle area-based user alerts with backend-authoritative logic
        if alert_type == 'area_user_alert':
            return self._create_area_user_alert(request, serializer)
        
        # Handle regular alerts with existing logic
        self.perform_create(serializer)
        instance = serializer.instance
        response_serializer = SOSAlertSerializer(instance)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def _create_area_user_alert(self, request, serializer):
        """
        Create an area-based user alert with backend-authoritative targeting.
        
        Security Rules:
        1. Officer identity comes from request.user only
        2. Geofences come from database relations only
        3. User targeting is based on GPS coordinates only
        4. All validation happens server-side
        """
        from django.utils import timezone
        from .geo_utils import (
            get_users_in_multiple_geofences,
            validate_gps_coordinates,
            calculate_geofence_center
        )
        
        try:
            # Step 1: Identify officer from authentication context ONLY
            officer = request.user
            if officer.role != 'security_officer':
                return Response({
                    'error': 'Unauthorized',
                    'detail': 'Only security officers can create area-based alerts'
                }, status=status.HTTP_403_FORBIDDEN)
            
            logger.info(f"🚨 AREA_USER_ALERT creation initiated by officer: {officer.username}")
            
            # Step 2: Validate GPS coordinates from alert data
            alert_lat = serializer.validated_data.get('location_lat')
            alert_lon = serializer.validated_data.get('location_long')
            
            if not validate_gps_coordinates(alert_lat, alert_lon):
                return Response({
                    'error': 'Invalid GPS coordinates',
                    'detail': 'Alert GPS coordinates are invalid or out of range'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Step 3: Check expiry time for area-based alerts
            expires_at = serializer.validated_data.get('expires_at')
            if expires_at and expires_at <= timezone.now():
                return Response({
                    'error': 'Invalid expiry time',
                    'detail': 'Area-based alerts cannot expire in the past'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Step 4: Load officer's assigned geofences from database ONLY
            officer_geofences = officer.geofences.filter(active=True)
            if not officer_geofences.exists():
                return Response({
                    'error': 'No assigned geofences',
                    'detail': 'Security officer has no active geofences assigned'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"📍 Officer has {officer_geofences.count()} assigned geofences")
            
            # Step 5: Identify users within officer's geofences using GPS coordinates
            affected_users = get_users_in_multiple_geofences(
                list(officer_geofences), 
                max_age_hours=24  # Only use fresh location data (24 hours)
            )
            
            affected_users_count = len(affected_users)
            logger.info(f"🎯 Identified {affected_users_count} users in officer's geofences")
            
            # Step 6: Create the alert with backend-authoritative data
            alert = serializer.save(
                user=officer,  # Officer creates the alert
                priority='high',  # Area-based alerts are always high priority
            )
            
            # Step 7: Update alert with area-based metadata
            alert.affected_users_count = affected_users_count
            alert.expires_at = expires_at
            alert.save(update_fields=['affected_users_count', 'expires_at'])
            
            logger.info(f"✅ Area-based alert created: ID={alert.id}, Users={affected_users_count}")
            
            # Step 8: Send push notifications ONLY to affected users
            if affected_users_count > 0:
                self._send_area_alert_notifications(alert, affected_users)
            else:
                logger.warning(f"⚠️ No users in geofences for alert {alert.id}")
            
            # Step 9: Return response with area-based metadata
            response_data = SOSAlertSerializer(alert).data
            response_data.update({
                'area_alert_metadata': {
                    'officer_id': officer.id,
                    'officer_name': officer.get_full_name() or officer.username,
                    'affected_users_count': affected_users_count,
                    'geofences_count': officer_geofences.count(),
                    'expires_at': expires_at.isoformat() if expires_at else None,
                    'notification_sent': alert.notification_sent,
                    'notification_sent_at': alert.notification_sent_at.isoformat() if alert.notification_sent_at else None
                }
            })
            
            headers = self.get_success_headers(response_data)
            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
            
        except Exception as e:
            logger.error(f"❌ Failed to create area-based alert: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({
                'error': 'Internal server error',
                'detail': 'Failed to create area-based alert'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _send_area_alert_notifications(self, alert, affected_users):
        """
        Send high-priority push notifications to affected users.
        This method implements the notification delivery security requirements.
        """
        from django.utils import timezone
        
        try:
            logger.info(f"📱 Sending notifications for alert {alert.id} to {len(affected_users)} users")
            
            # In a real implementation, this would integrate with your push notification service
            # For now, we'll simulate the notification sending and update the alert metadata
            
            notification_count = 0
            failed_notifications = []
            
            for user_location in affected_users:
                user = user_location.user
                
                try:
                    # Simulate push notification sending
                    # In production, replace this with actual push notification service call
                    # Example: send_push_notification(user, alert)
                    
                    logger.info(f"📤 Notification sent to user: {user.username}")
                    notification_count += 1
                    
                except Exception as e:
                    logger.error(f"❌ Failed to send notification to {user.username}: {str(e)}")
                    failed_notifications.append(user.username)
            
            # Update alert with notification metadata
            alert.notification_sent = True
            alert.notification_sent_at = timezone.now()
            alert.save(update_fields=['notification_sent', 'notification_sent_at'])
            
            logger.info(f"✅ Notifications sent: {notification_count}, Failed: {len(failed_notifications)}")
            
            if failed_notifications:
                logger.warning(f"⚠️ Failed notifications for users: {failed_notifications}")
                
        except Exception as e:
            logger.error(f"❌ Critical error in notification sending: {str(e)}")
            # Don't fail the alert creation if notifications fail, but log the error

    @action(detail=True, methods=['patch'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'resolved'
        alert.save()
        serializer = self.get_serializer(alert)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])

    # ✅ Allow officers to update any SOS (their own or others)
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    # ✅ Same for partial updates (PATCH)
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def active(self, request):
        qs = self.get_queryset().filter(status__in=['pending', 'accepted'])
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def resolved(self, request):
        qs = self.get_queryset().filter(status='resolved')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)



class CaseViewSet(OfficerOnlyMixin, viewsets.ModelViewSet):
    queryset = Case.objects.all()
    serializer_class = CaseSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'officer', 'sos_alert']
    search_fields = ['description', 'officer__name', 'sos_alert__user__username']
    ordering_fields = ['updated_at']
    ordering = ['-updated_at']

    def get_queryset(self):
        user = self.request.user
        # Only cases assigned to the current officer (user with role='security_officer')
        if user.role == 'security_officer':
            return Case.objects.filter(officer=user)
        return Case.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return CaseCreateSerializer
        elif self.action == 'update_status':
            return CaseUpdateStatusSerializer
        return CaseSerializer

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """
        Update case status (accept, reject, resolve)
        """
        case = self.get_object()
        
        # Verify the requesting officer is assigned to this case
        if request.user.role != 'security_officer':
            return Response({'detail': 'Only officers can update cases.'}, status=status.HTTP_403_FORBIDDEN)
        if case.officer != request.user:
            return Response({'detail': 'Only the assigned officer can update this case.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = CaseUpdateStatusSerializer(case, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_case = serializer.save()
        
        return Response(CaseSerializer(updated_case).data)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Officer accepts a case."""
        case = self.get_object()
        case.status = 'accepted'
        case.save(update_fields=['status'])
        return Response({'detail': 'Case accepted successfully.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Officer rejects a case."""
        case = self.get_object()
        case.status = 'open'  # or 'rejected' if you add that option in STATUS_CHOICES
        case.save(update_fields=['status'])
        return Response({'detail': 'Case rejected successfully.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark a case as resolved and also update the linked SOS alert."""
        case = self.get_object()
        case.status = 'resolved'
        case.save(update_fields=['status'])

        # Also mark the linked SOS alert as resolved
        if case.sos_alert:
            case.sos_alert.status = 'resolved'
            case.sos_alert.save(update_fields=['status'])

        return Response({'detail': 'Case resolved successfully.'}, status=status.HTTP_200_OK)



class NavigationView(OfficerOnlyMixin, APIView):
    def get(self, request):
        """
        Calculate route from officer location to target coordinates using GET parameters.
        Example: /api/navigation/?from_lat=18.5204&from_lng=73.8567&to_lat=18.5310&to_lng=73.8440
        """
        try:
            from_lat = float(request.query_params.get('from_lat'))
            from_lng = float(request.query_params.get('from_lng'))
            to_lat = float(request.query_params.get('to_lat'))
            to_lng = float(request.query_params.get('to_lng'))
        except (TypeError, ValueError):
            return Response({
                'error': 'Invalid or missing coordinates. Expected: from_lat, from_lng, to_lat, to_lng'
            }, status=status.HTTP_400_BAD_REQUEST)

        route_data = self._get_route_from_google_maps(from_lat, from_lng, to_lat, to_lng)

        if route_data.get('error'):
            return Response(route_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'from_location': {'lat': from_lat, 'lng': from_lng},
            'to_location': {'lat': to_lat, 'lng': to_lng},
            'route': route_data
        })

    def _get_route_from_google_maps(self, from_lat, from_lng, to_lat, to_lng):
        import requests
        from django.conf import settings

        api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
        if not api_key:
            return self._get_fallback_route(from_lat, from_lng, to_lat, to_lng)

        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            'origin': f"{from_lat},{from_lng}",
            'destination': f"{to_lat},{to_lng}",
            'key': api_key,
            'mode': 'driving',
            'units': 'metric'
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data.get('status') != 'OK':
                return {'error': f"Google Maps API error: {data.get('status', 'Unknown error')}"}

            route = data['routes'][0]
            leg = route['legs'][0]

            polyline = route['overview_polyline']['points']
            distance_km = leg['distance']['value'] / 1000
            duration_minutes = leg['duration']['value'] / 60

            steps = []
            for step in leg['steps']:
                steps.append({
                    'instruction': step['html_instructions'].replace('<b>', '').replace('</b>', ''),
                    'distance': step['distance']['text'],
                    'duration': step['duration']['text']
                })

            return {
                'distance_km': round(distance_km, 2),
                'duration_minutes': round(duration_minutes, 1),
                'polyline': polyline,
                'steps': steps,
                'summary': leg['distance']['text'] + ' - ' + leg['duration']['text']
            }

        except requests.RequestException as e:
            return {'error': f"Failed to connect to Google Maps API: {str(e)}"}
        except (KeyError, IndexError) as e:
            return {'error': f"Unexpected response format from Google Maps API: {str(e)}"}

    def _get_fallback_route(self, from_lat, from_lng, to_lat, to_lng):
        """
        Fallback route calculation using haversine distance if Google Maps API is unavailable.
        """
        distance_km = self.haversine_distance_km(from_lat, from_lng, to_lat, to_lng)
        eta_minutes = round((distance_km / 40.0) * 60) if distance_km else 0

        return {
            'distance_km': round(distance_km, 2),
            'duration_minutes': eta_minutes,
            'polyline': None,
            'steps': [
                'Head towards target using best available route',
                'Follow primary roads',
                'Adjust path as needed'
            ],
            'summary': f"{round(distance_km, 2)} km - Estimated {eta_minutes} minutes",
            'note': 'Route calculated using straight-line distance. For detailed directions, configure Google Maps API key.'
        }

    @staticmethod
    def haversine_distance_km(lat1, lon1, lat2, lon2):
        import math
        R = 6371  # Earth radius in km
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

class IncidentsView(OfficerOnlyMixin, APIView, PageNumberPagination):
    page_size_query_param = 'page_size'

    def get(self, request):
        # List incidents for logged-in officer, filterable by date range and status
        if request.user.role != 'security_officer':
            return Response({'detail': 'Only officers can view incidents.'}, status=status.HTTP_403_FORBIDDEN)

        qs = Incident.objects.filter(officer=request.user)

        # Filters
        status_param = request.query_params.get('status')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if status_param:
            qs = qs.filter(status=status_param)

        from django.utils.dateparse import parse_datetime
        start_dt = parse_datetime(start_date) if start_date else None
        end_dt = parse_datetime(end_date) if end_date else None
        if start_dt:
            qs = qs.filter(timestamp__gte=start_dt)
        if end_dt:
            qs = qs.filter(timestamp__lte=end_dt)

        page = self.paginate_queryset(qs.select_related('officer', 'sos_alert', 'case'), request, view=self)
        serializer = IncidentSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    def post(self, request):
        # Manually log a new incident
        if request.user.role != 'security_officer':
            return Response({'detail': 'Only officers can log incidents.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = IncidentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(officer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OfficerProfileView(OfficerOnlyMixin, APIView):
    def get(self, request):
        if request.user.role != 'security_officer':
            return Response({'detail': 'Only officers can view profile.'}, status=status.HTTP_403_FORBIDDEN)

        # Return User data instead of OfficerProfile data for compatibility with frontend
        user = request.user
        from users_profile.serializers import UserProfileSerializer

        # Create serializer context with request
        serializer = UserProfileSerializer(user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        if request.user.role != 'security_officer':
            return Response({'detail': 'Only officers can update profile.'}, status=status.HTTP_403_FORBIDDEN)

        # Update User data instead of OfficerProfile data
        user = request.user
        from users_profile.serializers import UserProfileSerializer

        serializer = UserProfileSerializer(user, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        # Update OfficerProfile if location data is provided
        if 'last_latitude' in request.data or 'last_longitude' in request.data:
            profile, _ = OfficerProfile.objects.select_related('officer').get_or_create(officer=user)
            if 'last_latitude' in request.data:
                profile.last_latitude = request.data['last_latitude']
            if 'last_longitude' in request.data:
                profile.last_longitude = request.data['last_longitude']
            profile.last_seen_at = timezone.now()
            profile.save(update_fields=['last_latitude', 'last_longitude', 'last_seen_at', 'updated_at'])

        return Response(UserProfileSerializer(instance, context={'request': request}).data)


class GeofenceCurrentView(OfficerOnlyMixin, APIView):
    """
    Get current security officer's assigned geofence.
    GET /api/security/geofence/
    """
    def get(self, request):
        """Get the assigned geofence for the current security officer"""
        try:
            officer = SecurityOfficer.objects.get(email=request.user.email)
        except SecurityOfficer.DoesNotExist:
            return Response({
                'error': 'Security officer profile not found',
                'detail': 'Officer not found for user.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if not officer.assigned_geofence:
            return Response({
                'error': 'No geofence assigned to this officer',
                'detail': 'This security officer does not have an assigned geofence area.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        geofence = officer.assigned_geofence
        serializer = GeofenceSerializer(geofence)
        return Response(serializer.data, status=status.HTTP_200_OK)


class GeofenceDetailView(OfficerOnlyMixin, APIView):
    """
    Get geofence details by ID.
    Verifies that the geofence is assigned to the requesting security officer.
    GET /api/security/geofence/{id}/
    """
    def get(self, request, geofence_id):
        """Get specific geofence by ID (only if assigned to the officer)"""
        try:
            officer = SecurityOfficer.objects.get(email=request.user.email)
        except SecurityOfficer.DoesNotExist:
            return Response({
                'error': 'Security officer profile not found',
                'detail': 'Officer not found for user.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify the requested geofence matches the officer's assignment
        if not officer.assigned_geofence or str(officer.assigned_geofence.id) != str(geofence_id):
            return Response({
                'error': 'You are not authorized to access this geofence',
                'detail': 'This geofence is not assigned to you.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        geofence = get_object_or_404(Geofence, id=geofence_id)
        serializer = GeofenceSerializer(geofence)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OfficerLoginView(APIView):
    """
    API endpoint for security officer login.
    
    Accepts POST request with username and password.
    Returns JWT access and refresh tokens along with user information.
    
    User must have role="security_officer" to login.
    
    Example request:
    {
        "username": "officer1@example.com",
        "password": "OfficerPassword123!"
    }
    
    Example response:
    {
        "access": "eyJhbGci...",
        "refresh": "eyJhbGci...",
        "user": {
            "id": 12,
            "username": "officer1@example.com",
            "email": "officer1@example.com",
            "role": "security_officer"
        }
    }
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        """Return API documentation for login endpoint"""
        return Response({
            'endpoint': '/api/security/login/',
            'method': 'POST',
            'description': 'Security Officer Login API',
            'requirements': {
                'user_role': 'security_officer',
                'user_status': 'is_active=True'
            },
            'request_body': {
                'username': 'string (required)',
                'password': 'string (required)'
            },
            'example_request': {
                'username': 'test_officer',
                'password': 'TestOfficer123!'
            },
            'response': {
                'access': 'JWT access token (string)',
                'refresh': 'JWT refresh token (string)',
                'user': {
                    'id': 'integer',
                    'username': 'string',
                    'email': 'string',
                    'role': 'security_officer'
                }
            },
            'curl_example': 'curl -X POST "https://your-domain.com/api/security/login/" -H "Content-Type: application/json" -d \'{"username": "test_officer", "password": "TestOfficer123!"}\''
        }, status=status.HTTP_200_OK)

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken
        import logging

        logger = logging.getLogger(__name__)

        # Log incoming request data (for debugging)
        logger.info(f"Officer login attempt - Request data: {request.data}")
        print(f"🔍 LOGIN REQUEST: {request.data}")

        try:
            # Validate input and authenticate using serializer
            serializer = OfficerLoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # Get authenticated user from serializer
            user = serializer.validated_data['user']
            logger.info(f"Officer login success - User: {user.username}, Role: {user.role}")
            print(f"✅ LOGIN SUCCESS: User {user.username} authenticated")

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            response_data = {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                }
            }

            print(f"✅ LOGIN RESPONSE: Tokens generated for {user.username}")
            return Response(response_data, status=status.HTTP_200_OK)

        except serializers.ValidationError as e:
            logger.warning(f"Officer login validation error: {e.detail}")
            print(f"❌ LOGIN VALIDATION ERROR: {e.detail}")
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Officer login unexpected error: {str(e)}")
            print(f"❌ LOGIN UNEXPECTED ERROR: {str(e)}")
            return Response({
                'error': 'Login failed',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationView(OfficerOnlyMixin, APIView, PageNumberPagination):
    page_size_query_param = 'page_size'

    def get(self, request):
        """List notifications for the logged-in officer (unread first)"""
        if request.user.role != 'security_officer':
            return Response({'detail': 'Only officers can view notifications.'}, status=status.HTTP_403_FORBIDDEN)

        # Get notifications, unread first
        notifications = Notification.objects.filter(officer=request.user).order_by('is_read', '-created_at')
        
        page = self.paginate_queryset(notifications, request, view=self)
        serializer = NotificationSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class NotificationAcknowledgeView(OfficerOnlyMixin, APIView):
    def post(self, request):
        """Mark notifications as read"""
        if request.user.role != 'security_officer':
            return Response({'detail': 'Only officers can mark notifications as read.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = NotificationAcknowledgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data['notification_ids']
        notifications = Notification.objects.filter(
            id__in=notification_ids,
            officer=request.user,
            is_read=False
        )
        
        updated_count = 0
        for notification in notifications:
            notification.mark_as_read()
            updated_count += 1
        
        return Response({
            'message': f'Marked {updated_count} notifications as read',
            'updated_count': updated_count
        })


class DashboardView(OfficerOnlyMixin, APIView):
    def get(self, request):
        """Get officer dashboard metrics"""
        if request.user.role != 'security_officer':
            return Response({'detail': 'Only officers can view dashboard.'}, status=status.HTTP_403_FORBIDDEN)
        
        officer = request.user

        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        
        # Total SOS alerts handled by this officer (only active, non-deleted)
        total_sos_handled = SOSAlert.objects.filter(
            assigned_officer=officer, 
            is_deleted=False
        ).count()
        
        # Active cases assigned to this officer
        active_cases = Case.objects.filter(officer=officer, status__in=['open', 'accepted']).count()
        
        # Resolved cases this week
        resolved_cases_week = Case.objects.filter(
            officer=officer,
            status='resolved',
            updated_at__gte=week_ago
        ).count()
        
        # Average response time (time from SOS creation to case acceptance)
        response_times = []
        resolved_cases = Case.objects.filter(
            officer=officer,
            status='resolved',
            sos_alert__isnull=False
        ).select_related('sos_alert')
        
        for case in resolved_cases:
            if case.sos_alert and case.updated_at:
                response_time = (case.updated_at - case.sos_alert.created_at).total_seconds() / 60  # minutes
                response_times.append(response_time)
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Unread notifications count
        unread_notifications = Notification.objects.filter(officer=officer, is_read=False).count()
        
        # Get officer name
        officer_name = f"{officer.first_name} {officer.last_name}".strip() or officer.username
        
        # Get recent alerts for dashboard
        recent_alerts = SOSAlert.objects.filter(
            Q(assigned_officer=officer) | Q(geofence__in=officer.geofences.all()),
            is_deleted=False
        ).order_by('-created_at')[:5]
        
        # Serialize recent alerts
        from .serializers import SOSAlertSerializer
        recent_alerts_data = SOSAlertSerializer(recent_alerts, many=True).data
        
        return Response({
            'officer_name': officer_name,
            'metrics': {
                'total_sos_handled': total_sos_handled,
                'active_cases': active_cases,
                'resolved_cases_this_week': resolved_cases_week,
                'average_response_time_minutes': round(avg_response_time, 1),
                'unread_notifications': unread_notifications
            },
            'recent_alerts': recent_alerts_data,
            'last_updated': now.isoformat()
        })


class OfficerLiveLocationShareView(OfficerOnlyMixin, APIView):
    """
    Security officer live location sharing endpoints.
    POST /api/security/live_location/start/ - Start live location sharing
    GET /api/security/live_location/ - Get active sessions
    """
    
    def post(self, request):
        """Start live location sharing for security officer"""
        if request.user.role != 'security_officer':
            return Response({'detail': 'Only officers can share location.'}, status=status.HTTP_403_FORBIDDEN)
        
        officer = request.user
        
        # Stop any existing active sessions
        LiveLocationShare.objects.filter(
            security_officer=officer,
            is_active=True
        ).update(is_active=False, stop_reason='user')
        
        serializer = LiveLocationShareCreateSerializer(data=request.data)
        if serializer.is_valid():
            duration_minutes = serializer.validated_data.get('duration_minutes', 1440)  # Default 24 hours for officers
            
            # Create live location share session
            expires_at = timezone.now() + timedelta(minutes=duration_minutes)
            live_share = LiveLocationShare.objects.create(
                security_officer=officer,
                expires_at=expires_at,
                last_broadcast_at=timezone.now(),
                plan_type='premium',  # Officers always get premium
            )
            
            # Create initial track point if provided
            initial_latitude = serializer.validated_data.get('initial_latitude')
            initial_longitude = serializer.validated_data.get('initial_longitude')
            if initial_latitude is not None and initial_longitude is not None:
                LiveLocationTrackPoint.objects.create(
                    share=live_share,
                    latitude=initial_latitude,
                    longitude=initial_longitude
                )
            
            return Response({
                'message': 'Live location sharing started',
                'session': LiveLocationShareSerializer(live_share).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request):
        """Get active live location sharing sessions for officer"""
        if request.user.role != 'security_officer':
            return Response({'detail': 'Only officers can view live location sessions.'}, status=status.HTTP_403_FORBIDDEN)
        
        officer = request.user
        
        sessions = LiveLocationShare.objects.filter(
            security_officer=officer,
            is_active=True,
            expires_at__gt=timezone.now()
        ).order_by('-started_at')
        
        serializer = LiveLocationShareSerializer(sessions, many=True)
        return Response({'sessions': serializer.data})


class OfficerLiveLocationShareDetailView(OfficerOnlyMixin, APIView):
    """
    Security officer live location sharing detail endpoints.
    PATCH /api/security/live_location/<session_id>/ - Update location
    DELETE /api/security/live_location/<session_id>/ - Stop sharing
    """
    
    def patch(self, request, session_id):
        """Update live location for security officer"""
        if request.user.role != 'security_officer':
            return Response({'detail': 'Only officers can update live location.'}, status=status.HTTP_403_FORBIDDEN)
        
        officer = request.user
        
        try:
            live_share = LiveLocationShare.objects.get(
                id=session_id,
                security_officer=officer
            )
        except LiveLocationShare.DoesNotExist:
            return Response({'error': 'Live location session not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if not live_share.is_active or live_share.expires_at <= timezone.now():
            live_share.is_active = False
            live_share.stop_reason = 'expired'
            live_share.save(update_fields=['is_active', 'stop_reason'])
            return Response({'error': 'Live location session has ended'}, status=status.HTTP_400_BAD_REQUEST)
        
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        
        if latitude is None or longitude is None:
            return Response({'error': 'latitude and longitude are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            lat = float(latitude)
            lng = float(longitude)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid latitude/longitude values'}, status=status.HTTP_400_BAD_REQUEST)
        
        live_share.current_location = {'latitude': lat, 'longitude': lng}
        live_share.last_broadcast_at = timezone.now()
        live_share.save(update_fields=['current_location', 'last_broadcast_at'])

        # Log track point once per minute
        last_track_point = live_share.track_points.order_by('-recorded_at').first()
        if not last_track_point or (timezone.now() - last_track_point.recorded_at) >= timedelta(minutes=1):
            LiveLocationTrackPoint.objects.create(
                share=live_share,
                latitude=lat,
                longitude=lng
            )
        
        return Response({'status': 'updated'}, status=status.HTTP_200_OK)
    
    def delete(self, request, session_id):
        """Stop live location sharing for security officer"""
        if request.user.role != 'security_officer':
            return Response({'detail': 'Only officers can stop live location sharing.'}, status=status.HTTP_403_FORBIDDEN)
        
        officer = request.user
        
        try:
            live_share = LiveLocationShare.objects.get(
                id=session_id,
                security_officer=officer
            )
        except LiveLocationShare.DoesNotExist:
            return Response({'error': 'Live location session not found'}, status=status.HTTP_404_NOT_FOUND)
        
        live_share.is_active = False
        live_share.expires_at = timezone.now()
        live_share.current_location = None
        live_share.stop_reason = 'user'
        live_share.save(update_fields=['is_active', 'expires_at', 'current_location', 'stop_reason'])
        return Response({'status': 'stopped'}, status=status.HTTP_200_OK)


class GeofenceCurrentView(OfficerOnlyMixin, APIView):
    """
    Get the current geofence assigned to the logged-in security officer.
    Returns empty data if no geofence is assigned (200 status, not 404).
    """
    def get(self, request):
        try:
            officer = request.user
            logger.info(f"Geofence request for officer: {officer.username} (ID: {officer.id})")

            # Get the most recently created geofence assigned to the officer
            geofences = officer.geofences.all()
            logger.info(f"Found {geofences.count()} geofences for officer {officer.username}")

            if not geofences.exists():
                logger.info(f"No geofence assigned to officer {officer.username}")
                return Response({
                    'data': None,
                    'message': 'No geofence assigned to this officer'
                }, status=status.HTTP_200_OK)

            # Return the most recently created geofence (ordered by creation date)
            geofence = geofences.order_by('-created_at').first()
            logger.info(f"Returning geofence: {geofence.name} (ID: {geofence.id}) for officer {officer.username}")

            serializer = GeofenceSerializer(geofence)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error in GeofenceCurrentView for user {request.user.username}: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({
                'error': 'An error occurred',
                'detail': 'Internal server error while fetching geofence'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GeofenceDetailView(OfficerOnlyMixin, APIView):
    """
    Get geofence details by ID.
    Only returns geofences that are assigned to the logged-in security officer.
    """
    def get(self, request, geofence_id):
        officer = request.user
        
        try:
            # Get the geofence by ID
            geofence = Geofence.objects.get(id=geofence_id)
            
            # Check if this geofence is assigned to the officer
            if officer not in geofence.associated_users.all():
                return Response(
                    {'error': 'Geofence not assigned to this officer'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Geofence.DoesNotExist:
            return Response(
                {'error': 'Geofence not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = GeofenceSerializer(geofence)
        return Response(serializer.data, status=status.HTTP_200_OK)

