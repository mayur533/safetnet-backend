from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import SOSAlert, Case, Incident, OfficerProfile, Notification  # new models for security_app
from users.models import Geofence
import math

User = get_user_model()


class SOSAlertSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    geofence_name = serializers.CharField(source='geofence.name', read_only=True)
    assigned_officer_name = serializers.CharField(source='assigned_officer.name', read_only=True)

    class Meta:
        model = SOSAlert
        fields = (
            'id', 'user', 'user_username', 'user_email', 'geofence', 'geofence_name',
            'location_lat', 'location_long', 'status', 'priority', 'assigned_officer', 'assigned_officer_name',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user', 'user_username', 'user_email', 'created_at', 'updated_at')


class SOSAlertCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SOSAlert
        fields = ('geofence', 'location_lat', 'location_long', 'priority')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class CaseSerializer(serializers.ModelSerializer):
    sos_user_username = serializers.CharField(source='sos_alert.user.username', read_only=True)
    officer_name = serializers.CharField(source='officer.name', read_only=True)
    sos_alert_status = serializers.CharField(source='sos_alert.status', read_only=True)

    class Meta:
        model = Case
        fields = (
            'id', 'sos_alert', 'sos_user_username', 'officer', 'officer_name',
            'description', 'status', 'sos_alert_status', 'updated_at'
        )
        read_only_fields = ('id', 'updated_at')


class CaseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ('sos_alert', 'description')

    def create(self, validated_data):
        # Auto-assign the current officer
        try:
            from users.models import SecurityOfficer
            officer = SecurityOfficer.objects.get(email=self.context['request'].user.email)
            validated_data['officer'] = officer
        except SecurityOfficer.DoesNotExist:
            pass
        return super().create(validated_data)


class CaseUpdateStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ('status', 'description')

    def validate_status(self, value):
        if value not in dict(Case.STATUS_CHOICES):
            raise serializers.ValidationError('Invalid status value.')
        return value


class IncidentSerializer(serializers.ModelSerializer):
    officer_name = serializers.CharField(source='officer.name', read_only=True)
    sos_status = serializers.CharField(source='sos_alert.status', read_only=True)

    class Meta:
        model = Incident
        fields = (
            'id', 'officer', 'officer_name', 'sos_alert', 'case', 'description',
            'location_lat', 'location_long', 'status', 'sos_status', 'timestamp'
        )
        read_only_fields = ('id', 'timestamp')


class OfficerProfileSerializer(serializers.ModelSerializer):
    officer_name = serializers.CharField(source='officer.name', read_only=True)
    officer_phone = serializers.CharField(source='officer.contact', read_only=True)
    officer_geofence = serializers.CharField(source='officer.assigned_geofence.name', read_only=True)

    class Meta:
        model = OfficerProfile
        fields = (
            'officer',
            'officer_name',
            'officer_phone',
            'officer_geofence',
            'on_duty',
            'last_latitude',
            'last_longitude',
            'last_seen_at',
            'battery_level',
            'updated_at',
        )
        read_only_fields = (
            'officer',
            'officer_name',
            'officer_phone',
            'officer_geofence',
            'last_seen_at',
            'updated_at',
        )


class NotificationSerializer(serializers.ModelSerializer):
    officer_name = serializers.CharField(source='officer.name', read_only=True)
    sos_alert_id = serializers.IntegerField(source='sos_alert.id', read_only=True)
    case_id = serializers.IntegerField(source='case.id', read_only=True)

    class Meta:
        model = Notification
        fields = (
            'id', 'officer', 'officer_name', 'title', 'message', 'notification_type',
            'is_read', 'sos_alert', 'sos_alert_id', 'case', 'case_id',
            'created_at', 'read_at'
        )
        read_only_fields = ('id', 'officer', 'created_at', 'read_at')


class NotificationAcknowledgeSerializer(serializers.Serializer):
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of notification IDs to mark as read"
    )


class GeofenceSerializer(serializers.ModelSerializer):
    """Serializer for Geofence model for security officers"""
    polygon_json = serializers.SerializerMethodField()
    center_point = serializers.SerializerMethodField()
    radius = serializers.SerializerMethodField()
    area_size = serializers.SerializerMethodField()
    active_users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Geofence
        fields = [
            'id',
            'name',
            'description',
            'polygon_json',
            'center_point',
            'radius',
            'area_size',
            'active_users_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'polygon_json', 'center_point', 'radius', 'area_size', 'active_users_count']
    
    def get_polygon_json(self, obj):
        """Convert GeoJSON polygon to simple array format [[lat, lon], [lat, lon], ...]"""
        try:
            coordinates = obj.get_polygon_coordinates()
            if not coordinates or not coordinates[0]:
                return []
            
            # GeoJSON format: coordinates[0] is the outer ring
            ring = coordinates[0]
            # GeoJSON stores as [lon, lat], convert to [lat, lon] for frontend
            polygon_array = [[coord[1], coord[0]] for coord in ring]
            return polygon_array
        except Exception:
            return []
    
    def get_center_point(self, obj):
        """Get center point of the polygon"""
        center = obj.get_center_point()
        if center:
            # Convert from [lat, lon] to [lat, lon] format (already correct)
            return center
        return None
    
    def get_radius(self, obj):
        """Calculate approximate radius in meters"""
        # This is a placeholder - radius calculation for polygon is complex
        # For now, return None as polygon geofences don't have a simple radius
        return None
    
    def get_area_size(self, obj):
        """Calculate area size in square kilometers"""
        try:
            coordinates = obj.get_polygon_coordinates()
            if not coordinates or not coordinates[0]:
                return None
            
            ring = coordinates[0]
            if len(ring) < 3:
                return None
            
            # Convert GeoJSON [lon, lat] to [lat, lon] for calculation
            points = [[coord[1], coord[0]] for coord in ring]
            
            # Calculate area using shoelace formula
            area = 0.0
            for i in range(len(points)):
                j = (i + 1) % len(points)
                area += points[i][0] * points[j][1]  # lat * lon
                area -= points[j][0] * points[i][1]  # lat * lon
            area = abs(area) / 2.0
            
            # Get center point for scaling
            center = obj.get_center_point()
            if center:
                avg_lat = center[0]
                # Convert to square kilometers
                # 1 degree lat ≈ 111 km
                km_per_deg_lat = 111.0
                km_per_deg_lon = 111.0 * abs(math.cos(math.radians(avg_lat)))
                area_km2 = area * km_per_deg_lat * km_per_deg_lon
                return round(area_km2, 2)
            
            return None
        except Exception:
            return None
    
    def get_active_users_count(self, obj):
        """Count active users in this geofence"""
        try:
            from users.models import User
            # Count users who have this geofence assigned
            count = User.objects.filter(
                geofences=obj,
                is_active=True
            ).count()
            return count
        except Exception:
            return 0


class OfficerLoginSerializer(serializers.Serializer):
    """
    Serializer for security officer login.
    Accepts username and password.
    """
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        if not username:
            raise serializers.ValidationError({"username": "Username is required."})
        
        if not password:
            raise serializers.ValidationError({"password": "Password is required."})

        # Authenticate user
        try:
            user = User.objects.get(username=username, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError({"non_field_errors": "Invalid credentials."})

        # Check password
        if not user.check_password(password):
            raise serializers.ValidationError({"non_field_errors": "Invalid credentials."})

        # Check role - must be security_officer
        if user.role != "security_officer":
            raise serializers.ValidationError({"non_field_errors": "This account is not a security officer."})

        # Return authenticated user
        attrs["user"] = user
        return attrs

