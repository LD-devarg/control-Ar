from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.empresas.permissions import RoleBasedPermission, is_admin, is_operador, is_pauta
from apps.empresas.scope import filter_queryset_by_empresa
from apps.empresas.notificaciones import crear_notificacion_estructural
from .models import WhatsApp, TipoCambio
from .serializers import WhatsAppSerializer, TipoCambioSerializer


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
        return filter_queryset_by_empresa(super().get_queryset(), self.request, field_name="empresa_id")

    def perform_create(self, serializer):
        instance = serializer.save()
        actor = self.request.user
        crear_notificacion_estructural(
            tipo="whatsapp_activada",
            actor=actor,
            empresa=instance.empresa,
            mensaje=f"El operador {getattr(actor, 'username', 'sistema')} activo la linea {instance.numero}.",
            payload={"whatsapp_id": instance.id, "numero": instance.numero},
        )

    def perform_update(self, serializer):
        previous = self.get_object()
        was_active = bool(previous.activo)
        instance = serializer.save()

        if was_active == bool(instance.activo):
            return

        actor = self.request.user
        if instance.activo:
            tipo = "whatsapp_activada"
            mensaje = f"El operador {getattr(actor, 'username', 'sistema')} activo la linea {instance.numero}."
        else:
            tipo = "whatsapp_desactivada"
            mensaje = f"El operador {getattr(actor, 'username', 'sistema')} desactivo la linea {instance.numero}."

        crear_notificacion_estructural(
            tipo=tipo,
            actor=actor,
            empresa=instance.empresa,
            mensaje=mensaje,
            payload={"whatsapp_id": instance.id, "numero": instance.numero},
        )


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
