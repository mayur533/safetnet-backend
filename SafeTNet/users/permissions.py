from rest_framework import permissions
from django.core.exceptions import PermissionDenied
import logging

logger = logging.getLogger(__name__)


class IsSuperAdmin(permissions.BasePermission):
    """
    Custom permission to only allow SUPER_ADMIN users.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            logger.warning(f"Unauthenticated access attempt to {view.__class__.__name__}")
            return False
        
        is_super_admin = request.user.role == 'SUPER_ADMIN'
        if not is_super_admin:
            logger.warning(f"Non-SUPER_ADMIN user {request.user.username} attempted access to {view.__class__.__name__}")
        
        return is_super_admin


class IsSuperAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow SUPER_ADMIN full access, others read-only.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            logger.warning(f"Unauthenticated access attempt to {view.__class__.__name__}")
            return False
        
        if request.method in permissions.SAFE_METHODS:
            return True
        
        is_super_admin = request.user.role == 'SUPER_ADMIN'
        if not is_super_admin:
            logger.warning(f"Non-SUPER_ADMIN user {request.user.username} attempted {request.method} on {view.__class__.__name__}")
        
        return is_super_admin


class IsSuperAdminOrSubAdmin(permissions.BasePermission):
    """
    Custom permission to allow SUPER_ADMIN and SUB_ADMIN users.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            logger.warning(f"Unauthenticated access attempt to {view.__class__.__name__}")
            return False
        
        has_access = request.user.role in ['SUPER_ADMIN', 'SUB_ADMIN']
        if not has_access:
            logger.warning(f"User {request.user.username} with role {request.user.role} attempted access to {view.__class__.__name__}")
        
        return has_access


class IsSuperAdminOrSubAdminReadOnly(permissions.BasePermission):
    """
    Custom permission to allow SUPER_ADMIN full access, SUB_ADMIN read-only.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            logger.warning(f"Unauthenticated access attempt to {view.__class__.__name__}")
            return False
        
        if request.user.role == 'SUPER_ADMIN':
            return True
        
        if request.user.role == 'SUB_ADMIN':
            if request.method in permissions.SAFE_METHODS:
                return True
            else:
                logger.warning(f"SUB_ADMIN user {request.user.username} attempted {request.method} on {view.__class__.__name__}")
                return False
        
        logger.warning(f"User {request.user.username} with role {request.user.role} attempted access to {view.__class__.__name__}")
        return False


class IsAuthenticatedOrReadOnlyForOwnGeofences(permissions.BasePermission):
    """
    Custom permission to allow:
    - SUPER_ADMIN: Full access
    - SUB_ADMIN: Full access
    - Regular users: Read-only access to alerts for their associated geofences
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # SUPER_ADMIN and SUB_ADMIN have full access
        if request.user.role in ['SUPER_ADMIN', 'SUB_ADMIN']:
            return True
        
        # Regular users can only read alerts for their geofences
        if request.user.role == 'USER':
            if request.method in permissions.SAFE_METHODS:
                return True
        
        return False


class OrganizationIsolationMixin:
    """
    Mixin to enforce organization-based data isolation for Sub-Admins.
    """
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # SUPER_ADMIN can see all data
        if user.role == 'SUPER_ADMIN':
            return queryset
        
        # SUB_ADMIN can only see data from their organization
        if user.role == 'SUB_ADMIN' and user.organization:
            filtered_queryset = queryset.filter(organization=user.organization)
            logger.info(f"SUB_ADMIN {user.username} accessing organization-filtered data: {filtered_queryset.count()} records")
            return filtered_queryset
        
        # Regular users see no data (should not reach here with proper permissions)
        logger.warning(f"User {user.username} with role {user.role} accessing data without proper organization")
        return queryset.none()


class IsOwnerAndPendingAlert(permissions.BasePermission):
    """
    Custom permission to allow users to update/delete their own alerts based on creator role:
    - Users can modify their own alerts only if status is 'pending'
    - Officers can modify their own alerts regardless of status
    - Admins can modify any alert
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # SUPER_ADMIN and SUB_ADMIN can always modify
        if request.user.role in ['SUPER_ADMIN', 'SUB_ADMIN']:
            return True
        
        # Officers can modify their own created alerts
        if request.user.role == 'security_officer':
            return (obj.created_by_role == 'OFFICER' and 
                   obj.user_id == request.user.id)
        
        # Users can only modify their own alerts that are still pending
        # Once status changes to 'accepted' or 'resolved', user cannot modify
        if request.user.role == 'USER':
            return (obj.user_id == request.user.id and 
                   obj.status == 'pending')
        
        return False


class IsLiveLocationOwner(permissions.BasePermission):
    """
    Custom permission for LiveLocation write access.
    
    Allow CREATE/UPDATE only if:
    - request.user.role == USER
    - request.user.id == live_location.user_id  
    - request.user.id == sos_alert.user_id
    - sos_alert.status IN ('pending', 'accepted')
    
    Deny for security_officer, admin roles, resolved/cancelled alerts.
    """
    
    def has_permission(self, request, view):
        """Check permission for create operations."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Only USER role can create LiveLocation
        if request.user.role != 'USER':
            return False
        
        # Validate sos_alert exists and belongs to user
        sos_alert_id = request.data.get('sos_alert')
        if not sos_alert_id:
            return False
        
        try:
            from security_app.models import SOSAlert
            sos_alert = SOSAlert.objects.get(id=sos_alert_id)
            
            # Ensure user owns the SOS alert
            if sos_alert.user_id != request.user.id:
                return False
            
            # Ensure alert was created by USER (not officer)
            if sos_alert.created_by_role != 'USER':
                return False
            
            # Ensure alert is in valid status
            if sos_alert.status not in ['pending', 'accepted']:
                return False
            
            return True
            
        except SOSAlert.DoesNotExist:
            return False
    
    def has_object_permission(self, request, view, obj):
        """Check permission for update/delete operations."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Only USER role can update LiveLocation
        if request.user.role != 'USER':
            return False
        
        # User must own both the LiveLocation and the associated SOSAlert
        if (obj.user_id != request.user.id or 
            obj.sos_alert.user_id != request.user.id):
            return False
        
        # Only allow updates for pending or accepted alerts
        if obj.sos_alert.status not in ['pending', 'accepted']:
            return False
        
        return True


class ResourceOwnershipMixin:
    """
    Mixin to enforce resource ownership for certain operations.
    """
    
    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        
        # SUPER_ADMIN can access all resources
        if user.role == 'SUPER_ADMIN':
            return obj
        
        # SUB_ADMIN can only access resources from their organization
        if user.role == 'SUB_ADMIN' and user.organization:
            if hasattr(obj, 'organization') and obj.organization != user.organization:
                logger.warning(f"SUB_ADMIN {user.username} attempted to access resource from different organization")
                raise PermissionDenied("You don't have permission to access this resource.")
            return obj
        
        logger.warning(f"User {user.username} with role {user.role} attempted unauthorized resource access")
        raise PermissionDenied("You don't have permission to access this resource.")
