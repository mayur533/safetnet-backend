from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, FamilyContact, CommunityMembership, SOSEvent

# -------------------- User Registration --------------------
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('name', 'email', 'phone', 'password', 'password_confirm', 'plantype', 'planexpiry')
        extra_kwargs = {'plantype': {'default': 'free'}}
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user


# -------------------- User Login --------------------
class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        if email and password:
            user = authenticate(email=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid email or password.')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            attrs['user'] = user
            return attrs
        raise serializers.ValidationError('Must include email and password.')


# -------------------- User Profile --------------------
class UserProfileSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    is_premium = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = (
            'id',
            'name',
            'email',
            'phone',
            'plantype',
            'planexpiry',
            'location',
            'is_premium',
            'date_joined',
            'last_login',
        )
        read_only_fields = ('id', 'email', 'date_joined', 'last_login')

    def get_location(self, obj):
        # User model has NO latitude/longitude → return default values
        return {
            "latitude": None,
            "longitude": None,
            "address": None,
        }

    def update(self, instance, validated_data):
        # Since User model has no latitude/longitude, ignore location updates safely
        # (Prevents crashes)
        if 'location' in self.initial_data:
            # Do nothing for now
            pass

        return super().update(instance, validated_data)



# -------------------- Family Contacts --------------------
class FamilyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyContact
        fields = ('id', 'name', 'phone', 'relationship', 'is_primary', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def validate(self, attrs):
        user = self.context['request'].user
        phone = attrs.get('phone')
        if phone:
            existing = FamilyContact.objects.filter(user=user, phone=phone).exclude(id=self.instance.id if self.instance else None)
            if existing.exists():
                raise serializers.ValidationError({'phone': 'A contact with this phone number already exists.'})
        return attrs


class FamilyContactCreateSerializer(FamilyContactSerializer):
    class Meta(FamilyContactSerializer.Meta):
        fields = ('name', 'phone', 'relationship', 'is_primary')
    
    def validate(self, attrs):
        user = self.context['request'].user
        if FamilyContact.objects.filter(user=user).count() >= 3:
            raise serializers.ValidationError('Maximum 3 family contacts allowed per user.')
        if FamilyContact.objects.filter(user=user, phone=attrs.get('phone')).exists():
            raise serializers.ValidationError({'phone': 'A contact with this phone number already exists.'})
        return attrs


# -------------------- Community Membership --------------------
class CommunityMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityMembership
        fields = ('id', 'community_id', 'community_name', 'joined_at', 'is_active')
        read_only_fields = ('id', 'joined_at')


class CommunityMembershipCreateSerializer(serializers.Serializer):
    community_id = serializers.CharField(max_length=100)
    community_name = serializers.CharField(max_length=200)
    
    def validate(self, attrs):
        user = self.context['request'].user
        if CommunityMembership.objects.filter(user=user, community_id=attrs.get('community_id')).exists():
            raise serializers.ValidationError('You are already a member of this community.')
        return attrs


# -------------------- SOS Events --------------------
class SOSEventSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    
    class Meta:
        model = SOSEvent
        fields = ('id', 'location', 'status', 'triggered_at', 'resolved_at', 'notes', 'longitude', 'latitude')
        read_only_fields = ('id', 'triggered_at', 'resolved_at')
    
    def get_location(self, obj):
        if obj.longitude is not None and obj.latitude is not None:
            return {'longitude': obj.longitude, 'latitude': obj.latitude}
        return None


class SOSTriggerSerializer(serializers.Serializer):
    longitude = serializers.FloatField(required=False)
    latitude = serializers.FloatField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        lon = attrs.get('longitude')
        lat = attrs.get('latitude')
        if (lon is not None and lat is None) or (lat is not None and lon is None):
            raise serializers.ValidationError('Both longitude and latitude must be provided for location.')
        return attrs


class UserLocationUpdateSerializer(serializers.Serializer):
    longitude = serializers.FloatField()
    latitude = serializers.FloatField()
    
    def validate(self, attrs):
        lon = attrs.get('longitude')
        lat = attrs.get('latitude')
        if not (-180 <= lon <= 180):
            raise serializers.ValidationError({'longitude': 'Longitude must be between -180 and 180.'})
        if not (-90 <= lat <= 90):
            raise serializers.ValidationError({'latitude': 'Latitude must be between -90 and 90.'})
        return attrs
