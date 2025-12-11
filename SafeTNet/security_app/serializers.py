from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import SOSAlert, Case, Incident, OfficerProfile, Notification  # new models for security_app

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
    geofence_id = serializers.SerializerMethodField()
    assigned_geofence = serializers.SerializerMethodField()

    class Meta:
        model = OfficerProfile
        fields = (
            'officer',
            'officer_name',
            'officer_phone',
            'officer_geofence',
            'geofence_id',
            'assigned_geofence',
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
            'geofence_id',
            'assigned_geofence',
            'last_seen_at',
            'updated_at',
        )
    
    def get_geofence_id(self, obj):
        """Return the assigned geofence ID"""
        geofence = obj.officer.assigned_geofence
        return geofence.id if geofence else None
    
    def get_assigned_geofence(self, obj):
        """Return full geofence details if assigned"""
        geofence = obj.officer.assigned_geofence
        if not geofence:
            return None
        
        return {
            'id': geofence.id,
            'name': geofence.name,
            'description': geofence.description,
            'polygon_json': geofence.polygon_json,
            'active': geofence.active,
            'center_point': geofence.get_center_point(),
            'organization': geofence.organization.name if geofence.organization else None,
            'created_at': geofence.created_at.isoformat() if geofence.created_at else None,
            'updated_at': geofence.updated_at.isoformat() if geofence.updated_at else None,
        }
    
    def get_assigned_geofence(self, obj):
        """Return full geofence details if assigned"""
        geofence = obj.officer.assigned_geofence
        if not geofence:
            return None
        
        return {
            'id': geofence.id,
            'name': geofence.name,
            'description': geofence.description,
            'polygon_json': geofence.polygon_json,
            'active': geofence.active,
            'center_point': geofence.get_center_point(),
            'organization': geofence.organization.name if geofence.organization else None,
            'created_at': geofence.created_at.isoformat() if geofence.created_at else None,
            'updated_at': geofence.updated_at.isoformat() if geofence.updated_at else None,
        }


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

