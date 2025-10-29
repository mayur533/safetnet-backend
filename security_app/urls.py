from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'sos', views.SOSAlertViewSet, basename='security-sos')
router.register(r'case', views.CaseViewSet, basename='security-case')

urlpatterns = [
    path('', include(router.urls)),
    path('navigation/', views.NavigationView.as_view(), name='security-navigation'),
    path('incidents/', views.IncidentsView.as_view(), name='security-incidents'),
    path('login/', views.OfficerLoginView.as_view(), name='security-login'),
    path('profile/', views.OfficerProfileView.as_view(), name='security-profile'),
    path('notifications/', views.NotificationView.as_view(), name='security-notifications'),
    path('notifications/acknowledge/', views.NotificationAcknowledgeView.as_view(), name='security-notifications-acknowledge'),
    path('dashboard/', views.DashboardView.as_view(), name='security-dashboard'),
]

