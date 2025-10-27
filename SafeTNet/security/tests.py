from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import SOSAlert

User = get_user_model()


class SOSAlertModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='USER'
        )
    
    def test_sos_alert_creation(self):
        alert = SOSAlert.objects.create(
            user=self.user,
            location_lat=40.7128,
            location_long=-74.0060,
            message='Help me!',
            status='active'
        )
        
        self.assertEqual(alert.user, self.user)
        self.assertEqual(alert.location_lat, 40.7128)
        self.assertEqual(alert.location_long, -74.0060)
        self.assertEqual(alert.message, 'Help me!')
        self.assertEqual(alert.status, 'active')
        self.assertIsNotNone(alert.created_at)
    
    def test_sos_alert_str_representation(self):
        alert = SOSAlert.objects.create(
            user=self.user,
            location_lat=40.7128,
            location_long=-74.0060
        )
        
        expected = f"SOS Alert from {self.user.username} at {alert.created_at.strftime('%Y-%m-%d %H:%M')}"
        self.assertEqual(str(alert), expected)


class SOSAlertAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='USER'
        )
        
        self.super_admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            role='SUPER_ADMIN'
        )
        
        self.sub_admin = User.objects.create_user(
            username='subadmin',
            email='subadmin@example.com',
            password='subadminpass123',
            role='SUB_ADMIN'
        )
    
    def get_auth_headers(self, user):
        refresh = RefreshToken.for_user(user)
        return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}
    
    def test_create_sos_alert_authenticated_user(self):
        url = '/api/security/sos/'
        data = {
            'location_lat': 40.7128,
            'location_long': -74.0060,
            'message': 'Emergency!'
        }
        
        response = self.client.post(
            url, 
            data, 
            format='json',
            **self.get_auth_headers(self.user)
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(SOSAlert.objects.filter(user=self.user).exists())
        self.assertEqual(response.data['location_lat'], 40.7128)
        self.assertEqual(response.data['location_long'], -74.0060)
        self.assertEqual(response.data['message'], 'Emergency!')
    
    def test_create_sos_alert_unauthenticated(self):
        url = '/api/security/sos/'
        data = {
            'location_lat': 40.7128,
            'location_long': -74.0060,
            'message': 'Emergency!'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_sos_alerts_super_admin(self):
        # Create some test alerts
        SOSAlert.objects.create(
            user=self.user,
            location_lat=40.7128,
            location_long=-74.0060,
            message='Test alert 1'
        )
        
        url = '/api/security/sos/'
        response = self.client.get(
            url,
            **self.get_auth_headers(self.super_admin)
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_list_sos_alerts_sub_admin(self):
        # Create some test alerts
        SOSAlert.objects.create(
            user=self.user,
            location_lat=40.7128,
            location_long=-74.0060,
            message='Test alert 1'
        )
        
        url = '/api/security/sos/'
        response = self.client.get(
            url,
            **self.get_auth_headers(self.sub_admin)
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Sub-admin should see alerts (organization filtering would be applied in real scenario)
    
    def test_list_sos_alerts_regular_user_forbidden(self):
        url = '/api/security/sos/'
        response = self.client.get(
            url,
            **self.get_auth_headers(self.user)
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_resolve_sos_alert(self):
        alert = SOSAlert.objects.create(
            user=self.user,
            location_lat=40.7128,
            location_long=-74.0060,
            message='Test alert'
        )
        
        url = f'/api/security/sos/{alert.id}/resolve/'
        response = self.client.patch(
            url,
            **self.get_auth_headers(self.super_admin)
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        alert.refresh_from_db()
        self.assertEqual(alert.status, 'resolved')
    
    def test_active_alerts_endpoint(self):
        # Create active and resolved alerts
        SOSAlert.objects.create(
            user=self.user,
            location_lat=40.7128,
            location_long=-74.0060,
            status='active'
        )
        SOSAlert.objects.create(
            user=self.user,
            location_lat=40.7128,
            location_long=-74.0060,
            status='resolved'
        )
        
        url = '/api/security/sos/active/'
        response = self.client.get(
            url,
            **self.get_auth_headers(self.super_admin)
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['status'], 'active')
    
    def test_resolved_alerts_endpoint(self):
        # Create active and resolved alerts
        SOSAlert.objects.create(
            user=self.user,
            location_lat=40.7128,
            location_long=-74.0060,
            status='active'
        )
        SOSAlert.objects.create(
            user=self.user,
            location_lat=40.7128,
            location_long=-74.0060,
            status='resolved'
        )
        
        url = '/api/security/sos/resolved/'
        response = self.client.get(
            url,
            **self.get_auth_headers(self.super_admin)
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['status'], 'resolved')