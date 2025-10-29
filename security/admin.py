from django.contrib import admin
from .models import SOSAlert, Case


@admin.register(SOSAlert)
class SOSAlertAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'location_lat', 'location_long', 'created_at')
    list_filter = ('status', 'created_at', 'user__role')
    search_fields = ('user__username', 'user__email', 'message')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Alert Information', {
            'fields': ('user', 'status', 'message')
        }),
        ('Location', {
            'fields': ('location_lat', 'location_long')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.role == 'SUB_ADMIN' and request.user.organization:
            return queryset.filter(user__organization=request.user.organization)
        return queryset


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'sos_alert', 'assigned_officer', 'status', 'updated_at')
    list_filter = ('status', 'updated_at')
    search_fields = ('sos_alert__user__username', 'assigned_officer__name', 'notes')
    ordering = ('-updated_at',)