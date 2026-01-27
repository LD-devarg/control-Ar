import uuid
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.recursos.servicios.whatsapp_rotacion import seleccionar_numero_whatsapp
from .models import Cliente, EventosMeta, Landing, Compra
from .serializers import (
    ClienteCreateSerializer,
    ClienteSerializer,
    EventosMetaCreateSerializer,
    EventosMetaReadSerializer,
    LandingSerializer,
    CompraSerializer,
)
from .servicios.calculos import calcular_compra
from .servicios.enviador import enviar_evento_meta


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    filterset_fields = ["empresa__id"]

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return ClienteCreateSerializer
        return ClienteSerializer


class LandingViewSet(viewsets.ModelViewSet):
    queryset = Landing.objects.all()
    serializer_class = LandingSerializer

    @action(detail=False, methods=["get"], permission_classes=[AllowAny], url_path="whatsapp-rotacion")
    def whatsapp_rotacion(self, request):
        token = request.query_params.get("landing_token")
        if not token:
            raise ValidationError("landing_token requerido")
        landing = get_object_or_404(Landing, token=token, activo=True)
        numero = seleccionar_numero_whatsapp(landing.empresa_id)
        return Response({"numero": numero})

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [AllowAny()]
        return [IsAuthenticated()]


class EventosMetaViewSet(viewsets.ModelViewSet):

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="test-event")
    def test_event(self, request):
        if not (request.user.is_superuser or request.user.groups.filter(name="Admin").exists() or request.user.groups.filter(name="Pauta").exists()):
            raise ValidationError("Solo admin o pauta puede probar eventos.")
        cliente_id = request.data.get("cliente_id")
        if not cliente_id:
            raise ValidationError("cliente_id requerido")
        cliente = get_object_or_404(Cliente, id=cliente_id)
        payload = {
            "email": request.data.get("email"),
            "phone": request.data.get("phone"),
            "value": request.data.get("value"),
            "currency": request.data.get("currency"),
            "fbp": request.data.get("fbp"),
            "fbc": request.data.get("fbc"),
        }
        evento = EventosMeta.objects.create(
            tipo=request.data.get("tipo", "lead"),
            data=payload,
            cliente=cliente,
            empresa=cliente.empresa,
            operador=request.user,
            landing=None,
        )
        try:
            respuesta = enviar_evento_meta(evento, request=request)
        except Exception as exc:
            evento.estado_envio = "fallido"
            evento.respuesta_meta = {"error": str(exc)}
            evento.save(update_fields=["estado_envio", "respuesta_meta"])
            raise ValidationError(str(exc))

        output = EventosMetaReadSerializer(evento)
        return Response({"evento": output.data, "meta": respuesta}, status=status.HTTP_201_CREATED)
    queryset = EventosMeta.objects.all()
    http_method_names = ["get", "post"]

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return EventosMetaCreateSerializer
        return EventosMetaReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        landing = serializer.validated_data["landing"]
        operador = request.user if request.user.is_authenticated else None

        payload = {
            "value": serializer.validated_data.get("value"),
            "currency": serializer.validated_data.get("currency"),
            "email": serializer.validated_data.get("email"),
            "phone": serializer.validated_data.get("phone"),
        }

        evento = EventosMeta.objects.create(
            id_evento=uuid.uuid4(),
            cliente_id=serializer.validated_data["cliente_id"],
            empresa=landing.empresa,
            landing=landing,
            operador=operador,
            tipo=serializer.validated_data["tipo"],
            data=payload,
            fbp=serializer.validated_data.get("fbp"),
            fbc=serializer.validated_data.get("fbc"),
        )

        try:
            enviar_evento_meta(evento, request=request)
        except Exception as exc:
            evento.estado_envio = "fallido"
            evento.respuesta_meta = {"error": str(exc)}
            evento.save(update_fields=["estado_envio", "respuesta_meta"])

        output = EventosMetaReadSerializer(evento)
        return Response(output.data, status=status.HTTP_201_CREATED)


class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compra.objects.all()
    serializer_class = CompraSerializer

    def get_permissions(self):
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cliente = serializer.validated_data["cliente"]
        monto_ars = serializer.validated_data["monto_ars"]
        comprobante = serializer.validated_data.get("comprobante")

        with transaction.atomic():
            tc_obj, tc_valor, monto_usd = calcular_compra(monto_ars)
            compra = Compra.objects.create(
                cliente=cliente,
                empresa=cliente.empresa,
                operador=request.user,
                monto_ars=monto_ars,
                comprobante=comprobante,
                tc=tc_valor,
                monto_usd=monto_usd,
                tipo_cambio=tc_obj,
            )

            era_primera = cliente.cant_compras == 0
            cliente.cant_compras += 1
            cliente.total_compras_ars = (cliente.total_compras_ars or 0) + monto_ars
            cliente.total_compras_usd = (cliente.total_compras_usd or 0) + monto_usd
            cliente.save(update_fields=["cant_compras", "total_compras_ars", "total_compras_usd"])

            if era_primera:
                evento = EventosMeta.objects.create(
                    tipo="purchase",
                    data={"value": float(monto_usd), "currency": "USD"},
                    cliente=cliente,
                    empresa=cliente.empresa,
                    operador=request.user,
                    landing=None,
                )
                try:
                    enviar_evento_meta(evento, request=request)
                except Exception as exc:
                    evento.estado_envio = "fallido"
                    evento.respuesta_meta = {"error": str(exc)}
                    evento.save(update_fields=["estado_envio", "respuesta_meta"])

        output = self.get_serializer(compra)
        return Response(output.data, status=status.HTTP_201_CREATED)
