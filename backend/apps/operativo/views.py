import uuid
from datetime import datetime, time, timedelta

from django.db import models, transaction
from django.db.models import Sum, Min
from django.db.models import Exists, OuterRef, Subquery
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.empresas.permissions import RoleBasedPermission, is_admin, is_operador, is_pauta
from apps.empresas.scope import filter_queryset_by_empresa, resolve_request_empresa_id
from apps.empresas.models import Empresa
from apps.recursos.servicios.whatsapp_rotacion import seleccionar_numero_whatsapp
from .models import Cliente, EventosMeta, Landing, Compra, LandingVisit
from .serializers import (
    ClienteCreateSerializer,
    ClienteSerializer,
    EventosMetaCreateSerializer,
    EventosMetaReadSerializer,
    LandingSerializer,
    CompraSerializer,
    LandingVisitSerializer,
    LandingVisitCreateSerializer,
)
from .servicios.calculos import calcular_compra
from .servicios.enviador import enviar_evento_meta
from apps.pauta.servicios.insights import fetch_meta_page_views
from apps.pauta.models import GastoDiario
from .realtime import publish_empresa_event

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


def _get_date_range(request):
    period = request.query_params.get("period")
    from_str = request.query_params.get("from")
    to_str = request.query_params.get("to")

    if from_str and to_str:
        from_date = parse_date(from_str)
        to_date = parse_date(to_str)
        if from_date and to_date:
            return from_date, to_date

    if period:
        today = timezone.now().date()
        if period == "day":
            return today - timedelta(days=1), today
        if period == "week":
            return today - timedelta(days=7), today
        if period == "month":
            return today - timedelta(days=30), today

    today = timezone.now().date()
    return today - timedelta(days=7), today


def _get_datetime_range(request):
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

    return start, end


def _get_empresa_scope_id(request):
    return resolve_request_empresa_id(request, allow_empty_for_superuser=False)


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
        return filter_queryset_by_empresa(super().get_queryset(), self.request, field_name="empresa_id")

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
            data={
                "phone": cliente.contacto,
                "external_id": str(cliente.uuid),
                "event_source_url": cliente.event_source_url,
            },
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
        publish_empresa_event(
            empresa_id=landing.empresa_id,
            event_type="lead_created",
            payload={
                "id": evento.id,
                "cliente": cliente.id,
                "cliente_nombre": cliente.nombre,
                "cliente_username": cliente.username,
                "cliente_contacto": cliente.contacto,
                "creado_en": evento.creado_en.isoformat(),
            },
        )
        return Response(output.data, status=status.HTTP_201_CREATED)


class LandingViewSet(viewsets.ModelViewSet):
    queryset = Landing.objects.all()
    serializer_class = LandingSerializer
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        if self.action in {"whatsapp_rotacion", "public"}:
            return [AllowAny()]
        return [IsAuthenticated(), RoleBasedPermission()]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return is_admin(request.user) or is_pauta(request.user)

    def get_queryset(self):
        return filter_queryset_by_empresa(super().get_queryset(), self.request, field_name="empresa_id")

    def perform_create(self, serializer):
        empresa = getattr(self.request.user, "empresa", None)
        if not empresa:
            empresa_id = self.request.data.get("empresa")
            if empresa_id:
                empresa = Empresa.objects.filter(id=empresa_id).first()
        if not empresa:
            raise ValidationError("Empresa requerida.")
        serializer.save(empresa=empresa)

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


class LandingVisitViewSet(viewsets.ModelViewSet):
    queryset = LandingVisit.objects.all()
    http_method_names = ["get", "post"]

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated(), RoleBasedPermission()]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return is_admin(request.user) or is_pauta(request.user) or is_operador(request.user)

    def get_queryset(self):
        return filter_queryset_by_empresa(super().get_queryset(), self.request, field_name="empresa_id")

    def get_serializer_class(self):
        if self.action == "create":
            return LandingVisitCreateSerializer
        return LandingVisitSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = serializer.save()
        publish_empresa_event(
            empresa_id=visit.empresa_id,
            event_type="landing_visit_created",
            payload={
                "id": visit.id,
                "landing_id": visit.landing_id,
                "creado_en": visit.creado_en.isoformat(),
            },
        )
        output = LandingVisitSerializer(visit)
        return Response(output.data, status=status.HTTP_201_CREATED)


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
        qs = filter_queryset_by_empresa(super().get_queryset(), self.request, field_name="empresa_id")
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
        qs = qs.annotate(
            contactado=Exists(
                EventosMeta.objects.filter(
                    cliente_id=OuterRef("cliente_id"),
                    tipo="contact",
                )
            )
        )
        sin_contacto = self.request.query_params.get("sin_contacto")
        if sin_contacto in {"1", "true", "True"}:
            qs = qs.filter(tipo="lead", contactado=False)
        return qs.order_by("-creado_en")

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
        cliente = Cliente.objects.filter(id=serializer.validated_data["cliente_id"]).only("id", "uuid", "fbp", "fbc").first()
        if cliente:
            payload["external_id"] = str(cliente.uuid)

        evento = EventosMeta.objects.create(
            id_evento=uuid.uuid4(),
            cliente_id=serializer.validated_data["cliente_id"],
            empresa_id=empresa_id,
            landing=landing,
            operador=operador,
            tipo=serializer.validated_data["tipo"],
            data=payload,
            fbp=serializer.validated_data.get("fbp") or (cliente.fbp if cliente else None),
            fbc=serializer.validated_data.get("fbc") or (cliente.fbc if cliente else None),
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
        qs = filter_queryset_by_empresa(super().get_queryset(), self.request, field_name="empresa_id")
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
        was_first_purchase = False
        compra = None

        with transaction.atomic():
            cliente = Cliente.objects.select_for_update().get(pk=cliente.pk)
            was_first_purchase = cliente.cant_compras == 0
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

        if was_first_purchase:
            payload = {
                "value": float(compra.monto_usd) if compra.monto_usd is not None else float(monto_ars),
                "currency": "USD",
                "phone": cliente.contacto,
                "external_id": str(cliente.uuid),
            }
            evento = EventosMeta.objects.create(
                id_evento=uuid.uuid4(),
                cliente=cliente,
                empresa=cliente.empresa,
                landing=None,
                operador=request.user,
                tipo="purchase",
                data=payload,
                fbp=cliente.fbp,
                fbc=cliente.fbc,
            )
            try:
                enviar_evento_meta(evento, request=request)
            except Exception as exc:
                evento.estado_envio = "fallido"
                evento.respuesta_meta = {"error": str(exc)}
                evento.save(update_fields=["estado_envio", "respuesta_meta"])

        output = self.get_serializer(compra)
        publish_empresa_event(
            empresa_id=cliente.empresa_id,
            event_type="compra_created",
            payload={
                "id": compra.id,
                "username": cliente.username,
                "contacto": cliente.contacto,
                "hora": compra.creado_en.isoformat(),
                "monto_ars": float(compra.monto_ars or 0),
                "monto_usd": float(compra.monto_usd or 0),
                "operador": request.user.username if request.user else "",
            },
        )
        return Response(output.data, status=status.HTTP_201_CREATED)


class StatsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return is_admin(request.user) or is_pauta(request.user) or is_operador(request.user)

    def list(self, request):
        empresa_id = _get_empresa_scope_id(request)

        visitas_qs = LandingVisit.objects.filter(empresa_id=empresa_id)
        eventos_qs = EventosMeta.objects.filter(empresa_id=empresa_id)
        compras_qs = Compra.objects.filter(empresa_id=empresa_id)
        gastos_qs = GastoDiario.objects.filter(empresa_id=empresa_id)

        visitas_qs = _apply_date_filters(visitas_qs, "creado_en", request)
        eventos_qs = _apply_date_filters(eventos_qs, "creado_en", request)
        compras_qs = _apply_date_filters(compras_qs, "creado_en", request)
        from_date, to_date = _get_date_range(request)
        gastos_qs = gastos_qs.filter(fecha__gte=from_date, fecha__lte=to_date)

        web_visitors = visitas_qs.count()
        leads = eventos_qs.filter(tipo="lead").count()
        contactos = eventos_qs.filter(tipo="contact").count()

        compras_count = compras_qs.count()
        compras_total = compras_qs.aggregate(total=Sum("monto_ars"))["total"] or 0

        compras_clientes = compras_qs.values("cliente_id").distinct().count()
        conversion_pct = (compras_clientes / contactos * 100) if contactos else 0
        valor_compra_prom = (compras_total / compras_count) if compras_count else 0

        first_purchase_id_subquery = (
            Compra.objects.filter(empresa_id=empresa_id, cliente_id=OuterRef("cliente_id"))
            .order_by("creado_en", "id")
            .values("id")[:1]
        )
        primeras_compras_qs = Compra.objects.filter(
            empresa_id=empresa_id,
            id=Subquery(first_purchase_id_subquery),
        )
        start_dt, end_dt = _get_datetime_range(request)
        if start_dt:
            primeras_compras_qs = primeras_compras_qs.filter(creado_en__gte=start_dt)
        if end_dt:
            primeras_compras_qs = primeras_compras_qs.filter(creado_en__lte=end_dt)
        primeras_compras_usd = primeras_compras_qs.aggregate(total=Sum("monto_usd"))["total"] or 0
        gasto_usd = gastos_qs.aggregate(total=Sum("monto_usd"))["total"] or 0
        roas = (primeras_compras_usd / gasto_usd) if gasto_usd else 0

        firsts = (
            compras_qs.values("cliente_id")
            .annotate(first=Min("creado_en"))
        )
        first_map = {row["cliente_id"]: row["first"] for row in firsts}
        retenidos = 0
        if first_map:
            compras_all = (
                Compra.objects.filter(empresa_id=empresa_id, cliente_id__in=first_map.keys())
                .values("cliente_id", "creado_en")
                .order_by("cliente_id", "creado_en")
            )
            by_cliente = {}
            for row in compras_all:
                by_cliente.setdefault(row["cliente_id"], []).append(row["creado_en"])
            for cliente_id, first_date in first_map.items():
                compras_cliente = by_cliente.get(cliente_id, [])
                for fecha in compras_cliente:
                    if fecha > first_date and fecha <= first_date + timedelta(days=7):
                        retenidos += 1
                        break
        retencion_pct = (retenidos / len(first_map) * 100) if first_map else 0

        response = {
            "web_visitors": web_visitors,
            "leads": leads,
            "contactos": contactos,
            "compras": {
                "count": compras_count,
                "monto_total": compras_total,
            },
            "conversion_pct": conversion_pct,
            "valor_compra_prom": valor_compra_prom,
            "retencion_pct": retencion_pct,
            "primeras_compras_usd": primeras_compras_usd,
            "gasto_usd": gasto_usd,
            "roas": roas,
            "base": {
                "contactos": contactos,
                "compras_clientes": compras_clientes,
                "clientes_primera_compra": len(first_map),
            },
        }

        if request.query_params.get("include_meta") in {"1", "true", "True"}:
            since, until = _get_date_range(request)
            response["meta_page_views"] = fetch_meta_page_views(
                empresa_id=empresa_id,
                since=str(since),
                until=str(until),
            )

        return Response(response)

    @action(detail=False, methods=["get"], url_path="nuevas-compras")
    def nuevas_compras(self, request):
        user = request.user
        empresa_id = _get_empresa_scope_id(request)

        limit_param = request.query_params.get("limit", "20")
        try:
            limit = int(limit_param)
        except ValueError:
            limit = 20
        limit = max(1, min(limit, 100))

        compras_qs = (
            Compra.objects.filter(empresa_id=empresa_id)
            .select_related("cliente", "operador")
        )
        if is_operador(user):
            compras_qs = compras_qs.filter(operador=user)

        compras_qs = _apply_date_filters(compras_qs, "creado_en", request)
        compras_qs = compras_qs.order_by("-creado_en")[:limit]

        data = [
            {
                "id": compra.id,
                "username": compra.cliente.username if compra.cliente else "",
                "contacto": compra.cliente.contacto if compra.cliente else "",
                "hora": compra.creado_en,
                "monto_ars": compra.monto_ars,
                "monto_usd": compra.monto_usd,
                "operador": compra.operador.username if compra.operador else "",
            }
            for compra in compras_qs
        ]
        return Response(data)

    @action(detail=False, methods=["get"], url_path="eventos-recientes")
    def eventos_recientes(self, request):
        user = request.user
        empresa_id = _get_empresa_scope_id(request)

        limit_param = request.query_params.get("limit", "25")
        try:
            limit = int(limit_param)
        except ValueError:
            limit = 25
        limit = max(1, min(limit, 100))

        eventos_qs = (
            EventosMeta.objects.filter(empresa_id=empresa_id, tipo__in=["lead", "contact"])
            .select_related("cliente", "operador")
        )
        if is_operador(user):
            eventos_qs = eventos_qs.filter(
                (models.Q(tipo="lead") & models.Q(operador__isnull=True))
                | (models.Q(tipo="contact") & models.Q(operador=user))
            )
        eventos_qs = _apply_date_filters(eventos_qs, "creado_en", request).order_by("-creado_en")[:limit]

        compras_qs = (
            Compra.objects.filter(empresa_id=empresa_id)
            .select_related("cliente", "operador")
        )
        if is_operador(user):
            compras_qs = compras_qs.filter(operador=user)
        compras_qs = _apply_date_filters(compras_qs, "creado_en", request).order_by("-creado_en")[:limit]

        feed = []

        for evento in eventos_qs:
            feed.append(
                {
                    "id": f"{evento.tipo}-{evento.id}",
                    "evento": evento.tipo,
                    "evento_label": "Lead" if evento.tipo == "lead" else "Contacto",
                    "fecha_hora": evento.creado_en,
                    "username": evento.cliente.username if evento.cliente else "",
                    "nombre": evento.cliente.nombre if evento.cliente else "",
                    "contacto": evento.cliente.contacto if evento.cliente else "",
                    "operador": evento.operador.username if evento.operador else "",
                    "cliente_id": evento.cliente_id,
                }
            )

        for compra in compras_qs:
            comprobante_url = ""
            if compra.comprobante_archivo:
                try:
                    comprobante_url = compra.comprobante_archivo.url
                except Exception:
                    comprobante_url = ""
            if not comprobante_url:
                comprobante_url = compra.comprobante or ""

            feed.append(
                {
                    "id": f"compra-{compra.id}",
                    "evento": "compra",
                    "evento_label": "Compra",
                    "fecha_hora": compra.creado_en,
                    "username": compra.cliente.username if compra.cliente else "",
                    "nombre": compra.cliente.nombre if compra.cliente else "",
                    "contacto": compra.cliente.contacto if compra.cliente else "",
                    "operador": compra.operador.username if compra.operador else "",
                    "cliente_id": compra.cliente_id,
                    "compra_id": compra.id,
                    "monto_ars": compra.monto_ars,
                    "monto_usd": compra.monto_usd,
                    "comprobante_url": comprobante_url,
                }
            )

        feed.sort(key=lambda item: item["fecha_hora"], reverse=True)
        return Response(feed[:limit])
