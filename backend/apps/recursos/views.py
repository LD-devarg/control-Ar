from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import WhatsApp, TipoCambio
from .serializers import WhatsAppSerializer, TipoCambioSerializer


class WhatsAppViewSet(viewsets.ModelViewSet):
    queryset = WhatsApp.objects.all()
    serializer_class = WhatsAppSerializer
    permission_classes = [IsAuthenticated]


class TipoCambioViewSet(viewsets.ModelViewSet):
    queryset = TipoCambio.objects.all()
    serializer_class = TipoCambioSerializer
    permission_classes = [IsAuthenticated]
