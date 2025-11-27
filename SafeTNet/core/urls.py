from django.urls import path
from . import views

urlpatterns = [
    path('', views.root_view, name='root'),
    path('live-share/<uuid:share_token>/', views.live_share_view, name='live-share'),
]
