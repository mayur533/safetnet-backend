from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'sos', views.SOSAlertViewSet, basename='sos-alert')
router.register(r'case', views.CaseViewSet, basename='case')

urlpatterns = [
    path('', include(router.urls)),
    path('navigation/', views.NavigationView.as_view(), name='navigation'),
    path('incidents/', views.IncidentsView.as_view(), name='incidents'),
]
