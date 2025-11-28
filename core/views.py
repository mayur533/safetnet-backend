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
        # Get the base URL for API calls
        if settings.DEBUG:
            api_base_url = 'http://127.0.0.1:8000'
        else:
            api_base_url = 'https://safetnet-backend.onrender.com'
        
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
