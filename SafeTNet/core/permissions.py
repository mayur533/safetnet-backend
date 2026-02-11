from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class IsSubAdminOrReadOnly(permissions.BasePermission):
    """Only allow subadmins to create/edit, others read-only"""
    
    def has_permission(self, request, view):
        # Allow safe methods (GET, HEAD, OPTIONS) for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Only allow POST, PATCH, DELETE for subadmins and super admins
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['SUB_ADMIN', 'SUPER_ADMIN']
        )
    
    def has_object_permission(self, request, view, obj):
        # Allow safe methods for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Only allow modifications by subadmins and super admins
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['SUB_ADMIN', 'SUPER_ADMIN']
        )


class IsSubAdmin(permissions.BasePermission):
    """Only allow subadmins and super admins"""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['SUB_ADMIN', 'SUPER_ADMIN']
        )
    
    def has_object_permission(self, request, view, obj):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['SUB_ADMIN', 'SUPER_ADMIN']
        )
