"""
Custom exception handler for DRF to ensure all errors return JSON responses.
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.db import DatabaseError

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that ensures all exceptions return JSON responses.
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)
    
    # If response is None, it means DRF doesn't know how to handle this exception
    # So we'll create our own JSON response
    if response is None:
        import traceback
        error_detail = str(exc)
        
        # Log the full traceback for debugging
        logger.error(f"Unhandled exception: {error_detail}\n{traceback.format_exc()}")
        
        # Return a generic error response
        response = Response(
            {
                'error': 'An error occurred',
                'detail': error_detail
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    else:
        # Even if DRF handled it, ensure we log database errors
        if isinstance(exc, DatabaseError):
            import traceback
            logger.error(f"Database error: {str(exc)}\n{traceback.format_exc()}")
        
        # Ensure the response is JSON (DRF should handle this, but just in case)
        if not isinstance(response.data, dict):
            response.data = {
                'error': 'An error occurred',
                'detail': str(response.data) if response.data else 'Unknown error'
            }
    
    return response

