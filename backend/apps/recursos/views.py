from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.empresas.permissions import RoleBasedPermission, is_admin, is_operador, is_pauta
from .models import WhatsApp, TipoCambio
from .serializers import WhatsAppSerializer, TipoCambioSerializer


def _filter_by_empresa(qs, user):
    if user.is_superuser:
        return qs
    if user.empresa_id:
        return qs.filter(empresa_id=user.empresa_id)
    return qs.none()


class WhatsAppViewSet(viewsets.ModelViewSet):
    queryset = WhatsApp.objects.all()
    serializer_class = WhatsAppSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        if is_admin(request.user):
            return True
        if is_operador(request.user):
            return self.action in {"list", "retrieve", "create", "update", "partial_update"}
        if is_pauta(request.user):
            return self.action in {"list", "retrieve"}
        return False

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)


class TipoCambioViewSet(viewsets.ModelViewSet):
    queryset = TipoCambio.objects.all()
    serializer_class = TipoCambioSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        if is_admin(request.user):
            return True
        if is_operador(request.user):
            return self.action in {"list", "retrieve", "create", "update", "partial_update"}
        if is_pauta(request.user):
            return self.action in {"list", "retrieve"}
        return False
