"""
Custom middleware to remove Cross-Origin-Opener-Policy header in DEBUG mode
This prevents browser warnings when using HTTP instead of HTTPS in local development
"""
from django.conf import settings


class RemoveCOOPHeaderMiddleware:
    """
    Remove Cross-Origin-Opener-Policy header in DEBUG mode for local development
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Remove COOP header in DEBUG mode (local development with HTTP)
        if settings.DEBUG:
            # Remove the header if it exists
            if hasattr(response, 'headers'):
                response.headers.pop('Cross-Origin-Opener-Policy', None)
                # Also try the lowercase version
                response.headers.pop('cross-origin-opener-policy', None)
        
        return response

