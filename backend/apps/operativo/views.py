import uuid
from datetime import datetime, time, timedelta

from django.db import models, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.empresas.permissions import RoleBasedPermission, is_admin, is_operador, is_pauta
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

def _filter_by_empresa(qs, user):
    if user.is_superuser:
        return qs
    if user.empresa_id:
        return qs.filter(empresa_id=user.empresa_id)
    return qs.none()


def _apply_date_filters(qs, field: str, request):
    period = request.query_params.get("period")
    from_str = request.query_params.get("from")
    to_str = request.query_params.get("to")

    start = end = None

    if from_str:
        d = parse_date(from_str)
        if d:
            start = timezone.make_aware(datetime.combine(d, time.min))
    if to_str:
        d = parse_date(to_str)
        if d:
            end = timezone.make_aware(datetime.combine(d, time.max))

    if not start and not end and period:
        now = timezone.now()
        if period == "day":
            start = now - timedelta(days=1)
        elif period == "week":
            start = now - timedelta(days=7)
        elif period == "month":
            start = now - timedelta(days=30)

    if start:
        qs = qs.filter(**{f"{field}__gte": start})
    if end:
        qs = qs.filter(**{f"{field}__lte": end})

    return qs


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    filterset_fields = ["empresa__id"]

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated(), RoleBasedPermission()]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        if is_admin(request.user):
            return True
        if is_operador(request.user):
            return self.action in {"list", "retrieve"}
        return False

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return ClienteCreateSerializer
        return ClienteSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        idempotency_key = serializer.validated_data.get("idempotency_key")
        if idempotency_key:
            existing = Cliente.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                output = ClienteSerializer(existing)
                return Response(output.data, status=status.HTTP_200_OK)

        landing = serializer.validated_data["landing"]
        cliente = serializer.save()

        evento = EventosMeta.objects.create(
            id_evento=uuid.uuid4(),
            cliente=cliente,
            empresa=landing.empresa,
            landing=landing,
            operador=None,
            tipo="lead",
            data={"phone": cliente.contacto},
            fbp=request.data.get("fbp"),
            fbc=request.data.get("fbc"),
        )
        try:
            enviar_evento_meta(evento, request=request)
        except Exception as exc:
            evento.estado_envio = "fallido"
            evento.respuesta_meta = {"error": str(exc)}
            evento.save(update_fields=["estado_envio", "respuesta_meta"])

        output = ClienteSerializer(cliente)
        return Response(output.data, status=status.HTTP_201_CREATED)


class LandingViewSet(viewsets.ModelViewSet):
    queryset = Landing.objects.all()
    serializer_class = LandingSerializer

    def get_permissions(self):
        if self.action in {"whatsapp_rotacion", "public"}:
            return [AllowAny()]
        return [IsAuthenticated(), RoleBasedPermission()]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return is_admin(request.user) or is_pauta(request.user)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)

    @action(detail=False, methods=["get"], permission_classes=[AllowAny], url_path="whatsapp-rotacion")
    def whatsapp_rotacion(self, request):
        token = request.query_params.get("landing_token")
        if not token:
            raise ValidationError("landing_token requerido")
        landing = get_object_or_404(Landing, token=token, activo=True)
        numero = seleccionar_numero_whatsapp(landing.empresa_id)
        return Response({"numero": numero})

    @action(detail=False, methods=["get"], permission_classes=[AllowAny], url_path="public")
    def public(self, request):
        token = request.query_params.get("landing_token")
        if not token:
            raise ValidationError("landing_token requerido")
        landing = get_object_or_404(Landing, token=token, activo=True)
        serializer = self.get_serializer(landing)
        return Response(serializer.data)


class EventosMetaViewSet(viewsets.ModelViewSet):
    queryset = EventosMeta.objects.all()
    http_method_names = ["get", "post"]

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated(), RoleBasedPermission()]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        if self.action == "test_event":
            return is_admin(request.user) or is_pauta(request.user)
        if is_admin(request.user) or is_operador(request.user) or is_pauta(request.user):
            return self.action in {"list", "retrieve"}
        return False

    def get_queryset(self):
        qs = _filter_by_empresa(super().get_queryset(), self.request.user)
        user = self.request.user
        if user.is_authenticated and is_operador(user):
            qs = qs.filter(
                (models.Q(tipo='lead') & models.Q(operador__isnull=True)) |
                (models.Q(tipo__in=['contact', 'purchase']) & models.Q(operador=user))
            )
        tipo = self.request.query_params.get("tipo")
        if tipo:
            qs = qs.filter(tipo=tipo)
        qs = _apply_date_filters(qs, "creado_en", self.request)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return EventosMetaCreateSerializer
        return EventosMetaReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        landing = serializer.validated_data.get("landing")
        empresa_id = serializer.validated_data["empresa_id"]
        operador = request.user if request.user.is_authenticated else None

        value = serializer.validated_data.get("value")
        if value is not None:
            value = float(value)
        payload = {
            "value": value,
            "currency": serializer.validated_data.get("currency"),
            "email": serializer.validated_data.get("email"),
            "phone": serializer.validated_data.get("phone"),
        }

        evento = EventosMeta.objects.create(
            id_evento=uuid.uuid4(),
            cliente_id=serializer.validated_data["cliente_id"],
            empresa_id=empresa_id,
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

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="test-event")
    def test_event(self, request):
        if not (request.user.is_superuser or is_admin(request.user) or is_pauta(request.user)):
            raise ValidationError("Solo admin o pauta puede probar eventos.")
        cliente_id = request.data.get("cliente_id")
        if not cliente_id:
            raise ValidationError("cliente_id requerido")
        cliente = get_object_or_404(Cliente, id=cliente_id)
        test_event_code = request.data.get("test_event_code")
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
            respuesta = enviar_evento_meta(evento, request=request, test_event_code=test_event_code)
        except Exception as exc:
            evento.estado_envio = "fallido"
            evento.respuesta_meta = {"error": str(exc)}
            evento.save(update_fields=["estado_envio", "respuesta_meta"])
            raise ValidationError(str(exc))

        output = EventosMetaReadSerializer(evento)
        return Response({"evento": output.data, "meta": respuesta}, status=status.HTTP_201_CREATED)


class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compra.objects.all()
    serializer_class = CompraSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        if is_admin(request.user):
            return True
        if is_operador(request.user):
            return self.action in {"list", "retrieve", "create"}
        return False

    def get_queryset(self):
        qs = _filter_by_empresa(super().get_queryset(), self.request.user)
        user = self.request.user
        if user.is_authenticated and is_operador(user):
            qs = qs.filter(operador=user)
        qs = _apply_date_filters(qs, "creado_en", self.request)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cliente = serializer.validated_data["cliente"]
        monto_ars = serializer.validated_data["monto_ars"]
        comprobante = serializer.validated_data.get("comprobante")
        comprobante_archivo = serializer.validated_data.get("comprobante_archivo")

        with transaction.atomic():
            tc_obj, tc_valor, monto_usd = calcular_compra(monto_ars)
            compra = Compra.objects.create(
                cliente=cliente,
                empresa=cliente.empresa,
                operador=request.user,
                monto_ars=monto_ars,
                comprobante=comprobante,
                comprobante_archivo=comprobante_archivo,
                tc=tc_valor,
                monto_usd=monto_usd,
                tipo_cambio=tc_obj,
            )

            cliente.cant_compras += 1
            cliente.total_compras_ars = (cliente.total_compras_ars or 0) + monto_ars
            cliente.total_compras_usd = (cliente.total_compras_usd or 0) + monto_usd
            cliente.save(update_fields=["cant_compras", "total_compras_ars", "total_compras_usd"])

        output = self.get_serializer(compra)
        return Response(output.data, status=status.HTTP_201_CREATED)
