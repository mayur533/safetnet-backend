from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import OfficerGeofenceAssignment
from users.models import Geofence

User = get_user_model()


class OfficerGeofenceAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for officer geofence assignments"""
    
    officer_name = serializers.CharField(source='officer.username', read_only=True)
    geofence_name = serializers.CharField(source='geofence.name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.username', read_only=True)
    
    class Meta:
        model = OfficerGeofenceAssignment
        fields = [
            'id',
            'officer',
            'officer_name',
            'geofence',
            'geofence_name',
            'assigned_by',
            'assigned_by_name',
            'assigned_at',
            'is_active'
        ]
        read_only_fields = ['id', 'assigned_at', 'assigned_by']


class GeofenceAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for creating geofence assignments"""
    
    class Meta:
        model = OfficerGeofenceAssignment
        fields = ['geofence_id']


class GeofenceDetailSerializer(serializers.ModelSerializer):
    """Serializer for geofence details with assignment info"""
    
    assigned_officers_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Geofence
        fields = [
            'id',
            'name',
            'description',
            'geofence_type',
            'polygon_json',
            'center_latitude',
            'center_longitude',
            'radius',
            'is_active',
            'created_at',
            'updated_at',
            'assigned_officers_count'
        ]
    
    def get_assigned_officers_count(self, obj):
        """Get count of active officer assignments for this geofence"""
        return obj.officer_assignments.filter(is_active=True).count()
