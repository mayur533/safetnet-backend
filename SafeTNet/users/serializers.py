from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, Organization, Geofence, Alert, GlobalReport, SecurityOfficer, Incident, Notification, PromoCode, DiscountEmail, UserReply, UserDetails


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'role', 'organization')
        extra_kwargs = {
            'role': {'required': False},
            'organization': {'required': False}
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        email = attrs.get('email')
        password = attrs.get('password')
        
        if not password:
            raise serializers.ValidationError('Password is required.')
        
        if not username and not email:
            raise serializers.ValidationError('Must include username or email.')
        
        # Try to authenticate with username or email
        user = None
        if username:
            # Try username first
            user = authenticate(username=username, password=password)
        elif email:
            # Try email - need to find user by email first
            try:
                user_obj = User.objects.get(email=email, is_active=True)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None
        
        if not user:
            raise serializers.ValidationError('Invalid credentials.')
        
        if not user.is_active:
            raise serializers.ValidationError('User account is disabled.')
        
        attrs['user'] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    geofences = serializers.SerializerMethodField()
    geofence_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Geofence.objects.all(),
        source='geofences',
        write_only=True,
        required=False
    )
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined', 'geofences', 'geofence_ids')
        read_only_fields = ('id', 'date_joined')
        extra_kwargs = {
            'username': {'required': False},
            'email': {'required': False},
        }
    
    def get_geofences(self, obj):
        """Return geofence details for the user"""
        # Import here to avoid circular import
        geofences = obj.geofences.all()
        if not geofences.exists():
            return []
        
        # Return simplified geofence data to avoid circular imports
        return [
            {
                'id': g.id,
                'name': g.name,
                'description': g.description,
                'organization_name': g.organization.name if g.organization else None,
                'active': g.active,
                'center_point': g.get_center_point(),
            }
            for g in geofences
        ]


## Removed SubAdminProfile serializers as the model is deleted


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ('id', 'name', 'description', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class GeofenceSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    center_point = serializers.SerializerMethodField()
    
    class Meta:
        model = Geofence
        fields = (
            'id', 'name', 'description', 'polygon_json', 'organization', 
            'organization_name', 'active', 'created_by_username', 
            'created_at', 'updated_at', 'center_point'
        )
        read_only_fields = ('id', 'created_by_username', 'created_at', 'updated_at', 'center_point')
    
    def get_center_point(self, obj):
        return obj.get_center_point()


class GeofenceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Geofence
        fields = ('name', 'description', 'polygon_json', 'organization', 'active')
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class UserListSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True, allow_null=True)
    
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 
            'role', 'organization', 'organization_name', 'is_active', 
            'date_joined', 'last_login'
        )
        read_only_fields = ('id', 'date_joined', 'last_login')
        extra_kwargs = {
            'organization': {'required': False}
        }
    
    def to_representation(self, obj):
        # Override to return organization as object with id and name
        data = super().to_representation(obj)
        if obj.organization:
            data['organization'] = {
                'id': obj.organization.id,
                'name': obj.organization.name
            }
        return data


class AlertSerializer(serializers.ModelSerializer):
    geofence_name = serializers.CharField(source='geofence.name', read_only=True, allow_null=True)
    geofence_details = serializers.SerializerMethodField()
    geofences = serializers.SerializerMethodField()
    geofence_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Geofence.objects.all(),
        source='geofences',
        write_only=True,
        required=False
    )
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    resolved_by_username = serializers.CharField(source='resolved_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = Alert
        fields = (
            'id', 'geofence', 'geofence_name', 'geofence_details', 'geofences', 'geofence_ids',
            'user', 'user_username', 'alert_type', 'severity', 'title', 'description', 'metadata',
            'is_resolved', 'resolved_at', 'resolved_by_username',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'resolved_at')
    
    def get_geofence_details(self, obj):
        """Return full geofence details if legacy geofence exists"""
        if obj.geofence:
            return {
                'id': obj.geofence.id,
                'name': obj.geofence.name,
                'description': obj.geofence.description,
                'organization_name': obj.geofence.organization.name if obj.geofence.organization else None,
                'active': obj.geofence.active,
                'center_point': obj.geofence.get_center_point(),
                'polygon_json': obj.geofence.polygon_json
            }
        return None
    
    def get_geofences(self, obj):
        """Return geofence details for all associated geofences"""
        geofences = obj.geofences.all()
        if not geofences.exists() and obj.geofence:
            # Fallback to legacy geofence if no geofences set
            geofences = [obj.geofence]
        
        return [
            {
                'id': g.id,
                'name': g.name,
                'description': g.description,
                'organization_name': g.organization.name if g.organization else None,
                'active': g.active,
                'center_point': g.get_center_point(),
            }
            for g in geofences
        ]


class AlertCreateSerializer(serializers.ModelSerializer):
    geofence_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Geofence.objects.all(),
        source='geofences',
        required=False,
        help_text='List of geofence IDs to associate with this alert'
    )
    
    class Meta:
        model = Alert
        fields = (
            'geofence', 'geofence_ids', 'user', 'alert_type', 'severity', 'title', 
            'description', 'metadata'
        )
        extra_kwargs = {
            'geofence': {'required': False, 'allow_null': True},
        }
    
    def create(self, validated_data):
        # Handle geofences
        geofences = validated_data.pop('geofences', [])
        
        # If geofence_ids not provided but legacy geofence is, add it to geofences
        if not geofences and validated_data.get('geofence'):
            geofences = [validated_data['geofence']]
        
        # Create alert
        alert = Alert.objects.create(**validated_data)
        
        # Add geofences
        if geofences:
            alert.geofences.set(geofences)
        
        return alert


class GlobalReportSerializer(serializers.ModelSerializer):
    generated_by_username = serializers.CharField(source='generated_by.username', read_only=True)
    
    class Meta:
        model = GlobalReport
        fields = (
            'id', 'report_type', 'title', 'description', 'date_range_start',
            'date_range_end', 'metrics', 'file_path', 'generated_by_username',
            'is_generated', 'generated_at', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'generated_by_username', 'generated_at', 'created_at', 'updated_at')


class GlobalReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalReport
        fields = (
            'report_type', 'title', 'description', 'date_range_start', 'date_range_end'
        )
    
    def create(self, validated_data):
        validated_data['generated_by'] = self.context['request'].user
        return super().create(validated_data)


# Sub-Admin Panel Serializers
class SecurityOfficerSerializer(serializers.ModelSerializer):
    assigned_geofence_name = serializers.CharField(source='assigned_geofence.name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    # Password field is excluded from read serializer for security
    
    class Meta:
        model = SecurityOfficer
        fields = (
            'id', 'username', 'name', 'contact', 'email', 'assigned_geofence', 
            'assigned_geofence_name', 'organization', 'organization_name',
            'is_active', 'created_by_username', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by_username', 'created_at', 'updated_at')


class SecurityOfficerCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    username = serializers.CharField(required=True, max_length=150)
    
    class Meta:
        model = SecurityOfficer
        fields = ('username', 'name', 'contact', 'email', 'password', 'assigned_geofence', 'is_active')
    
    def validate_username(self, value):
        """Validate username is unique"""
        if SecurityOfficer.objects.filter(username=value).exists():
            raise serializers.ValidationError("A security officer with this username already exists.")
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data['created_by'] = self.context['request'].user
        validated_data['organization'] = self.context['request'].user.organization
        officer = SecurityOfficer.objects.create(**validated_data)
        officer.set_password(password)
        officer.save()
        return officer


class IncidentSerializer(serializers.ModelSerializer):
    geofence_name = serializers.CharField(source='geofence.name', read_only=True)
    officer_name = serializers.CharField(source='officer.name', read_only=True)
    resolved_by_username = serializers.CharField(source='resolved_by.username', read_only=True)
    
    class Meta:
        model = Incident
        fields = (
            'id', 'geofence', 'geofence_name', 'officer', 'officer_name',
            'incident_type', 'severity', 'title', 'details', 'location',
            'is_resolved', 'resolved_at', 'resolved_by_username',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'resolved_at', 'created_at', 'updated_at')


class IncidentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = (
            'geofence', 'officer', 'incident_type', 'severity', 
            'title', 'details', 'location'
        )


class NotificationSerializer(serializers.ModelSerializer):
    target_geofence_name = serializers.CharField(source='target_geofence.name', read_only=True)
    target_geofences_names = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    target_officers_names = serializers.StringRelatedField(source='target_officers', many=True, read_only=True)
    read_users = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    is_read = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = (
            'id', 'notification_type', 'title', 'message', 'target_type',
            'target_geofence', 'target_geofence_name', 'target_geofences', 'target_geofences_names',
            'target_officers', 'target_officers_names', 'organization', 'organization_name',
            'is_sent', 'sent_at', 'created_by_username', 'created_at', 'updated_at',
            'read_users', 'is_read'
        )
        read_only_fields = ('id', 'sent_at', 'created_by_username', 'created_at', 'updated_at', 'is_read')
    
    def get_is_read(self, obj):
        """Check if the current user has read this notification"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return obj.read_users.filter(id=request.user.id).exists()
        return False
    
    def get_target_geofences_names(self, obj):
        """Get names of target geofences from the JSONField"""
        if obj.target_geofences:
            from .models import Geofence
            geofences = Geofence.objects.filter(id__in=obj.target_geofences)
            return [{'id': g.id, 'name': g.name} for g in geofences]
        return []


class NotificationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            'notification_type', 'title', 'message', 'target_type',
            'target_geofence', 'target_officers'
        )
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        validated_data['organization'] = self.context['request'].user.organization
        return super().create(validated_data)


class NotificationSendSerializer(serializers.Serializer):
    """Serializer for sending notifications"""
    notification_type = serializers.ChoiceField(choices=Notification.NOTIFICATION_TYPES)
    title = serializers.CharField(max_length=200)
    message = serializers.CharField()
    target_type = serializers.ChoiceField(choices=Notification.TARGET_TYPES)
    target_geofence_id = serializers.IntegerField(required=False, allow_null=True)
    target_geofence_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    target_officer_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    
    def validate_target_geofence_id(self, value):
        if value:
            try:
                geofence = Geofence.objects.get(id=value)
                # Ensure the geofence belongs to the user's organization
                if geofence.organization != self.context['request'].user.organization:
                    raise serializers.ValidationError("Geofence does not belong to your organization.")
            except Geofence.DoesNotExist:
                raise serializers.ValidationError("Geofence not found.")
        return value
    
    def validate_target_geofence_ids(self, value):
        if value:
            geofences = Geofence.objects.filter(id__in=value)
            if len(geofences) != len(value):
                raise serializers.ValidationError("Some geofences not found.")
            # Ensure all geofences belong to the user's organization
            org = self.context['request'].user.organization
            if org and not all(g.organization == org for g in geofences):
                raise serializers.ValidationError("Some geofences do not belong to your organization.")
        return value
    
    def validate_target_officer_ids(self, value):
        if value:
            officers = SecurityOfficer.objects.filter(
                id__in=value,
                organization=self.context['request'].user.organization
            )
            if len(officers) != len(value):
                raise serializers.ValidationError("Some officers do not belong to your organization.")
        return value


class PromoCodeSerializer(serializers.ModelSerializer):
    is_valid = serializers.SerializerMethodField()
    
    class Meta:
        model = PromoCode
        fields = (
            'id', 'code', 'discount_percentage', 'expiry_date', 
            'is_active', 'is_valid', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'is_valid', 'created_at', 'updated_at')
    
    def get_is_valid(self, obj):
        return obj.is_valid()


class PromoCodeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = ('code', 'discount_percentage', 'expiry_date', 'is_active')
    
    def validate_code(self, value):
        """Validate that promo code is unique and properly formatted"""
        if PromoCode.objects.filter(code=value).exists():
            raise serializers.ValidationError("A promo code with this code already exists.")
        return value.upper()  # Convert to uppercase for consistency
    
    def validate_discount_percentage(self, value):
        """Validate discount percentage is within valid range"""
        if value <= 0 or value > 100:
            raise serializers.ValidationError("Discount percentage must be between 0 and 100.")
        return value


class DiscountEmailSerializer(serializers.ModelSerializer):
    discount_code_code = serializers.CharField(source='discount_code.code', read_only=True)
    discount_code_discount = serializers.DecimalField(source='discount_code.discount_percentage', max_digits=5, decimal_places=2, read_only=True)
    
    class Meta:
        model = DiscountEmail
        fields = (
            'id', 'email', 'discount_code', 'discount_code_code', 
            'discount_code_discount', 'status', 'created_at'
        )
        read_only_fields = ('id', 'discount_code_code', 'discount_code_discount', 'created_at')


class DiscountEmailCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountEmail
        fields = ('email', 'discount_code', 'status')
    
    def validate(self, attrs):
        """Validate that the combination of email and discount_code is unique"""
        email = attrs.get('email')
        discount_code = attrs.get('discount_code')
        
        if email and discount_code:
            if DiscountEmail.objects.filter(email=email, discount_code=discount_code).exists():
                raise serializers.ValidationError(
                    "A discount email with this email and discount code combination already exists."
                )
        
        return attrs


class UserReplySerializer(serializers.ModelSerializer):
    sos_event_id = serializers.IntegerField(source='sos_event.id', read_only=True)
    read_by_ids = serializers.SerializerMethodField()
    is_read_by_current_user = serializers.SerializerMethodField()
    read_timestamp = serializers.SerializerMethodField()
    
    class Meta:
        model = UserReply
        fields = (
            'id', 
            'email', 
            'message', 
            'date_time',
            'sos_event_id',
            'read_by_ids',
            'is_read_by_current_user',
            'read_timestamp',
        )
        read_only_fields = ('id', 'date_time')
    
    def get_read_by_ids(self, obj):
        """Return list of user IDs who have read this reply."""
        return list(obj.read_by.values_list('id', flat=True))
    
    def get_is_read_by_current_user(self, obj):
        """Check if current user has read this reply."""
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.is_read_by(request.user)
        return False
    
    def get_read_timestamp(self, obj):
        """Get read timestamp for current user."""
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.get_read_timestamp(request.user)
        return None


class UserDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDetails
        fields = ('id', 'username', 'price', 'status', 'date')
        read_only_fields = ('id', 'date')
