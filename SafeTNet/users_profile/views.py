"""
API views for User models.
"""
import logging
from django.conf import settings
from django.http import Http404
from django.db import models
# from django.contrib.gis.geos import Point  # Commented out to avoid GDAL dependency
# from django.contrib.gis.measure import Distance  # Commented out to avoid GDAL dependency
# from django.contrib.gis.db.models.functions import Distance as DistanceFunction  # Commented out to avoid GDAL dependency
from django.utils import timezone
from datetime import timedelta
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import (
    User, FamilyContact, CommunityMembership, SOSEvent,
    LiveLocationShare, Geofence, CommunityAlert, ChatGroup, ChatMessage, FREE_TIER_LIMITS
)
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    FamilyContactSerializer, FamilyContactCreateSerializer,
    CommunityMembershipSerializer, CommunityMembershipCreateSerializer,
    SOSEventSerializer, SOSTriggerSerializer, UserLocationUpdateSerializer,
    SubscriptionSerializer, LiveLocationShareSerializer, LiveLocationShareCreateSerializer,
    GeofenceSerializer, GeofenceCreateSerializer,
    CommunityAlertSerializer, CommunityAlertCreateSerializer,
    ChatGroupSerializer, ChatGroupCreateSerializer,
    ChatMessageSerializer, ChatMessageCreateSerializer
)
from .services import SMSService, GeofenceService

logger = logging.getLogger(__name__)


class UserRegistrationView(APIView):
    """
    User registration endpoint.
    POST /users/
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Register a new user."""
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            logger.info(f"New user registered: {user.email}")
            
            return Response({
                'message': 'User registered successfully',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'access': str(access_token),
                    'refresh': str(refresh)
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLoginView(TokenObtainPairView):
    """
    User login endpoint with JWT authentication.
    POST /users/login/
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        """Login user and return JWT tokens."""
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            logger.info(f"User logged in: {user.email}")
            
            return Response({
                'message': 'Login successful',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'access': str(access_token),
                    'refresh': str(refresh)
                }
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get and update user profile.
    GET /users/<id>/
    PUT/PATCH /users/<id>/
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """Get the user's profile by ID or current user."""
        user_id = self.kwargs.get('user_id')
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                # Allow users to access their own profile
                if self.request.user.id == user.id:
                    return user
                else:
                    # For now, allow access to any profile (you can restrict this later)
                    return user
            except User.DoesNotExist:
                raise Http404("User not found")
        else:
            # For /profile/ endpoint, return current user
            return self.request.user
    
    def get(self, request, *args, **kwargs):
        """Get user profile."""
        user = self.get_object()
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    def put(self, request, *args, **kwargs):
        """Update user profile."""
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=False)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"User profile updated: {user.email}")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request, *args, **kwargs):
        """Partially update user profile."""
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"User profile updated: {user.email}")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLocationUpdateView(APIView):
    """
    Update user location.
    POST /users/<id>/location/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        """Update user's current location."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'You can only update your own location.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UserLocationUpdateSerializer(data=request.data)
        if serializer.is_valid():
            longitude = serializer.validated_data['longitude']
            latitude = serializer.validated_data['latitude']
            
            request.user.set_location(longitude, latitude)
            logger.info(f"User location updated: {request.user.email}")
            
            return Response({
                'message': 'Location updated successfully',
                'location': request.user.get_location_dict()
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FamilyContactListView(generics.ListCreateAPIView):
    """
    List and create family contacts.
    GET /users/<id>/family_contacts/
    POST /users/<id>/family_contacts/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get family contacts for the current user."""
        return FamilyContact.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on request method."""
        if self.request.method == 'POST':
            return FamilyContactCreateSerializer
        return FamilyContactSerializer
    
    def perform_create(self, serializer):
        """Create a new family contact."""
        user = self.request.user
        is_premium = _is_user_premium(user)
        current_count = FamilyContact.objects.filter(user=user).count()
        
        # Check free tier limit
        if not is_premium and current_count >= FREE_TIER_LIMITS['MAX_CONTACTS']:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                f'Free plan allows up to {FREE_TIER_LIMITS["MAX_CONTACTS"]} emergency contacts. '
                'Upgrade to Premium for unlimited contacts.'
            )
        
        serializer.save(user=user)
        logger.info(f"Family contact created for user: {user.email}")
    
    def post(self, request, *args, **kwargs):
        user_id = kwargs.get('user_id')
        if user_id is not None and request.user.id != int(user_id):
            return Response(
                {'error': 'You can only create family contacts for your own account.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().post(request, *args, **kwargs)
    
    def list(self, request, *args, **kwargs):
        """List family contacts."""
        user_id = kwargs.get('user_id')
        if user_id is not None and request.user.id != int(user_id):
            return Response(
                {'error': 'You can only view your own family contacts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        queryset = self.get_queryset()
        serializer = FamilyContactSerializer(queryset, many=True)
        return Response(serializer.data)


class FamilyContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a family contact.
    GET /users/<id>/family_contacts/<contact_id>/
    PUT/PATCH /users/<id>/family_contacts/<contact_id>/
    DELETE /users/<id>/family_contacts/<contact_id>/
    """
    serializer_class = FamilyContactSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = 'contact_id'
    
    def get_queryset(self):
        """Get family contacts for the current user."""
        return FamilyContact.objects.filter(user=self.request.user)
    
    def get(self, request, *args, **kwargs):
        user_id = kwargs.get('user_id')
        if user_id is not None and request.user.id != int(user_id):
            return Response(
                {'error': 'You can only view your own family contacts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().get(request, *args, **kwargs)
    
    def put(self, request, *args, **kwargs):
        user_id = kwargs.get('user_id')
        if user_id is not None and request.user.id != int(user_id):
            return Response(
                {'error': 'You can only update your own family contacts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().put(request, *args, **kwargs)
    
    def patch(self, request, *args, **kwargs):
        user_id = kwargs.get('user_id')
        if user_id is not None and request.user.id != int(user_id):
            return Response(
                {'error': 'You can only update your own family contacts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().patch(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a family contact."""
        user_id = kwargs.get('user_id')
        if user_id is not None and request.user.id != int(user_id):
            return Response(
                {'error': 'You can only delete your own family contacts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance = self.get_object()
        self.perform_destroy(instance)
        logger.info(f"Family contact deleted for user: {request.user.email}")
        return Response(status=status.HTTP_204_NO_CONTENT)


class CommunityMembershipListView(generics.ListAPIView):
    """
    List user's community memberships.
    GET /users/<id>/communities/
    """
    serializer_class = CommunityMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get community memberships for the current user."""
        return CommunityMembership.objects.filter(
            user=self.request.user,
            is_active=True
        )
    
    def list(self, request, *args, **kwargs):
        user_id = kwargs.get('user_id')
        if user_id is not None and request.user.id != int(user_id):
            return Response(
                {'error': 'You can only view your own community memberships.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().list(request, *args, **kwargs)


class CommunityJoinView(APIView):
    """
    Join a community.
    POST /users/<id>/communities/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        """Join a community."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'You can only join communities for your own account.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CommunityMembershipCreateSerializer(data=request.data)
        if serializer.is_valid():
            community_id = serializer.validated_data['community_id']
            community_name = serializer.validated_data['community_name']
            
            membership = CommunityMembership.objects.create(
                user=request.user,
                community_id=community_id,
                community_name=community_name
            )
            
            logger.info(f"User joined community: {request.user.email} - {community_name}")
            
            return Response({
                'message': 'Successfully joined community',
                'membership': CommunityMembershipSerializer(membership).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CommunityLeaveView(APIView):
    """
    Leave a community.
    DELETE /users/<id>/communities/<community_id>/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request, user_id, community_id):
        """Leave a community."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'You can only leave communities for your own account.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            membership = CommunityMembership.objects.get(
                user=request.user,
                community_id=community_id
            )
            membership.is_active = False
            membership.save()
            
            logger.info(f"User left community: {request.user.email} - {community_id}")
            
            return Response({
                'message': 'Successfully left community'
            }, status=status.HTTP_200_OK)
        
        except CommunityMembership.DoesNotExist:
            return Response(
                {'error': 'Community membership not found.'},
                status=status.HTTP_404_NOT_FOUND
            )


class SOSTriggerView(APIView):
    """
    Trigger SOS event.
    POST /users/<id>/sos/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        """Trigger SOS event."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'You can only trigger SOS for your own account.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = SOSTriggerSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            is_premium = _is_user_premium(user)
            longitude = serializer.validated_data.get('longitude')
            latitude = serializer.validated_data.get('latitude')
            notes = serializer.validated_data.get('notes', '')
            
            # Create SOS event
            location_data = None
            if longitude is not None and latitude is not None:
                location_data = {'longitude': longitude, 'latitude': latitude}
            
            sos_event = SOSEvent.objects.create(
                user=user,
                notes=notes,
                location=location_data,
                is_premium_event=is_premium
            )
            
            # Send SMS to family contacts (both free and premium)
            try:
                sms_service = SMSService()
                family_contacts = FamilyContact.objects.filter(user=user)
                
                for contact in family_contacts:
                    try:
                        sms_service.send_sos_alert(
                            to_phone=contact.phone,
                            user_name=getattr(user, 'name', user.email),
                            user_phone=getattr(user, 'phone', ''),
                            location=location_data
                        )
                        logger.info(f"SOS SMS sent to family contact: {contact.phone}")
                    except Exception as e:
                        logger.error(f"Failed to send SOS SMS to {contact.phone}: {str(e)}")
            except Exception as e:
                logger.error(f"SMS service error: {str(e)}")
            
            # Premium features
            if is_premium:
                # Notify 24x7 Emergency Response Center (if implemented)
                sos_event.status = 'response_center_notified'
                sos_event.is_premium_event = True
                # Premium: Priority notification - Premium users get faster dispatch
                logger.info(f"Premium SOS event - Priority dispatch - Response center notified: {user.email}")
                # Premium: Audio/Video recording URLs would be set here if available
                # Premium: Cloud backup URL would be set here if available
            else:
                sos_event.status = 'sms_sent'
                # Free users get standard priority
                logger.info(f"Free SOS event - Standard dispatch: {user.email}")
            
            sos_event.save()
            
            logger.info(f"SOS event triggered for user: {user.email} (Premium: {is_premium})")
            
            return Response({
                'message': 'SOS event triggered successfully',
                'sos_event': SOSEventSerializer(sos_event).data,
                'is_premium': is_premium
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SOSEventListView(generics.ListAPIView):
    """
    List user's SOS events.
    Free: Last 5 events
    Premium: Unlimited
    GET /users/<id>/sos_events/
    """
    serializer_class = SOSEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get SOS events for the current user."""
        user = self.request.user
        is_premium = _is_user_premium(user)
        
        queryset = SOSEvent.objects.filter(user=user)
        
        # Free users see only last 5 events
        if not is_premium:
            queryset = queryset[:FREE_TIER_LIMITS['MAX_INCIDENT_HISTORY']]
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """List SOS events with limit info."""
        user_id = kwargs.get('user_id')
        if user_id is not None and request.user.id != int(user_id):
            return Response(
                {'error': 'You can only view your own SOS events.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'events': serializer.data,
            'is_premium': is_premium,
            'limit': None if is_premium else FREE_TIER_LIMITS['MAX_INCIDENT_HISTORY'],
            'message': None if is_premium else f'Free plan shows last {FREE_TIER_LIMITS["MAX_INCIDENT_HISTORY"]} incidents. Upgrade to Premium for unlimited history.'
        })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_stats(request, user_id):
    """
    Get user statistics.
    GET /users/<id>/stats/
    """
    if request.user.id != int(user_id):
        return Response(
            {'error': 'You can only view your own statistics.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    user = request.user
    is_premium = _is_user_premium(user)
    
    stats = {
        'total_family_contacts': FamilyContact.objects.filter(user=user).count(),
        'max_contacts': None if is_premium else FREE_TIER_LIMITS['MAX_CONTACTS'],
        'active_community_memberships': CommunityMembership.objects.filter(
            user=user, is_active=True
        ).count(),
        'total_sos_events': SOSEvent.objects.filter(user=user).count(),
        'is_premium': is_premium,
        'plan_type': getattr(user, 'plantype', 'free'),
        'plan_expiry': getattr(user, 'planexpiry', None),
    }
    
    return Response(stats)


# Helper function to check if user is premium
def _is_user_premium(user):
    """Check if user has premium subscription by checking UserDetails."""
    try:
        from users.models import UserDetails
        user_details = UserDetails.objects.filter(username=user.username).first()
        if user_details and user_details.price > 0:
            return True
    except:
        pass
    # Fallback checks
    if hasattr(user, 'is_paid_user') and user.is_paid_user:
        return True
    if hasattr(user, 'is_premium') and user.is_premium:
        return True
    email = getattr(user, 'email', '').lower()
    username = getattr(user, 'username', '').lower()
    if 'premium' in email or 'premium' in username:
            return True
    return False


# Subscription endpoints
class SubscriptionView(APIView):
    """
    Subscribe to premium plan.
    POST /users/subscribe/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Subscribe user to premium plan."""
        serializer = SubscriptionSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            plan_type = serializer.validated_data['plan_type']
            promo_code = serializer.validated_data.get('promo_code', '')
            
            # Calculate expiry date
            if plan_type == 'premium-monthly':
                expiry_date = timezone.now().date() + timedelta(days=30)
            else:  # premium-annual
                expiry_date = timezone.now().date() + timedelta(days=365)
            
            # Update user plan
            if hasattr(user, 'plantype'):
                user.plantype = 'premium'
            if hasattr(user, 'planexpiry'):
                user.planexpiry = expiry_date
            user.save()
            
            logger.info(f"User subscribed to premium: {user.email} - {plan_type}")
            
            return Response({
                'success': True,
                'plan_type': 'premium',
                'planexpiry': expiry_date.isoformat(),
                'message': f'Successfully subscribed to {plan_type}'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CancelSubscriptionView(APIView):
    """
    Cancel premium subscription.
    POST /users/subscribe/cancel/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Cancel user's premium subscription."""
        user = request.user
        
        # Downgrade to free
        if hasattr(user, 'plantype'):
            user.plantype = 'free'
        if hasattr(user, 'planexpiry'):
            user.planexpiry = None
        user.save()
        
        logger.info(f"User cancelled subscription: {user.email}")
        
        return Response({
            'message': 'Subscription cancelled successfully. You are now on the free plan.'
        }, status=status.HTTP_200_OK)


# Live Location Sharing endpoints
class LiveLocationShareView(APIView):
    """
    Start live location sharing.
    POST /users/<user_id>/live_location/start/
    GET /users/<user_id>/live_location/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        """Start live location sharing."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'You can only start live sharing for your own account.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        serializer = LiveLocationShareCreateSerializer(data=request.data)
        if serializer.is_valid():
            duration_minutes = serializer.validated_data['duration_minutes']
            
            # Check free tier limit
            if not is_premium and duration_minutes > FREE_TIER_LIMITS['MAX_LIVE_SHARE_MINUTES']:
                return Response({
                    'error': f'Free plan allows up to {FREE_TIER_LIMITS["MAX_LIVE_SHARE_MINUTES"]} minutes of live sharing. Upgrade to Premium for unlimited sharing.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Create live location share session
            expires_at = timezone.now() + timedelta(minutes=duration_minutes)
            live_share = LiveLocationShare.objects.create(
                user=user,
                expires_at=expires_at
            )
            
            # Add shared_with users if provided
            shared_with_ids = serializer.validated_data.get('shared_with_user_ids', [])
            if shared_with_ids:
                shared_users = User.objects.filter(id__in=shared_with_ids)
                live_share.shared_with.set(shared_users)
            
            logger.info(f"Live location sharing started: {user.email} for {duration_minutes} minutes")
            
            return Response({
                'message': 'Live location sharing started',
                'session': LiveLocationShareSerializer(live_share).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, user_id):
        """Get active live location sharing sessions."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'You can only view your own live location sessions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        active_sessions = LiveLocationShare.objects.filter(
            user=user,
            is_active=True,
            expires_at__gt=timezone.now()
        )
        
        return Response({
            'sessions': LiveLocationShareSerializer(active_sessions, many=True).data
        })


# Geofencing endpoints (Premium only)
class GeofenceListView(APIView):
    """
    List and create geofences (Premium only).
    GET /users/<user_id>/geofences/
    POST /users/<user_id>/geofences/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        """List user's geofences."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'You can only view your own geofences.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Geofencing is a Premium feature. Upgrade to Premium to use geofencing.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        geofences = Geofence.objects.filter(user=user, is_active=True)
        return Response({
            'geofences': GeofenceSerializer(geofences, many=True).data
        })
    
    def post(self, request, user_id):
        """Create a new geofence."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'You can only create geofences for your own account.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        if not is_premium:
            return Response({
                'error': 'Geofencing is a Premium feature. Upgrade to Premium to use geofencing.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = GeofenceCreateSerializer(data=request.data)
        if serializer.is_valid():
            geofence = Geofence.objects.create(
                user=user,
                name=serializer.validated_data['name'],
                center_location=serializer.validated_data['center_location'],
                radius_meters=serializer.validated_data['radius_meters'],
                alert_on_entry=serializer.validated_data['alert_on_entry'],
                alert_on_exit=serializer.validated_data['alert_on_exit']
            )
            
            logger.info(f"Geofence created: {user.email} - {geofence.name}")
            
            return Response({
                'message': 'Geofence created successfully',
                'geofence': GeofenceSerializer(geofence).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Community Alert endpoints
class CommunityAlertView(APIView):
    """
    Send community alert.
    POST /users/<user_id>/community_alert/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id):
        """Send a community alert."""
        if request.user.id != int(user_id):
            return Response(
                {'error': 'You can only send alerts for your own account.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        is_premium = _is_user_premium(user)
        
        serializer = CommunityAlertCreateSerializer(data=request.data)
        if serializer.is_valid():
            message = serializer.validated_data['message']
            location = serializer.validated_data['location']
            radius_meters = serializer.validated_data.get('radius_meters', 500)
            
            # Check free tier limit
            if not is_premium and radius_meters > FREE_TIER_LIMITS['COMMUNITY_ALERT_RADIUS_METERS']:
                return Response({
                    'error': f'Free plan allows alerts within {FREE_TIER_LIMITS["COMMUNITY_ALERT_RADIUS_METERS"]}m radius. Upgrade to Premium for unlimited radius.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Create community alert
            alert = CommunityAlert.objects.create(
                user=user,
                message=message,
                location=location,
                radius_meters=radius_meters,
                is_premium_alert=is_premium
            )
            
            logger.info(f"Community alert sent: {user.email} - {radius_meters}m radius")
            
            return Response({
                'message': 'Community alert sent successfully',
                'alert': CommunityAlertSerializer(alert).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChatGroupListView(APIView):
    """
    List and create chat groups.
    GET /users/<user_id>/chat_groups/ - List user's groups
    POST /users/<user_id>/chat_groups/ - Create a new group
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        """Get all groups the user is a member of."""
        try:
            user = User.objects.get(id=user_id)
            if request.user.id != user.id:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            groups = ChatGroup.objects.filter(members=user).distinct()
            serializer = ChatGroupSerializer(groups, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def post(self, request, user_id):
        """Create a new chat group."""
        try:
            user = User.objects.get(id=user_id)
            if request.user.id != user.id:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            serializer = ChatGroupCreateSerializer(data=request.data)
            if serializer.is_valid():
                # Check for duplicate group name (case-insensitive)
                group_name = serializer.validated_data['name'].strip()
                existing_group = ChatGroup.objects.filter(
                    name__iexact=group_name,
                    created_by=user
                ).first()
                
                if existing_group:
                    return Response(
                        {'error': 'A group with this name already exists. Please choose a different name.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                group = ChatGroup.objects.create(
                    name=group_name,
                    description=serializer.validated_data.get('description', ''),
                    created_by=user,
                    admin=user  # Creator is admin by default
                )
                # Add creator as member
                group.members.add(user)
                # Add other members
                member_ids = serializer.validated_data.get('member_ids', [])
                for member_id in member_ids:
                    try:
                        member = User.objects.get(id=member_id)
                        group.members.add(member)
                    except User.DoesNotExist:
                        continue
                
                return Response(ChatGroupSerializer(group).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


class ChatGroupDetailView(APIView):
    """
    Get, update, or delete a chat group.
    GET /users/<user_id>/chat_groups/<group_id>/ - Get group details
    DELETE /users/<user_id>/chat_groups/<group_id>/ - Delete group
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id, group_id):
        """Get group details."""
        try:
            user = User.objects.get(id=user_id)
            if request.user.id != user.id:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            group = ChatGroup.objects.get(id=group_id, members=user)
            serializer = ChatGroupSerializer(group)
            data = serializer.data
            # Add admin info
            data['admin_id'] = group.admin.id if group.admin else group.created_by.id
            data['is_admin'] = (group.admin and group.admin.id == user.id) or (not group.admin and group.created_by.id == user.id)
            return Response(data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except ChatGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def delete(self, request, user_id, group_id):
        """Delete a group (only admin can delete)."""
        try:
            user = User.objects.get(id=user_id)
            if request.user.id != user.id:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            group = ChatGroup.objects.get(id=group_id, members=user)
            
            # Check if user is admin (or creator if admin is not set)
            is_admin = (group.admin and group.admin.id == user.id) or (not group.admin and group.created_by.id == user.id)
            
            if not is_admin:
                return Response({'error': 'Only the group admin can delete the group'}, status=status.HTTP_403_FORBIDDEN)
            
            group.delete()
            return Response({'message': 'Group deleted successfully'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except ChatGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)


class ChatGroupMemberView(APIView):
    """
    Manage group members: add, remove, leave group.
    POST /users/<user_id>/chat_groups/<group_id>/members/ - Add members
    DELETE /users/<user_id>/chat_groups/<group_id>/members/<member_id>/ - Remove member
    POST /users/<user_id>/chat_groups/<group_id>/leave/ - Leave group
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, user_id, group_id):
        """Add members to a group."""
        try:
            user = User.objects.get(id=user_id)
            if request.user.id != user.id:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            group = ChatGroup.objects.get(id=group_id, members=user)
            member_ids = request.data.get('member_ids', [])
            
            if not isinstance(member_ids, list):
                return Response({'error': 'member_ids must be a list'}, status=status.HTTP_400_BAD_REQUEST)
            
            added_members = []
            for member_id in member_ids:
                try:
                    member = User.objects.get(id=member_id)
                    if member not in group.members.all():
                        group.members.add(member)
                        added_members.append(member_id)
                except User.DoesNotExist:
                    continue
            
            group.save()  # Update updated_at
            serializer = ChatGroupSerializer(group)
            data = serializer.data
            data['admin_id'] = group.admin.id if group.admin else group.created_by.id
            data['is_admin'] = (group.admin and group.admin.id == user.id) or (not group.admin and group.created_by.id == user.id)
            return Response(data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except ChatGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def delete(self, request, user_id, group_id, member_id=None):
        """Remove a member from a group (admin only) or leave group."""
        try:
            user = User.objects.get(id=user_id)
            if request.user.id != user.id:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            group = ChatGroup.objects.get(id=group_id, members=user)
            
            # Check if user is admin (or creator if admin is not set)
            is_admin = (group.admin and group.admin.id == user.id) or (not group.admin and group.created_by.id == user.id)
            
            if member_id:
                # Remove another member (admin only)
                if not is_admin:
                    return Response({'error': 'Only the group admin can remove members'}, status=status.HTTP_403_FORBIDDEN)
                
                try:
                    member_to_remove = User.objects.get(id=member_id)
                    if member_to_remove not in group.members.all():
                        return Response({'error': 'User is not a member of this group'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Cannot remove admin
                    if (group.admin and group.admin.id == member_to_remove.id) or (not group.admin and group.created_by.id == member_to_remove.id):
                        return Response({'error': 'Cannot remove the group admin'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    group.members.remove(member_to_remove)
                    group.save()
                    
                    serializer = ChatGroupSerializer(group)
                    data = serializer.data
                    data['admin_id'] = group.admin.id if group.admin else group.created_by.id
                    data['is_admin'] = (group.admin and group.admin.id == user.id) or (not group.admin and group.created_by.id == user.id)
                    return Response(data, status=status.HTTP_200_OK)
                except User.DoesNotExist:
                    return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
            else:
                # Leave group
                if is_admin:
                    # If admin is leaving, transfer admin to another member or creator
                    remaining_members = group.members.exclude(id=user.id)
                    if remaining_members.exists():
                        # Transfer admin to first remaining member
                        new_admin = remaining_members.first()
                        group.admin = new_admin
                        group.save()
                    # If no remaining members, admin can delete the group
                    # For now, we'll just remove the admin and let them leave
                    # The group will be orphaned but can be cleaned up later
                
                group.members.remove(user)
                group.save()
                
                return Response({'message': 'Left group successfully'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except ChatGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)


class ChatMessageListView(APIView):
    """
    List and create chat messages.
    GET /users/<user_id>/chat_groups/<group_id>/messages/ - Get messages
    POST /users/<user_id>/chat_groups/<group_id>/messages/ - Send a message
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id, group_id):
        """Get all messages in a group."""
        try:
            user = User.objects.get(id=user_id)
            if request.user.id != user.id:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            group = ChatGroup.objects.get(id=group_id, members=user)
            messages = ChatMessage.objects.filter(group=group).order_by('created_at')
            serializer = ChatMessageSerializer(messages, many=True, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except ChatGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def post(self, request, user_id, group_id):
        """Send a message to a group."""
        try:
            user = User.objects.get(id=user_id)
            if request.user.id != user.id:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            group = ChatGroup.objects.get(id=group_id, members=user)
            
            # Check file size if file is provided
            if 'file' in request.FILES:
                file = request.FILES['file']
                max_size = 2 * 1024 * 1024  # 2 MB
                if file.size > max_size:
                    return Response({'error': 'File size exceeds 2 MB limit'}, status=status.HTTP_400_BAD_REQUEST)
            
            if 'image' in request.FILES:
                image = request.FILES['image']
                max_size = 2 * 1024 * 1024  # 2 MB
                if image.size > max_size:
                    return Response({'error': 'Image size exceeds 2 MB limit'}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = ChatMessageCreateSerializer(data=request.data)
            if serializer.is_valid():
                message_data = {
                    'group': group,
                    'sender': user,
                    'text': serializer.validated_data.get('text', ''),
                }
                
                if 'image' in request.FILES:
                    message_data['image'] = request.FILES['image']
                
                if 'file' in request.FILES:
                    file = request.FILES['file']
                    message_data['file'] = file
                    message_data['file_name'] = serializer.validated_data.get('file_name') or file.name
                    message_data['file_size'] = serializer.validated_data.get('file_size') or file.size
                
                message = ChatMessage.objects.create(**message_data)
                # Update group's updated_at timestamp
                group.save()
                return Response(ChatMessageSerializer(message, context={'request': request}).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except ChatGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)


class ChatMessageDetailView(APIView):
    """
    Update and delete chat messages.
    PUT /users/<user_id>/chat_groups/<group_id>/messages/<message_id>/ - Edit a message
    DELETE /users/<user_id>/chat_groups/<group_id>/messages/<message_id>/ - Delete a message
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def put(self, request, user_id, group_id, message_id):
        """Edit a message (only sender can edit)."""
        try:
            user = User.objects.get(id=user_id)
            if request.user.id != user.id:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            group = ChatGroup.objects.get(id=group_id, members=user)
            message = ChatMessage.objects.get(id=message_id, group=group)
            
            # Only the sender can edit their message
            if message.sender.id != user.id:
                return Response({'error': 'You can only edit your own messages'}, status=status.HTTP_403_FORBIDDEN)
            
            serializer = ChatMessageCreateSerializer(message, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                # Update group's updated_at timestamp
                group.save()
                return Response(ChatMessageSerializer(message).data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except ChatGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
        except ChatMessage.DoesNotExist:
            return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def delete(self, request, user_id, group_id, message_id):
        """Delete a message (only sender can delete)."""
        try:
            user = User.objects.get(id=user_id)
            if request.user.id != user.id:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            group = ChatGroup.objects.get(id=group_id, members=user)
            message = ChatMessage.objects.get(id=message_id, group=group)
            
            # Only the sender can delete their message
            if message.sender.id != user.id:
                return Response({'error': 'You can only delete your own messages'}, status=status.HTTP_403_FORBIDDEN)
            
            message.delete()
            # Update group's updated_at timestamp
            group.save()
            return Response({'message': 'Message deleted successfully'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except ChatGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
        except ChatMessage.DoesNotExist:
            return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)


class AvailableUsersListView(APIView):
    """
    Get list of available users for group creation.
    GET /users/available_users/?geofence_only=true&include_other_geofences=false&search=query
    - geofence_only: if true, only show users within same geofences (default: true)
    - include_other_geofences: if true, include users from other geofences (default: false)
    - search: search query to filter users by name or email
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def _is_within_geofence(self, user_location, geofence_center, radius_meters):
        """Check if user location is within a geofence using simple distance calculation."""
        if not user_location or not geofence_center:
            return False
        
        try:
            import math
            # Extract coordinates
            if isinstance(user_location, dict):
                lat1 = user_location.get('latitude') or user_location.get('lat', 0)
                lng1 = user_location.get('longitude') or user_location.get('lng', 0)
            else:
                return False
            
            if isinstance(geofence_center, dict):
                lat2 = geofence_center.get('latitude') or geofence_center.get('lat', 0)
                lng2 = geofence_center.get('longitude') or geofence_center.get('lng', 0)
            else:
                return False
            
            # Haversine distance calculation (more accurate)
            R = 6371000  # Earth radius in meters
            phi1 = math.radians(lat1)
            phi2 = math.radians(lat2)
            delta_phi = math.radians(lat2 - lat1)
            delta_lambda = math.radians(lng2 - lng1)
            
            a = math.sin(delta_phi / 2) ** 2 + \
                math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            distance = R * c
            
            return distance <= radius_meters
        except Exception:
            return False
    
    def get(self, request):
        """Get users filtered by geofence and search query."""
        geofence_only = request.query_params.get('geofence_only', 'true').lower() == 'true'
        include_other_geofences = request.query_params.get('include_other_geofences', 'false').lower() == 'true'
        search_query = request.query_params.get('search', '').strip()
        
        # Get all active users except current user
        users = User.objects.exclude(id=request.user.id).filter(is_active=True)
        
        # Apply search filter
        if search_query:
            from django.db.models import Q
            query = Q(email__icontains=search_query) | Q(first_name__icontains=search_query) | Q(last_name__icontains=search_query)
            if hasattr(User, 'name'):
                query |= Q(name__icontains=search_query)
            users = users.filter(query)
        
        user_list = []
        current_user_geofences = []
        
        # Get current user's geofences if filtering by geofence
        if geofence_only:
            try:
                from .models import Geofence
                current_user_geofences = Geofence.objects.filter(
                    user=request.user,
                    is_active=True
                ).values('center_location', 'radius_meters')
            except Exception as e:
                logger.error(f"Error fetching geofences: {e}")
                current_user_geofences = []
        
        # Get current user's location
        current_user_location = None
        if hasattr(request.user, 'location') and request.user.location:
            current_user_location = request.user.location
        
        for user in users:
            # Get user's location
            user_location = None
            if hasattr(user, 'location') and user.location:
                user_location = user.location
            
            # Filter by geofence if enabled
            if geofence_only and current_user_geofences:
                if not user_location:
                    continue  # Skip users without location
                
                is_within_geofence = False
                for geofence in current_user_geofences:
                    center = geofence.get('center_location')
                    radius = geofence.get('radius_meters', 100)
                    if self._is_within_geofence(user_location, center, radius):
                        is_within_geofence = True
                        break
                
                if not is_within_geofence:
                    # If include_other_geofences is true, still include them
                    if not include_other_geofences:
                        continue
            
            user_list.append({
                'id': user.id,
                'name': user.name if hasattr(user, 'name') and user.name else (user.first_name + ' ' + user.last_name).strip() or user.email,
                'email': user.email,
                'first_name': getattr(user, 'first_name', ''),
                'last_name': getattr(user, 'last_name', ''),
            })
        
        return Response(user_list, status=status.HTTP_200_OK)
