from rest_framework.permissions import BasePermission


class IsSecurityOfficer(BasePermission):
    """
    Permission class to check if the user is a security officer.
    Security officers are stored in User table with role='security_officer'.
    """
    message = 'Only security officers can access this resource.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Check if user has the security_officer role
        # Security officers are User records with role='security_officer'
        role_value = str(getattr(user, 'role', '') or '').lower()
        if role_value == 'security_officer':
            return True
        
        return False

