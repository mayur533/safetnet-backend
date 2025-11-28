from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

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


@require_http_methods(["GET"])
def live_share_view(request, share_token):
    """
    Render a lightweight public page that streams live location updates
    for the provided share token.
    """
    return render(request, "core/live_share.html", {"share_token": share_token})
