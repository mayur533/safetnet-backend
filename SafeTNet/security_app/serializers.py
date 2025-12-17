from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import SOSAlert, Case, Incident, OfficerProfile, Notification  # new models for security_app

User = get_user_model()


class SOSAlertSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    geofence_name = serializers.CharField(source='geofence.name', read_only=True)
    assigned_officer_name = serializers.SerializerMethodField()
    
    def get_assigned_officer_name(self, obj):
        if obj.assigned_officer:
            name = f"{obj.assigned_officer.first_name} {obj.assigned_officer.last_name}".strip()
            return name or obj.assigned_officer.username
        return None

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
    officer_name = serializers.SerializerMethodField()
    
    def get_officer_name(self, obj):
        if obj.officer:
            name = f"{obj.officer.first_name} {obj.officer.last_name}".strip()
            return name or obj.officer.username
        return None
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
        # Auto-assign the current user (who must be a security officer)
        request_user = self.context['request'].user
        if request_user.role == 'security_officer':
            validated_data['officer'] = request_user
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
    officer_name = serializers.SerializerMethodField()
    
    def get_officer_name(self, obj):
        if obj.officer:
            name = f"{obj.officer.first_name} {obj.officer.last_name}".strip()
            return name or obj.officer.username
        return None
    sos_status = serializers.CharField(source='sos_alert.status', read_only=True)

    class Meta:
        model = Incident
        fields = (
            'id', 'officer', 'officer_name', 'sos_alert', 'case', 'description',
            'location_lat', 'location_long', 'status', 'sos_status', 'timestamp'
        )
        read_only_fields = ('id', 'timestamp')


class OfficerProfileSerializer(serializers.ModelSerializer):
    officer_name = serializers.SerializerMethodField()
    
    def get_officer_name(self, obj):
        if obj.officer:
            name = f"{obj.officer.first_name} {obj.officer.last_name}".strip()
            return name or obj.officer.username
        return None
    officer_phone = serializers.SerializerMethodField()
    officer_geofence = serializers.SerializerMethodField()
    
    def get_officer_phone(self, obj):
        # Contact/phone is not stored in User model, return email instead
        return obj.officer.email if obj.officer else None
    
    def get_officer_geofence(self, obj):
        # Get the first geofence from User.geofences ManyToManyField
        if obj.officer and obj.officer.geofences.exists():
            return obj.officer.geofences.first().name
        return None

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
    officer_name = serializers.SerializerMethodField()
    
    def get_officer_name(self, obj):
        if obj.officer:
            name = f"{obj.officer.first_name} {obj.officer.last_name}".strip()
            return name or obj.officer.username
        return None
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

