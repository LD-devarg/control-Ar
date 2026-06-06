from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.empresas.permissions import RoleBasedPermission, is_admin, is_operador, is_pauta
from apps.empresas.scope import filter_queryset_by_empresa

from .models import Conversation, Message, WhatsAppConfig, WebPushSubscription
from .serializers import ConversationSerializer, MessageSerializer, WhatsAppConfigSerializer, WebPushSubscriptionSerializer
from .servicios.wa_client import (
    conversacion_en_ventana_24h,
    enviar_mensaje_texto,
    extract_outbound_message_id,
)


class WhatsAppConfigViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppConfig.objects.select_related("empresa").all()
    serializer_class = WhatsAppConfigSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return request.user.is_superuser or is_admin(request.user)

    def get_queryset(self):
        return filter_queryset_by_empresa(super().get_queryset(), self.request, field_name="empresa_id")


class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.select_related("empresa", "cliente").prefetch_related("mensajes").all()
    serializer_class = ConversationSerializer
    http_method_names = ["get", "post", "patch"]
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return request.user.is_superuser or is_admin(request.user) or is_operador(request.user) or is_pauta(request.user)

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed("POST")

    def get_queryset(self):
        qs = filter_queryset_by_empresa(super().get_queryset(), self.request, field_name="empresa_id")
        estado = self.request.query_params.get("estado")
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    @action(detail=True, methods=["post"], url_path="responder")
    def responder(self, request, pk=None):
        conversation = self.get_object()
        body = str(request.data.get("body") or "").strip()
        if not body:
            raise ValidationError({"body": "El mensaje no puede estar vacio."})
        if not conversacion_en_ventana_24h(conversation):
            raise ValidationError(
                "La ventana de 24h esta cerrada. Para responder se necesita una plantilla aprobada."
            )

        config = (
            WhatsAppConfig.objects.filter(empresa_id=conversation.empresa_id, activo=True)
            .order_by("id")
            .first()
        )
        if not config:
            raise ValidationError("No hay configuracion WhatsApp activa para esta empresa.")

        response_payload = enviar_mensaje_texto(
            config=config,
            to_phone=conversation.wa_phone,
            body=body,
        )
        message_id = extract_outbound_message_id(response_payload)
        message = Message.objects.create(
            conversation=conversation,
            direction=Message.DIRECTION_OUT,
            wa_message_id=message_id,
            body=body,
            tipo="text",
            estado="sent",
            timestamp=timezone.now(),
            raw=response_payload,
        )
        conversation.last_outbound_at = message.timestamp
        if conversation.estado == "nuevo":
            conversation.estado = "en_conversacion"
            conversation.save(update_fields=["last_outbound_at", "estado", "actualizado_en"])
        else:
            conversation.save(update_fields=["last_outbound_at", "actualizado_en"])

        # WebSocket broadcast for outbound message sync
        try:
            from apps.operativo.realtime import publish_empresa_event
            publish_empresa_event(
                empresa_id=conversation.empresa_id,
                event_type="crm_message_received",
                payload={
                    "conversation_id": conversation.id,
                    "phone": conversation.wa_phone,
                }
            )
        except Exception:
            pass

        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class MessageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Message.objects.select_related("conversation", "conversation__empresa").all()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return request.user.is_superuser or is_admin(request.user) or is_operador(request.user) or is_pauta(request.user)

    def get_queryset(self):
        qs = filter_queryset_by_empresa(
            super().get_queryset(),
            self.request,
            field_name="conversation__empresa_id",
        )
        conversation_id = self.request.query_params.get("conversation")
        if conversation_id:
            qs = qs.filter(conversation_id=conversation_id)
        return qs.order_by("timestamp", "id")


class WebPushSubscriptionViewSet(viewsets.ModelViewSet):
    queryset = WebPushSubscription.objects.all()
    serializer_class = WebPushSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(usuario=self.request.user)

    def perform_create(self, serializer):
        endpoint = serializer.validated_data.get("endpoint")
        obj, created = WebPushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                "usuario": self.request.user,
                "p256dh": serializer.validated_data.get("p256dh"),
                "auth": serializer.validated_data.get("auth"),
            }
        )
        serializer.instance = obj

    @action(detail=False, methods=["post"], url_path="unsubscribe")
    def unsubscribe(self, request):
        endpoint = request.data.get("endpoint")
        if not endpoint:
            raise ValidationError({"endpoint": "Este campo es requerido."})
        
        deleted_count, _ = WebPushSubscription.objects.filter(
            usuario=request.user, 
            endpoint=endpoint
        ).delete()
        
        return Response({"success": True, "deleted": deleted_count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="vapid-key")
    def vapid_key(self, request):
        from django.conf import settings
        return Response({
            "public_key": getattr(settings, "VAPID_PUBLIC_KEY", "")
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="test-push")
    def test_push(self, request):
        subscriptions = WebPushSubscription.objects.filter(usuario=request.user)
        if not subscriptions.exists():
            return Response(
                {"error": "No tienes suscripciones de notificaciones push registradas en este dispositivo."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        import json
        from pywebpush import webpush, WebPushException
        from django.conf import settings
        
        payload = {
            "title": "Prueba de ControlAR",
            "body": "¡Las notificaciones push están configuradas correctamente!",
            "icon": "/controlar_fondo_blanco_sin_texto.png",
            "data": {
                "url": "/crm"
            }
        }
        payload_str = json.dumps(payload)
        
        success_count = 0
        deleted_count = 0
        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {
                            "p256dh": sub.p256dh,
                            "auth": sub.auth
                        }
                    },
                    data=payload_str,
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims={
                        "sub": settings.VAPID_ADMIN_EMAIL,
                    }
                )
                success_count += 1
            except WebPushException as ex:
                if ex.response is not None and ex.response.status_code in (404, 410):
                    sub.delete()
                    deleted_count += 1
                    
        return Response({
            "success": True,
            "sent": success_count,
            "deleted_invalid": deleted_count
        }, status=status.HTTP_200_OK)

