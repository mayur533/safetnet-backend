from rest_framework import serializers
from .models import SOSAlert, Case
from users.models import SecurityOfficer


class SOSAlertSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = SOSAlert
        fields = (
            'id', 'user', 'user_username', 'user_email',
            'location_lat', 'location_long', 'message', 'status',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user_username', 'user_email', 'created_at', 'updated_at')


class SOSAlertCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SOSAlert
        fields = ('location_lat', 'location_long', 'message')
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class CaseSerializer(serializers.ModelSerializer):
    sos_user_username = serializers.CharField(source='sos_alert.user.username', read_only=True)
    assigned_officer_name = serializers.CharField(source='assigned_officer.name', read_only=True)

    class Meta:
        model = Case
        fields = (
            'id', 'sos_alert', 'sos_user_username', 'assigned_officer', 'assigned_officer_name',
            'status', 'notes', 'updated_at'
        )
        read_only_fields = ('id', 'updated_at')


class CaseUpdateStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ('status', 'notes')

    def validate_status(self, value):
        if value not in dict(Case.STATUS_CHOICES):
            raise serializers.ValidationError('Invalid status value.')
        return value
