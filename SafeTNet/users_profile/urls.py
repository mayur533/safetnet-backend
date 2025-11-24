"""
URL configuration for users app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import views_new_apis

app_name = 'users'

urlpatterns = [
    # User registration and authentication
    path('', views.UserRegistrationView.as_view(), name='user-registration'),
    path('login/', views.UserLoginView.as_view(), name='user-login'),
    
    # User profile management
    path('profile/', views.UserProfileView.as_view(), name='user-profile-current'),
    path('<int:user_id>/', views.UserProfileView.as_view(), name='user-profile'),
    path('<int:user_id>/location/', views.UserLocationUpdateView.as_view(), name='user-location-update'),
    path('<int:user_id>/stats/', views.user_stats, name='user-stats'),
    
    # Family contacts management
    path('<int:user_id>/family_contacts/', views.FamilyContactListView.as_view(), name='family-contacts-list'),
    path('<int:user_id>/family_contacts/<int:contact_id>/', views.FamilyContactDetailView.as_view(), name='family-contact-detail'),
    
    # Community management
    path('<int:user_id>/communities/', views.CommunityMembershipListView.as_view(), name='community-memberships-list'),
    path('<int:user_id>/communities/join/', views.CommunityJoinView.as_view(), name='community-join'),
    path('<int:user_id>/communities/<str:community_id>/leave/', views.CommunityLeaveView.as_view(), name='community-leave'),
    
    # SOS functionality
    path('<int:user_id>/sos/', views.SOSTriggerView.as_view(), name='sos-trigger'),
    path('<int:user_id>/sos_events/', views.SOSEventListView.as_view(), name='sos-events-list'),
    
    # Subscription/Billing
    path('subscribe/', views.SubscriptionView.as_view(), name='subscribe'),
    path('subscribe/cancel/', views.CancelSubscriptionView.as_view(), name='cancel-subscription'),
    
    # Live Location Sharing
    path('<int:user_id>/live_location/', views.LiveLocationShareView.as_view(), name='live-location'),
    path('<int:user_id>/live_location/start/', views.LiveLocationShareView.as_view(), name='live-location-start'),
    
    # Geofencing (Premium only)
    path('<int:user_id>/geofences/', views.GeofenceListView.as_view(), name='geofences'),
    
    # Community Alerts
    path('<int:user_id>/community_alert/', views.CommunityAlertView.as_view(), name='community-alert'),
    
    # New APIs
    path('nearby_help/', views_new_apis.nearby_help_map, name='nearby-help'),
    path('safety_tips/', views_new_apis.safety_tips_feed, name='safety-tips'),
    path('<int:user_id>/emergency_response/', views_new_apis.EmergencyResponseCenterView.as_view(), name='emergency-response'),
    path('<int:user_id>/trusted_circle/', views_new_apis.TrustedCircleView.as_view(), name='trusted-circle'),
    path('<int:user_id>/custom_alerts/', views_new_apis.CustomAlertMessagesView.as_view(), name='custom-alerts'),
    path('<int:user_id>/ai_threat_detection/', views_new_apis.AIThreatDetectionView.as_view(), name='ai-threat-detection'),
    path('<int:user_id>/recordings/', views_new_apis.RecordingView.as_view(), name='recordings'),
    path('<int:user_id>/cloud_backup/', views_new_apis.CloudBackupView.as_view(), name='cloud-backup'),
    path('<int:user_id>/panic_mode/', views_new_apis.PanicModeAutomationView.as_view(), name='panic-mode'),
    path('<int:user_id>/devices/', views_new_apis.MultiDeviceSyncView.as_view(), name='multi-device-sync'),
]
