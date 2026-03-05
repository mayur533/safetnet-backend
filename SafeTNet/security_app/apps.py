from django.apps import AppConfig


class SecurityAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'security_app'
    verbose_name = 'Security App'
    
    def ready(self):
        import security_app.signals
        # Ensure users_profile app is loaded for signal reception
        import users_profile.models

