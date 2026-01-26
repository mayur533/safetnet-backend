from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Organization, Geofence, Alert, GlobalReport


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('-created_at',)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'organization', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('role', 'organization', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'organization')}),
    )
    
    def save_model(self, request, obj, form, change):
        """
        Override save_model to automatically set is_staff based on role.
        Password handling is done by Django's UserAdmin automatically.
        """
        # Set is_staff based on role (SUPER_ADMIN, SUB_ADMIN, and security_officer should be staff)
        if obj.role in ['SUPER_ADMIN', 'SUB_ADMIN', 'security_officer']:
            obj.is_staff = True
        elif not change:
            # For new users with other roles, default to False
            obj.is_staff = False
        
        # Django's UserAdmin handles password hashing automatically
        # last_login will be set automatically when user logs in (empty for new users is normal)
        super().save_model(request, obj, form, change)


## Removed SubAdminProfile admin registration


@admin.register(Geofence)
class GeofenceAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'active', 'created_by', 'created_at')
    list_filter = ('organization', 'active', 'created_at')
    search_fields = ('name', 'description', 'organization__name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'organization', 'active')
        }),
        ('Geographic Data', {
            'fields': ('polygon_json',),
            'classes': ('wide',)
        }),
        ('Audit Information', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Creating new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
