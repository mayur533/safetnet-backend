from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

# Create your views here.

@require_http_methods(["GET"])
def root_view(request):
    """
    Root API endpoint - provides API information
    """
    return JsonResponse({
        'message': 'SafeTNet API',
        'version': '1.0',
        'endpoints': {
            'admin': '/admin/',
            'api_docs': '/api/docs/',
            'api_schema': '/api/schema/',
            'security_login': '/api/security/login/',
            'auth': '/api/auth/',
            'user_profile': '/api/user/',
        },
        'status': 'running'
    })


@csrf_exempt
@require_http_methods(["GET"])
def live_share_view(request, share_token):
    """
    Render a lightweight public page that streams live location updates
    for the provided share token.
    """
    try:
        from django.conf import settings
        # Get the base URL for API calls - use the request's host
        scheme = 'https' if request.is_secure() else 'http'
        host = request.get_host()
        api_base_url = f"{scheme}://{host}"
        
        # Fallback for DEBUG mode if needed
        if settings.DEBUG and '192.168' not in host and 'localhost' not in host and '127.0.0.1' not in host:
            # If accessing from phone on same network, use the IP from request
            api_base_url = f"http://{host}"
        
        return render(request, "core/live_share.html", {
            "share_token": share_token,
            "api_base_url": api_base_url
        })
    except Exception as e:
        from django.http import HttpResponse
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error rendering live share view: {e}", exc_info=True)
        return HttpResponse(
            f"<html><body><h1>Error loading live share</h1><p>Share token: {share_token}</p><p>Error: {str(e)}</p></body></html>",
            status=500
        )
