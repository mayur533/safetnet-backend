from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination

from users.permissions import IsSuperAdminOrSubAdmin
from security.models import Case as LegacyCase
from .models import SOSAlert, Case, Incident, OfficerProfile, Notification
from security.utils import haversine_distance_km
from users.models import SecurityOfficer

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
        user = self.request.user
        # Only alerts assigned to this officer; default to organization fallback if no assignment
        try:
            officer = SecurityOfficer.objects.get(email=user.email)
            return SOSAlert.objects.filter(is_deleted=False, assigned_officer=officer, status__in=['pending', 'accepted'])
        except SecurityOfficer.DoesNotExist:
            if getattr(user, 'organization_id', None):
                return SOSAlert.objects.filter(is_deleted=False, user__organization_id=user.organization_id, status__in=['pending', 'accepted'])
            return SOSAlert.objects.none()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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

    def update(self, request, *args, **kwargs):
        # Only assigned officer can update
        alert = self.get_object()
        try:
            officer = SecurityOfficer.objects.get(email=request.user.email)
        except SecurityOfficer.DoesNotExist:
            return Response({'detail': 'Only the assigned officer may update this alert.'}, status=status.HTTP_403_FORBIDDEN)
        if alert.assigned_officer_id and alert.assigned_officer_id != officer.id:
            return Response({'detail': 'Only the assigned officer may update this alert.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        # Enforce same rule on PATCH
        alert = self.get_object()
        try:
            officer = SecurityOfficer.objects.get(email=request.user.email)
        except SecurityOfficer.DoesNotExist:
            return Response({'detail': 'Only the assigned officer may update this alert.'}, status=status.HTTP_403_FORBIDDEN)
        if alert.assigned_officer_id and alert.assigned_officer_id != officer.id:
            return Response({'detail': 'Only the assigned officer may update this alert.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def active(self, request):
        qs = self.get_queryset().filter(status='active')
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
        # Only cases assigned to the current officer
        try:
            officer = SecurityOfficer.objects.get(email=user.email)
            return Case.objects.filter(officer=officer)
        except SecurityOfficer.DoesNotExist:
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
        try:
            officer = SecurityOfficer.objects.get(email=request.user.email)
            if case.officer != officer:
                return Response({'detail': 'Only the assigned officer can update this case.'}, status=status.HTTP_403_FORBIDDEN)
        except SecurityOfficer.DoesNotExist:
            return Response({'detail': 'Only officers can update cases.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = CaseUpdateStatusSerializer(case, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_case = serializer.save()
        
        return Response(CaseSerializer(updated_case).data)


class NavigationView(OfficerOnlyMixin, APIView):
    def post(self, request):
        """
        Calculate route from officer location to target coordinates
        Expected input: {"from_lat": 18.5204, "from_lng": 73.8567, "to_lat": 18.5310, "to_lng": 73.8440}
        """
        try:
            from_lat = float(request.data.get('from_lat'))
            from_lng = float(request.data.get('from_lng'))
            to_lat = float(request.data.get('to_lat'))
            to_lng = float(request.data.get('to_lng'))
        except (TypeError, ValueError, KeyError):
            return Response({
                'error': 'Invalid or missing coordinates. Expected: from_lat, from_lng, to_lat, to_lng'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get route information from Google Maps API
        route_data = self._get_route_from_google_maps(from_lat, from_lng, to_lat, to_lng)
        
        if route_data.get('error'):
            return Response(route_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'from_location': {'lat': from_lat, 'lng': from_lng},
            'to_location': {'lat': to_lat, 'lng': to_lng},
            'route': route_data
        })

    def _get_route_from_google_maps(self, from_lat, from_lng, to_lat, to_lng):
        """
        Get route information from Google Maps Directions API
        """
        import requests
        from django.conf import settings
        
        api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
        if not api_key:
            # Fallback to haversine calculation if no API key
            return self._get_fallback_route(from_lat, from_lng, to_lat, to_lng)

        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            'origin': f"{from_lat},{from_lng}",
            'destination': f"{to_lat},{to_lng}",
            'key': api_key,
            'mode': 'driving',  # Can be changed to 'walking', 'bicycling', 'transit'
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
            
            # Extract polyline
            polyline = route['overview_polyline']['points']
            
            # Extract distance and duration
            distance_km = leg['distance']['value'] / 1000  # Convert meters to km
            duration_minutes = leg['duration']['value'] / 60  # Convert seconds to minutes
            
            # Extract step-by-step directions
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
        Fallback route calculation using haversine distance when Google Maps API is not available
        """
        distance_km = haversine_distance_km(from_lat, from_lng, to_lat, to_lng)
        
        # Estimate ETA based on average driving speed (40 km/h)
        eta_minutes = round((distance_km / 40.0) * 60) if distance_km else 0
        
        return {
            'distance_km': round(distance_km, 2),
            'duration_minutes': eta_minutes,
            'polyline': None,  # No polyline available without API
            'steps': [
                'Head towards target using best available route',
                'Follow primary roads',
                'Adjust path as needed'
            ],
            'summary': f"{round(distance_km, 2)} km - Estimated {eta_minutes} minutes",
            'note': 'Route calculated using straight-line distance. For detailed directions, configure Google Maps API key.'
        }


class IncidentsView(OfficerOnlyMixin, APIView, PageNumberPagination):
    page_size_query_param = 'page_size'

    def get(self, request):
        # List incidents for logged-in officer, filterable by date range and status
        try:
            officer = SecurityOfficer.objects.get(email=request.user.email)
        except SecurityOfficer.DoesNotExist:
            return Response({'detail': 'Officer not found for user.'}, status=status.HTTP_403_FORBIDDEN)

        qs = Incident.objects.filter(officer=officer)

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
        try:
            officer = SecurityOfficer.objects.get(email=request.user.email)
        except SecurityOfficer.DoesNotExist:
            return Response({'detail': 'Only officers can log incidents.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = IncidentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(officer=officer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OfficerProfileView(OfficerOnlyMixin, APIView):
    def get(self, request):
        try:
            officer = SecurityOfficer.objects.get(email=request.user.email)
        except SecurityOfficer.DoesNotExist:
            return Response({'detail': 'Officer not found for user.'}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = OfficerProfile.objects.get_or_create(officer=officer)
        from .serializers import OfficerProfileSerializer
        return Response(OfficerProfileSerializer(profile).data)

    def patch(self, request):
        try:
            officer = SecurityOfficer.objects.get(email=request.user.email)
        except SecurityOfficer.DoesNotExist:
            return Response({'detail': 'Officer not found for user.'}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = OfficerProfile.objects.get_or_create(officer=officer)
        from .serializers import OfficerProfileSerializer
        serializer = OfficerProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class OfficerLoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        from django.contrib.auth import authenticate
        from rest_framework_simplejwt.tokens import RefreshToken

        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return Response({'detail': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Ensure user is an officer
        try:
            SecurityOfficer.objects.get(email=user.email)
        except SecurityOfficer.DoesNotExist:
            return Response({'detail': 'Only security officers can log in here.'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        })


class NotificationView(OfficerOnlyMixin, APIView, PageNumberPagination):
    page_size_query_param = 'page_size'

    def get(self, request):
        """List notifications for the logged-in officer (unread first)"""
        try:
            officer = SecurityOfficer.objects.get(email=request.user.email)
        except SecurityOfficer.DoesNotExist:
            return Response({'detail': 'Officer not found for user.'}, status=status.HTTP_404_NOT_FOUND)

        # Get notifications, unread first
        notifications = Notification.objects.filter(officer=officer).order_by('is_read', '-created_at')
        
        page = self.paginate_queryset(notifications, request, view=self)
        serializer = NotificationSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class NotificationAcknowledgeView(OfficerOnlyMixin, APIView):
    def post(self, request):
        """Mark notifications as read"""
        try:
            officer = SecurityOfficer.objects.get(email=request.user.email)
        except SecurityOfficer.DoesNotExist:
            return Response({'detail': 'Officer not found for user.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = NotificationAcknowledgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data['notification_ids']
        notifications = Notification.objects.filter(
            id__in=notification_ids,
            officer=officer,
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
        try:
            officer = SecurityOfficer.objects.get(email=request.user.email)
        except SecurityOfficer.DoesNotExist:
            return Response({'detail': 'Officer not found for user.'}, status=status.HTTP_404_NOT_FOUND)

        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        
        # Total SOS alerts handled by this officer
        total_sos_handled = SOSAlert.objects.filter(assigned_officer=officer).count()
        
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
        
        return Response({
            'officer_name': officer.name,
            'metrics': {
                'total_sos_handled': total_sos_handled,
                'active_cases': active_cases,
                'resolved_cases_this_week': resolved_cases_week,
                'average_response_time_minutes': round(avg_response_time, 1),
                'unread_notifications': unread_notifications
            },
            'last_updated': now.isoformat()
        })

