from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from django.db.models import Q
from django.db import transaction
import logging

logger = logging.getLogger(__name__)
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserSerializer,
    OrganizationSerializer, GeofenceSerializer, GeofenceCreateSerializer,
    UserListSerializer, AlertSerializer, AlertCreateSerializer,
    GlobalReportSerializer, GlobalReportCreateSerializer,
    SecurityOfficerSerializer, SecurityOfficerCreateSerializer,
    IncidentSerializer, IncidentCreateSerializer,
    NotificationSerializer, NotificationCreateSerializer, NotificationSendSerializer,
    PromoCodeSerializer, PromoCodeCreateSerializer,
    DiscountEmailSerializer, DiscountEmailCreateSerializer,
    UserReplySerializer, UserDetailsSerializer
)
from .models import User, Organization, Geofence, Alert, GlobalReport, SecurityOfficer, Incident, Notification, PromoCode, DiscountEmail, UserReply, UserDetails
from .permissions import IsSuperAdmin, IsSuperAdminOrSubAdmin, OrganizationIsolationMixin


class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data["refresh"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_auth(request):
    return Response({
        'message': 'Authentication successful!',
        'user': request.user.username,
        'role': request.user.role
    })


class SubAdminPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100



class OrganizationViewSet(ModelViewSet):
    """
    ViewSet for managing Organizations.
    Only SUPER_ADMIN can perform CRUD operations.
    """
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = SubAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class GeofenceViewSet(OrganizationIsolationMixin, ModelViewSet):
    """
    ViewSet for managing Geofences with organization isolation.
    SUPER_ADMIN can see all geofences, SUB_ADMIN only sees their organization's geofences.
    """
    queryset = Geofence.objects.select_related('organization', 'created_by').all()
    permission_classes = [IsAuthenticated, IsSuperAdminOrSubAdmin]
    pagination_class = SubAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['organization', 'active']
    search_fields = ['name', 'description', 'organization__name']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return GeofenceCreateSerializer
        return GeofenceSerializer
    
    def perform_create(self, serializer):
        # For SUB_ADMIN, automatically set organization to their organization
        if self.request.user.role == 'SUB_ADMIN' and self.request.user.organization:
            serializer.save(
                organization=self.request.user.organization,
                created_by=self.request.user
            )
        else:
            serializer.save(created_by=self.request.user)
    
    def perform_destroy(self, instance):
        """Override destroy to handle related objects"""
        try:
            # Delete related alerts, incidents, notifications from users app
            instance.alerts.all().delete()
            instance.incidents.all().delete()
            instance.notifications.all().delete()
            
            # Handle SOS alerts from security_app if it exists
            try:
                from security_app.models import SOSAlert
                SOSAlert.objects.filter(geofence=instance).update(geofence=None)
            except Exception as sos_error:
                logger.warning(f"Could not handle SOS alerts: {str(sos_error)}")
            
            # Delete the geofence
            instance.delete()
        except Exception as e:
            logger.error(f"Error deleting geofence {instance.id}: {str(e)}")
            raise


class UserListViewSet(OrganizationIsolationMixin, ModelViewSet):
    """
    ViewSet for listing Users with organization isolation.
    SUPER_ADMIN can see all users, SUB_ADMIN only sees users from their organization.
    """
    queryset = User.objects.select_related('organization').all()
    serializer_class = UserListSerializer
    permission_classes = [IsAuthenticated, IsSuperAdminOrSubAdmin]
    pagination_class = SubAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'organization', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'date_joined', 'last_login']
    ordering = ['-date_joined']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # SUPER_ADMIN can see all users
        if user.role == 'SUPER_ADMIN':
            return queryset
        
        # SUB_ADMIN can only see users from their organization
        if user.role == 'SUB_ADMIN' and user.organization:
            return queryset.filter(organization=user.organization)
        
        # Regular users see no data
        return queryset.none()


class AlertViewSet(ModelViewSet):
    """
    ViewSet for managing Alerts with organization isolation.
    SUPER_ADMIN can see all alerts, SUB_ADMIN only sees alerts from their organization.
    """
    queryset = Alert.objects.select_related('geofence', 'user', 'resolved_by').all()
    permission_classes = [IsAuthenticated, IsSuperAdminOrSubAdmin]
    pagination_class = SubAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['alert_type', 'severity', 'is_resolved', 'geofence']
    search_fields = ['title', 'description', 'user__username', 'geofence__name']
    ordering_fields = ['created_at', 'severity', 'title']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AlertCreateSerializer
        return AlertSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # SUPER_ADMIN can see all alerts
        if user.role == 'SUPER_ADMIN':
            return queryset
        
        # SUB_ADMIN can only see alerts from their organization's geofences
        if user.role == 'SUB_ADMIN' and user.organization:
            return queryset.filter(geofence__organization=user.organization)
        
        # Regular users see no data
        return queryset.none()
    
    def perform_create(self, serializer):
        serializer.save()


class GlobalReportViewSet(ModelViewSet):
    """
    ViewSet for managing Global Reports.
    Only SUPER_ADMIN can perform CRUD operations.
    """
    queryset = GlobalReport.objects.select_related('generated_by').all()
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = SubAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['report_type', 'is_generated']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'generated_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return GlobalReportCreateSerializer
        return GlobalReportSerializer
    
    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def generate_report(request):
    """
    Generate a report with metrics calculation.
    """
    from django.utils import timezone
    from datetime import timedelta
    import json
    
    report_type = request.data.get('report_type')
    date_range_start = request.data.get('date_range_start')
    date_range_end = request.data.get('date_range_end')
    title = request.data.get('title', f'{report_type} Report')
    
    # Calculate metrics based on report type
    metrics = {}
    
    if report_type == 'GEOFENCE_ANALYTICS':
        # Count active geofences
        active_geofences = Geofence.objects.filter(active=True).count()
        total_geofences = Geofence.objects.count()
        
        # Count geofence alerts in date range
        alerts_count = Alert.objects.filter(
            created_at__gte=date_range_start,
            created_at__lte=date_range_end,
            geofence__isnull=False
        ).count()
        
        metrics = {
            'active_geofences': active_geofences,
            'total_geofences': total_geofences,
            'geofence_alerts': alerts_count,
            'utilization_rate': (active_geofences / total_geofences * 100) if total_geofences > 0 else 0
        }
    
    elif report_type == 'USER_ACTIVITY':
        # Count users by role
        super_admins = User.objects.filter(role='SUPER_ADMIN').count()
        sub_admins = User.objects.filter(role='SUB_ADMIN').count()
        regular_users = User.objects.filter(role='USER').count()
        
        # Count active users
        active_users = User.objects.filter(is_active=True).count()
        
        metrics = {
            'super_admins': super_admins,
            'sub_admins': sub_admins,
            'regular_users': regular_users,
            'active_users': active_users,
            'total_users': super_admins + sub_admins + regular_users
        }
    
    elif report_type == 'ALERT_SUMMARY':
        # Count alerts by severity
        critical_alerts = Alert.objects.filter(severity='CRITICAL').count()
        high_alerts = Alert.objects.filter(severity='HIGH').count()
        medium_alerts = Alert.objects.filter(severity='MEDIUM').count()
        low_alerts = Alert.objects.filter(severity='LOW').count()
        
        # Count resolved vs unresolved
        resolved_alerts = Alert.objects.filter(is_resolved=True).count()
        unresolved_alerts = Alert.objects.filter(is_resolved=False).count()
        
        metrics = {
            'critical_alerts': critical_alerts,
            'high_alerts': high_alerts,
            'medium_alerts': medium_alerts,
            'low_alerts': low_alerts,
            'resolved_alerts': resolved_alerts,
            'unresolved_alerts': unresolved_alerts,
            'total_alerts': resolved_alerts + unresolved_alerts
        }
    
    elif report_type == 'SYSTEM_HEALTH':
        # System health metrics
        total_organizations = Organization.objects.count()
        total_geofences = Geofence.objects.count()
        total_alerts = Alert.objects.count()
        total_users = User.objects.count()
        
        metrics = {
            'total_organizations': total_organizations,
            'total_geofences': total_geofences,
            'total_alerts': total_alerts,
            'total_users': total_users,
            'system_uptime': '99.9%',  # Placeholder
            'last_backup': timezone.now().isoformat()
        }
    
    # Create report
    report = GlobalReport.objects.create(
        report_type=report_type,
        title=title,
        date_range_start=date_range_start,
        date_range_end=date_range_end,
        metrics=metrics,
        generated_by=request.user
    )
    
    # Mark as generated (in real implementation, this would be done by Celery)
    report.mark_as_generated()
    
    return Response({
        'message': 'Report generated successfully',
        'report_id': report.id,
        'metrics': metrics
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def download_report(request, report_id):
    """
    Download a generated report as CSV.
    """
    try:
        report = GlobalReport.objects.get(id=report_id, is_generated=True)
    except GlobalReport.DoesNotExist:
        return Response({'error': 'Report not found or not generated'}, status=status.HTTP_404_NOT_FOUND)
    
    # Generate CSV content
    import csv
    import io
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write headers
    writer.writerow(['Metric', 'Value'])
    
    # Write metrics
    for key, value in report.metrics.items():
        writer.writerow([key.replace('_', ' ').title(), value])
    
    # Create response
    response = Response(
        output.getvalue(),
        content_type='text/csv',
        headers={'Content-Disposition': f'attachment; filename="{report.title}.csv"'}
    )
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdminOrSubAdmin])
def dashboard_kpis(request):
    """
    Get KPIs for dashboard.
    """
    from django.utils import timezone
    from datetime import timedelta
    
    today = timezone.now().date()
    
    # Calculate KPIs
    active_geofences = Geofence.objects.filter(active=True).count()
    alerts_today = Alert.objects.filter(created_at__date=today).count()
    active_sub_admins = User.objects.filter(role='SUB_ADMIN', is_active=True).count()
    total_users = User.objects.count()
    critical_alerts = Alert.objects.filter(severity='CRITICAL', is_resolved=False).count()
    
    # Organization-specific filtering for SUB_ADMIN
    if request.user.role == 'SUB_ADMIN' and request.user.organization:
        active_geofences = Geofence.objects.filter(
            active=True, 
            organization=request.user.organization
        ).count()
        alerts_today = Alert.objects.filter(
            created_at__date=today,
            geofence__organization=request.user.organization
        ).count()
        active_sub_admins = User.objects.filter(
            role='SUB_ADMIN', 
            is_active=True,
            organization=request.user.organization
        ).count()
        total_users = User.objects.filter(organization=request.user.organization).count()
        critical_alerts = Alert.objects.filter(
            severity='CRITICAL', 
            is_resolved=False,
            geofence__organization=request.user.organization
        ).count()
    
    kpis = {
        'active_geofences': active_geofences,
        'alerts_today': alerts_today,
        'active_sub_admins': active_sub_admins,
        'total_users': total_users,
        'critical_alerts': critical_alerts,
        'system_health': 'Good' if critical_alerts == 0 else 'Warning'
    }
    
    return Response(kpis)


# Sub-Admin Panel Views
class SecurityOfficerViewSet(OrganizationIsolationMixin, ModelViewSet):
    """
    ViewSet for managing Security Officers with organization isolation.
    Only SUB_ADMIN can perform CRUD operations on their organization's officers.
    """
    queryset = SecurityOfficer.objects.select_related('assigned_geofence', 'organization', 'created_by').all()
    permission_classes = [IsAuthenticated, IsSuperAdminOrSubAdmin]
    pagination_class = SubAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'assigned_geofence']
    search_fields = ['name', 'contact', 'email']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SecurityOfficerCreateSerializer
        return SecurityOfficerSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # SUPER_ADMIN can see all officers
        if user.role == 'SUPER_ADMIN':
            return queryset
        
        # SUB_ADMIN can only see officers from their organization
        if user.role == 'SUB_ADMIN' and user.organization:
            return queryset.filter(organization=user.organization)
        
        # Regular users see no data
        return queryset.none()
    
    def perform_create(self, serializer):
        # For SUB_ADMIN, automatically set organization to their organization
        if self.request.user.role == 'SUB_ADMIN' and self.request.user.organization:
            serializer.save(
                organization=self.request.user.organization,
                created_by=self.request.user
            )
        else:
            serializer.save(created_by=self.request.user)


class IncidentViewSet(ModelViewSet):
    """
    ViewSet for managing Incidents with organization isolation.
    Only SUB_ADMIN can perform CRUD operations on their organization's incidents.
    """
    queryset = Incident.objects.select_related('geofence', 'officer', 'resolved_by').all()
    permission_classes = [IsAuthenticated, IsSuperAdminOrSubAdmin]
    pagination_class = SubAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['incident_type', 'severity', 'is_resolved', 'geofence', 'officer']
    search_fields = ['title', 'details', 'officer__name', 'geofence__name']
    ordering_fields = ['created_at', 'severity', 'title']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return IncidentCreateSerializer
        return IncidentSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # SUPER_ADMIN can see all incidents
        if user.role == 'SUPER_ADMIN':
            return queryset
        
        # SUB_ADMIN can only see incidents from their organization's geofences
        if user.role == 'SUB_ADMIN' and user.organization:
            return queryset.filter(geofence__organization=user.organization)
        
        # Regular users see no data
        return queryset.none()
    
    def perform_create(self, serializer):
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark incident as resolved"""
        incident = self.get_object()
        incident.resolve(request.user)
        return Response({'message': 'Incident resolved successfully'})


class NotificationViewSet(OrganizationIsolationMixin, ModelViewSet):
    """
    ViewSet for managing Notifications with organization isolation.
    Only SUB_ADMIN can perform CRUD operations on their organization's notifications.
    """
    queryset = Notification.objects.select_related('target_geofence', 'organization', 'created_by').prefetch_related('target_officers').all()
    permission_classes = [IsAuthenticated, IsSuperAdminOrSubAdmin]
    pagination_class = SubAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['notification_type', 'target_type', 'is_sent', 'target_geofence']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'sent_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return NotificationCreateSerializer
        return NotificationSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # SUPER_ADMIN can see all notifications
        if user.role == 'SUPER_ADMIN':
            return queryset
        
        # SUB_ADMIN can only see notifications from their organization
        if user.role == 'SUB_ADMIN' and user.organization:
            return queryset.filter(organization=user.organization)
        
        # Regular users see no data
        return queryset.none()
    
    def perform_create(self, serializer):
        # For SUB_ADMIN, automatically set organization to their organization
        if self.request.user.role == 'SUB_ADMIN' and self.request.user.organization:
            serializer.save(
                organization=self.request.user.organization,
                created_by=self.request.user
            )
        else:
            serializer.save(created_by=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperAdminOrSubAdmin])
def send_notification(request):
    """
    Send a notification to officers.
    """
    serializer = NotificationSendSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        data = serializer.validated_data
        
        # Create notification
        notification = Notification.objects.create(
            notification_type=data['notification_type'],
            title=data['title'],
            message=data['message'],
            target_type=data['target_type'],
            target_geofence_id=data.get('target_geofence_id'),
            organization=request.user.organization,
            created_by=request.user
        )
        
        # Set target officers based on target_type
        if data['target_type'] == 'ALL_OFFICERS':
            officers = SecurityOfficer.objects.filter(
                organization=request.user.organization,
                is_active=True
            )
            notification.target_officers.set(officers)
        
        elif data['target_type'] == 'GEOFENCE_OFFICERS' and data.get('target_geofence_id'):
            officers = SecurityOfficer.objects.filter(
                assigned_geofence_id=data['target_geofence_id'],
                organization=request.user.organization,
                is_active=True
            )
            notification.target_officers.set(officers)
        
        elif data['target_type'] == 'SPECIFIC_OFFICERS' and data.get('target_officer_ids'):
            officers = SecurityOfficer.objects.filter(
                id__in=data['target_officer_ids'],
                organization=request.user.organization,
                is_active=True
            )
            notification.target_officers.set(officers)
        
        # Mark as sent (in real implementation, this would trigger actual notification sending)
        notification.mark_as_sent()
        
        return Response({
            'message': 'Notification sent successfully',
            'notification_id': notification.id,
            'target_count': notification.target_officers.count()
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdminOrSubAdmin])
def subadmin_dashboard_kpis(request):
    """
    Get KPIs for sub-admin dashboard.
    """
    from django.utils import timezone
    from datetime import timedelta
    
    today = timezone.now().date()
    user = request.user
    
    if user.role != 'SUB_ADMIN' or not user.organization:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    organization = user.organization
    
    # Calculate KPIs for the sub-admin's organization
    active_geofences = Geofence.objects.filter(
        active=True, 
        organization=organization
    ).count()
    
    total_officers = SecurityOfficer.objects.filter(
        organization=organization
    ).count()
    
    active_officers = SecurityOfficer.objects.filter(
        organization=organization,
        is_active=True
    ).count()
    
    incidents_today = Incident.objects.filter(
        created_at__date=today,
        geofence__organization=organization
    ).count()
    
    unresolved_incidents = Incident.objects.filter(
        is_resolved=False,
        geofence__organization=organization
    ).count()
    
    critical_incidents = Incident.objects.filter(
        severity='CRITICAL',
        is_resolved=False,
        geofence__organization=organization
    ).count()
    
    notifications_sent_today = Notification.objects.filter(
        created_at__date=today,
        organization=organization,
        is_sent=True
    ).count()
    
    kpis = {
        'active_geofences': active_geofences,
        'total_officers': total_officers,
        'active_officers': active_officers,
        'incidents_today': incidents_today,
        'unresolved_incidents': unresolved_incidents,
        'critical_incidents': critical_incidents,
        'notifications_sent_today': notifications_sent_today,
        'organization_name': organization.name
    }
    
    return Response(kpis)


class PromoCodeViewSet(ModelViewSet):
    """
    ViewSet for managing Promo Codes.
    Only SUPER_ADMIN can perform CRUD operations.
    """
    queryset = PromoCode.objects.all()
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = SubAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['code']
    ordering_fields = ['code', 'discount_percentage', 'expiry_date', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PromoCodeCreateSerializer
        return PromoCodeSerializer


class DiscountEmailViewSet(ModelViewSet):
    """
    ViewSet for managing Discount Emails.
    Only SUPER_ADMIN can perform CRUD operations.
    """
    queryset = DiscountEmail.objects.select_related('discount_code').all()
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = SubAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'discount_code']
    search_fields = ['email', 'discount_code__code']
    ordering_fields = ['email', 'status', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return DiscountEmailCreateSerializer
        return DiscountEmailSerializer
    
    @action(detail=True, methods=['post'])
    def mark_sent(self, request, pk=None):
        """Mark discount email as sent"""
        discount_email = self.get_object()
        discount_email.mark_as_sent()
        return Response({'message': 'Discount email marked as sent successfully'})


class UserReplyViewSet(ReadOnlyModelViewSet):
    """
    Read-only ViewSet for viewing User Replies.
    Only SUPER_ADMIN can view user replies.
    """
    queryset = UserReply.objects.all()
    serializer_class = UserReplySerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = SubAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['email', 'message']
    ordering_fields = ['email', 'date_time']
    ordering = ['-date_time']


class UserDetailsViewSet(ReadOnlyModelViewSet):
    """
    Read-only ViewSet for viewing User Details.
    Only SUPER_ADMIN can view user details.
    """
    queryset = UserDetails.objects.all()
    serializer_class = UserDetailsSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = SubAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['username']
    ordering_fields = ['username', 'price', 'status', 'date']
    ordering = ['-date']
