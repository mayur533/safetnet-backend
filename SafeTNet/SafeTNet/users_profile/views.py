"""
API views for User models.
"""
import logging
from django.http import Http404
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User, FamilyContact, CommunityMembership, SOSEvent
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    FamilyContactSerializer, FamilyContactCreateSerializer,
    CommunityMembershipSerializer, CommunityMembershipCreateSerializer,
    SOSEventSerializer, SOSTriggerSerializer, UserLocationUpdateSerializer
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

            sos_event = SOSEvent.objects.create(
                user=user,
                notes=notes,
                longitude=longitude,
                latitude=latitude
            )

            # Send SMS to family contacts
            sms_service = SMSService()
            for contact in FamilyContact.objects.filter(user=user):
                try:
                    sms_service.send_sos_alert(
                        to_phone=contact.phone,
                        user_name=user.name,
                        user_phone=user.phone,
                        location={'longitude': longitude, 'latitude': latitude}
                    )
                    logger.info(f"SOS SMS sent to {contact.phone}")
                except Exception as e:
                    logger.error(f"Failed to send SOS SMS to {contact.phone}: {str(e)}")

            # Geofence alerts
            geofence_service = GeofenceService()
            try:
                geofence_service.check_and_alert_geofence(
                    user=user,
                    location={'longitude': longitude, 'latitude': latitude},
                    sos_event=sos_event
                )
            except Exception as e:
                logger.error(f"Geofence check failed: {str(e)}")

            sos_event.status = 'sms_sent'
            sos_event.save()

            logger.info(f"SOS event triggered for user: {user.email}")

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
    stats = {
        'total_family_contacts': FamilyContact.objects.filter(user=user).count(),
        'active_community_memberships': CommunityMembership.objects.filter(user=user, is_active=True).count(),
        'total_sos_events': SOSEvent.objects.filter(user=user).count(),
        'is_premium': user.is_premium,
        'plan_type': user.plantype,
        'plan_expiry': user.planexpiry,
    }
    return Response(stats)
