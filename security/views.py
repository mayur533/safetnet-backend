from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination
from users.permissions import IsSuperAdminOrSubAdmin
from .models import SOSAlert, Case
from .serializers import (
    SOSAlertSerializer,
    SOSAlertCreateSerializer,
    CaseSerializer,
    CaseUpdateStatusSerializer,
)
from users.models import SecurityOfficer
from .utils import haversine_distance_km


class SOSAlertViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing SOS alerts.
    
    - Users can create SOS alerts (POST)
    - Admin/Sub-admin can view all alerts (GET)
    - Admin/Sub-admin can update alert status (PUT/PATCH)
    """
    queryset = SOSAlert.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'user']
    search_fields = ['user__username', 'user__email', 'message']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SOSAlertCreateSerializer
        return SOSAlertSerializer
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action == 'create':
            # Any authenticated user can create SOS alerts
            permission_classes = [IsAuthenticated]
        else:
            # Only admin/sub-admin can view and manage alerts
            permission_classes = [IsSuperAdminOrSubAdmin]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Filter queryset based on user role.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # SUPER_ADMIN can see all alerts
        if user.role == 'SUPER_ADMIN':
            return queryset
        
        # SUB_ADMIN can see alerts from their organization
        if user.role == 'SUB_ADMIN' and user.organization:
            return queryset.filter(user__organization=user.organization)
        
        # Regular users can only see their own alerts
        if user.role == 'USER':
            return queryset.filter(user=user)
        
        return queryset.none()
    
    def perform_create(self, serializer):
        """
        Set the user to the current user when creating an SOS alert.
        """
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['patch'])
    def resolve(self, request, pk=None):
        """
        Mark an SOS alert as resolved.
        Only admin/sub-admin can resolve alerts.
        """
        alert = self.get_object()
        alert.status = 'resolved'
        alert.save()
        
        serializer = self.get_serializer(alert)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get all active SOS alerts.
        """
        active_alerts = self.get_queryset().filter(status='active')
        serializer = self.get_serializer(active_alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def resolved(self, request):
        """
        Get all resolved SOS alerts.
        """
        resolved_alerts = self.get_queryset().filter(status='resolved')
        serializer = self.get_serializer(resolved_alerts, many=True)
        return Response(serializer.data)


class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.all()
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'assigned_officer', 'sos_alert']
    search_fields = ['notes', 'assigned_officer__name', 'sos_alert__user__username']
    ordering_fields = ['updated_at']
    ordering = ['-updated_at']

    def get_permissions(self):
        # Officers can update their assigned cases; admins/sub-admins can view all
        if self.action in ['accept', 'reject', 'resolve']:
            return [IsAuthenticated()]
        if self.action in ['list', 'retrieve']:
            return [IsSuperAdminOrSubAdmin()]
        # Default to admin/sub-admin for other writes
        return [IsSuperAdminOrSubAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == 'SUPER_ADMIN':
            return queryset
        if user.role == 'SUB_ADMIN' and user.organization:
            return queryset.filter(
                sos_alert__user__organization=user.organization
            )
        # Regular users (including officers logging in as users) see only cases where they are assigned officer (if linked to their user via name/email is not available; skip)
        return queryset.none()

    def get_serializer_class(self):
        if self.action in ['accept', 'reject', 'resolve']:
            return CaseUpdateStatusSerializer
        return CaseSerializer

    def _ensure_officer(self, request):
        # Map current user to a SecurityOfficer if exists
        try:
            return SecurityOfficer.objects.get(email=request.user.email)
        except SecurityOfficer.DoesNotExist:
            return None

    def _update_status(self, case_obj, new_status, notes=None, officer=None):
        if officer is not None and case_obj.assigned_officer is None:
            case_obj.assigned_officer = officer
        case_obj.status = new_status
        if notes is not None:
            case_obj.notes = notes
        case_obj.save()
        return case_obj

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        case = self.get_object()
        officer = self._ensure_officer(request)
        if officer is None:
            return Response({'detail': 'Only officers can accept cases.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = CaseUpdateStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = self._update_status(case, 'accepted', serializer.validated_data.get('notes'), officer)
        return Response(CaseSerializer(updated).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        case = self.get_object()
        officer = self._ensure_officer(request)
        if officer is None:
            return Response({'detail': 'Only officers can reject cases.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = CaseUpdateStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = self._update_status(case, 'rejected', serializer.validated_data.get('notes'), officer)
        return Response(CaseSerializer(updated).data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        case = self.get_object()
        # Allow officer who accepted or admins to resolve
        officer = self._ensure_officer(request)
        if officer is None and self.request.user.role not in ['SUPER_ADMIN', 'SUB_ADMIN']:
            return Response({'detail': 'Not permitted to resolve this case.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = CaseUpdateStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = self._update_status(case, 'resolved', serializer.validated_data.get('notes'))
        return Response(CaseSerializer(updated).data)


class NavigationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            officer_lat = float(request.query_params.get('officer_location_lat'))
            officer_long = float(request.query_params.get('officer_location_long'))
            sos_alert_id = int(request.query_params.get('sos_alert_id'))
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid or missing parameters.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sos_alert = SOSAlert.objects.get(id=sos_alert_id)
        except SOSAlert.DoesNotExist:
            return Response({'detail': 'SOS alert not found.'}, status=status.HTTP_404_NOT_FOUND)

        user_lat = sos_alert.location_lat
        user_long = sos_alert.location_long

        distance_km = haversine_distance_km(officer_lat, officer_long, user_lat, user_long)

        # Placeholder route guidance
        route = {
            'distance_km': round(distance_km, 3),
            'eta_minutes': round((distance_km / 40.0) * 60) if distance_km is not None else None,  # assume avg 40km/h
            'polyline': None,  # placeholder until real routing integration
            'steps': [
                'Head towards target using best available route',
                'Follow primary roads',
                'Adjust path as needed'
            ]
        }

        return Response({
            'officer_location': {'lat': officer_lat, 'long': officer_long},
            'user_location': {'lat': user_lat, 'long': user_long},
            'sos_alert_id': sos_alert.id,
            'route': route
        })


class IncidentsView(APIView, PageNumberPagination):
    permission_classes = [IsAuthenticated, IsSuperAdminOrSubAdmin]
    page_size_query_param = 'page_size'

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        sos_qs = SOSAlert.objects.filter(status='resolved')
        case_qs = Case.objects.filter(status='resolved')

        # Organization scoping for sub-admins
        user = request.user
        if user.role == 'SUB_ADMIN' and user.organization:
            sos_qs = sos_qs.filter(user__organization=user.organization)
            case_qs = case_qs.filter(sos_alert__user__organization=user.organization)

        # Date range filtering based on updated_at for both
        from django.utils.dateparse import parse_datetime
        start_dt = parse_datetime(start_date) if start_date else None
        end_dt = parse_datetime(end_date) if end_date else None
        if start_dt:
            sos_qs = sos_qs.filter(updated_at__gte=start_dt)
            case_qs = case_qs.filter(updated_at__gte=start_dt)
        if end_dt:
            sos_qs = sos_qs.filter(updated_at__lte=end_dt)
            case_qs = case_qs.filter(updated_at__lte=end_dt)

        # Build unified list
        items = []
        for s in sos_qs.only('id', 'user__username', 'created_at', 'updated_at').select_related('user'):
            items.append({
                'type': 'sos',
                'user': s.user.username,
                'alert_time': s.created_at,
                'resolution_time': s.updated_at,
                'officer': None,
                'notes': None,
            })

        for c in case_qs.only('id', 'assigned_officer__name', 'updated_at', 'notes', 'sos_alert__created_at', 'sos_alert__user__username').select_related('assigned_officer', 'sos_alert', 'sos_alert__user'):
            items.append({
                'type': 'case',
                'user': c.sos_alert.user.username,
                'alert_time': c.sos_alert.created_at,
                'resolution_time': c.updated_at,
                'officer': c.assigned_officer.name if c.assigned_officer else None,
                'notes': c.notes,
            })

        # Order latest first by resolution_time
        items.sort(key=lambda x: x['resolution_time'], reverse=True)

        page = self.paginate_queryset(items, request, view=self)
        return self.get_paginated_response(page)