"""
API views for User models.
"""
import logging
from django.http import Http404
from django.db.models import Count
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User, FamilyContact, CommunityMembership, SOSEvent, UserDevice, Notification, GeofenceZone
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    FamilyContactSerializer, FamilyContactCreateSerializer,
    CommunityMembershipSerializer, CommunityMembershipCreateSerializer,
    SOSEventSerializer, SOSTriggerSerializer, UserLocationUpdateSerializer,
    UserDeviceSerializer, NotificationSerializer, GeofenceZoneSerializer
)
from .services import SMSService, GeofenceService

logger = logging.getLogger(__name__)


# ---------------------- USER REGISTRATION ----------------------
class UserRegistrationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
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


# ---------------------- USER LOGIN ----------------------
class UserLoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
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


# ---------------------- USER PROFILE ----------------------
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    # ---------------------- GET PROFILE OBJECT ----------------------
    def get_object(self):
        user = self.request.user
        profile, created = UserProfile.objects.get_or_create(user=user)
        return profile

    # ---------------------- GET PROFILE ----------------------
    def get(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data)

    # ---------------------- UPDATE FULL PROFILE ----------------------
    def put(self, request, *args, **kwargs):
        profile = self.get_object()
        serializer = self.get_serializer(profile, data=request.data, partial=False)

        if serializer.is_valid():
            serializer.save()
            logger.info(f"User profile updated: {profile.user.email}")
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ---------------------- PARTIAL UPDATE PROFILE ----------------------
    def patch(self, request, *args, **kwargs):
        profile = self.get_object()
        serializer = self.get_serializer(profile, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            logger.info(f"User profile updated: {profile.user.email}")
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------- USER LOCATION ----------------------
class UserLocationUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
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


# ---------------------- FAMILY CONTACTS ----------------------
class FamilyContactListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FamilyContact.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return FamilyContactCreateSerializer
        return FamilyContactSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        logger.info(f"Family contact created for user: {self.request.user.email}")


class FamilyContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FamilyContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FamilyContact.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        logger.info(f"Family contact deleted for user: {request.user.email}")
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------- COMMUNITY MEMBERSHIP ----------------------
class CommunityMembershipListView(generics.ListAPIView):
    serializer_class = CommunityMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CommunityMembership.objects.filter(user=self.request.user, is_active=True)


class CommunityJoinView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        if request.user.id != int(user_id):
            return Response({'error': 'Cannot join communities for another user.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = CommunityMembershipCreateSerializer(data=request.data)
        if serializer.is_valid():
            membership = CommunityMembership.objects.create(
                user=request.user,
                community_id=serializer.validated_data['community_id'],
                community_name=serializer.validated_data['community_name']
            )
            logger.info(f"User joined community: {request.user.email}")
            return Response({
                'message': 'Successfully joined community',
                'membership': CommunityMembershipSerializer(membership).data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CommunityLeaveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id, community_id):
        if request.user.id != int(user_id):
            return Response({'error': 'Cannot leave communities for another user.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            membership = CommunityMembership.objects.get(user=request.user, community_id=community_id)
            membership.is_active = False
            membership.save()
            logger.info(f"User left community: {request.user.email}")
            return Response({'message': 'Successfully left community'}, status=status.HTTP_200_OK)
        except CommunityMembership.DoesNotExist:
            return Response({'error': 'Membership not found.'}, status=status.HTTP_404_NOT_FOUND)


# ---------------------- SOS EVENTS ----------------------
class SOSTriggerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        if request.user.id != int(user_id):
            return Response({'error': 'Cannot trigger SOS for another user.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SOSTriggerSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            longitude = serializer.validated_data.get('longitude')
            latitude = serializer.validated_data.get('latitude')
            notes = serializer.validated_data.get('notes', '')

            # Create SOS event
            sos_event = SOSEvent.objects.create(
                user=user,
                notes=notes,
                location={'longitude': longitude, 'latitude': latitude} if longitude and latitude else None,
                status='triggered'
            )

            # Trigger emergency response (SMS + geofence)
            from .services import EmergencyService
            emergency_service = EmergencyService()
            emergency_service.trigger_emergency_response(user, sos_event)

            return Response({
                'message': 'SOS event triggered successfully',
                'sos_event': SOSEventSerializer(sos_event).data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SOSEventListView(generics.ListAPIView):
    serializer_class = SOSEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SOSEvent.objects.filter(user=self.request.user)


# ---------------------- USER STATS ----------------------
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_stats(request, user_id):
    if request.user.id != int(user_id):
        return Response({'error': 'Cannot view stats for another user.'}, status=status.HTTP_403_FORBIDDEN)

    user = request.user

    # Family contacts count
    total_family_contacts = user.family_contacts.count()

    # Active community memberships
    active_community_memberships = user.community_memberships.filter(is_active=True).count()

    # SOS events count
    sos_events_counts = user.sos_events.values('status').annotate(count=Count('id'))
    sos_status_dict = {status['status']: status['count'] for status in sos_events_counts}

    stats = {
        'total_family_contacts': total_family_contacts,
        'active_community_memberships': active_community_memberships,
        'total_sos_events': user.sos_events.count(),
        'sos_events_status': {
            'triggered': sos_status_dict.get('triggered', 0),
            'sms_sent': sos_status_dict.get('sms_sent', 0),
            'police_called': sos_status_dict.get('police_called', 0),
            'geofence_alerted': sos_status_dict.get('geofence_alerted', 0),
            'resolved': sos_status_dict.get('resolved', 0),
        },
        'is_premium': getattr(user, 'is_premium', False),  # if property exists
        'plan_type': user.plantype,
        'plan_expiry': user.planexpiry,
    }

    return Response(stats, status=status.HTTP_200_OK)

# -------------------- USER DEVICES --------------------
class UserDeviceListCreateView(generics.ListCreateAPIView):
    serializer_class = UserDeviceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserDevice.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserDeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserDeviceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserDevice.objects.filter(user=self.request.user)


# -------------------- NOTIFICATIONS --------------------
class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id, user=request.user)
            notification.is_read = True
            notification.save()
            return Response({'message': 'Notification marked as read.'})
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found.'}, status=404)


# -------------------- GEOFENCE --------------------
class GeofenceZoneListView(generics.ListCreateAPIView):
    serializer_class = GeofenceZoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return GeofenceZone.objects.all()


class GeofenceZoneDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GeofenceZoneSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = GeofenceZone.objects.all()


# -------------------- PREMIUM PLAN API --------------------
class UpgradePlanView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan_type = request.data.get('plan_type')
        if plan_type not in ['free', 'premium', 'gold']:
            return Response({'error': 'Invalid plan type.'}, status=400)

        request.user.plantype = plan_type
        import datetime
        request.user.planexpiry = datetime.date.today() + datetime.timedelta(days=30)  # 1 month plan
        request.user.save()
        return Response({'message': f'Plan upgraded to {plan_type}', 'plan_expiry': request.user.planexpiry})


# -------------------- SOS HISTORY FILTER --------------------
class SOSEventFilterView(generics.ListAPIView):
    serializer_class = SOSEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        status_filter = self.request.query_params.get('status')
        qs = SOSEvent.objects.filter(user=user)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by('-triggered_at')


# -------------------- FAMILY CONTACT COUNT --------------------
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def family_contact_count(request):
    count = FamilyContact.objects.filter(user=request.user).count()
    return Response({'total_family_contacts': count})


# -------------------- COMMUNITY COUNT --------------------
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def community_count(request):
    count = CommunityMembership.objects.filter(user=request.user, is_active=True).count()
    return Response({'active_communities': count})
