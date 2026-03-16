import logging

from django.db import DatabaseError, IntegrityError
from rest_framework import viewsets
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.empresas.permissions import RoleBasedPermission, is_admin, is_operador, is_pauta
from apps.empresas.scope import filter_queryset_by_empresa, get_user_empresa_ids
from apps.empresas.notificaciones import crear_notificacion_estructural
from .models import WhatsApp, TipoCambio
from .serializers import WhatsAppSerializer, TipoCambioSerializer

logger = logging.getLogger(__name__)


def _resolve_whatsapp_empresa_for_write(request, *, empresa_input=None) -> int:
    if empresa_input not in (None, ""):
        try:
            empresa_input = int(empresa_input)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"empresa": "Parametro empresa invalido."}) from exc
    else:
        empresa_input = None

    user = request.user
    if user.is_superuser:
        if not empresa_input:
            raise ValidationError({"empresa": "Empresa requerida para crear la linea."})
        return int(empresa_input)

    allowed_ids = get_user_empresa_ids(user)
    if not allowed_ids:
        raise ValidationError({"empresa": "Empresa no disponible en el usuario actual."})

    if empresa_input is None:
        if len(allowed_ids) == 1:
            return int(allowed_ids[0])
        raise ValidationError({"empresa": "Empresa requerida para crear la linea."})

    if empresa_input not in allowed_ids:
        raise ValidationError({"empresa": "No tenes acceso a la empresa seleccionada."})
    return int(empresa_input)


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

    def _emit_whatsapp_notification(self, *, instance, activated: bool):
        actor = self.request.user
        tipo = "whatsapp_activada" if activated else "whatsapp_desactivada"
        accion = "activo" if activated else "desactivo"
        try:
            crear_notificacion_estructural(
                tipo=tipo,
                actor=actor,
                empresa=instance.empresa,
                mensaje=f"El operador {getattr(actor, 'username', 'sistema')} {accion} la linea {instance.numero}.",
                payload={"whatsapp_id": instance.id, "numero": instance.numero},
            )
        except Exception:
            logger.exception(
                "No se pudo crear la notificacion estructural para la linea WhatsApp %s.",
                instance.id,
            )

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        payload["empresa"] = _resolve_whatsapp_empresa_for_write(
            request,
            empresa_input=payload.get("empresa"),
        )
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        try:
            instance = serializer.save()
        except (IntegrityError, DatabaseError) as exc:
            logger.exception("Fallo al crear linea WhatsApp para user=%s payload=%s", request.user.id, payload)
            raise ValidationError(
                {"detail": "No se pudo crear la linea por un conflicto de datos. Verifica empresa y numero."}
            ) from exc
        self._emit_whatsapp_notification(instance=instance, activated=bool(instance.activo))
        output = self.get_serializer(instance)
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        was_active = bool(instance.activo)
        payload = request.data.copy()
        if "empresa" in payload:
            payload["empresa"] = _resolve_whatsapp_empresa_for_write(
                request,
                empresa_input=payload.get("empresa"),
            )
        serializer = self.get_serializer(instance, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)
        try:
            instance = serializer.save()
        except (IntegrityError, DatabaseError) as exc:
            logger.exception("Fallo al actualizar linea WhatsApp %s para user=%s", instance.id, request.user.id)
            raise ValidationError(
                {"detail": "No se pudo actualizar la linea por un conflicto de datos. Reintenta."}
            ) from exc
        if was_active != bool(instance.activo):
            self._emit_whatsapp_notification(instance=instance, activated=bool(instance.activo))
        output = self.get_serializer(instance)
        return Response(output.data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)


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
