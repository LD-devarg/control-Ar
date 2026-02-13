from django.urls import path

from apps.operativo.consumers import EmpresaRealtimeConsumer

websocket_urlpatterns = [
    path("ws/realtime/", EmpresaRealtimeConsumer.as_asgi()),
]
