import uuid
import json
from collections import defaultdict
from datetime import datetime, time, timedelta
import requests

from django.db import models, transaction
from django.db.models import Sum, Min, Subquery, Count, Value, DecimalField, IntegerField
from django.db.models import Exists, OuterRef
from django.db.models.functions import Coalesce
from django.core.cache import cache
from django.conf import settings
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
from apps.empresas.scope import filter_queryset_by_empresa, resolve_request_empresa_id, get_user_empresa_ids
from apps.empresas.models import Empresa
from apps.recursos.models import TipoCambio
from apps.recursos.servicios.whatsapp_rotacion import seleccionar_numero_whatsapp
from .models import Cliente, EventosMeta, Landing, Compra, LandingVisit, Retiro
from .serializers import (
    ClienteCreateSerializer,
    ClienteSerializer,
    EventosMetaCreateSerializer,
    EventosMetaReadSerializer,
    KommoContactWebhookSerializer,
    KommoLeadWebhookSerializer,
    LandingSerializer,
    CompraSerializer,
    RetiroSerializer,
    LandingVisitSerializer,
    LandingVisitCreateSerializer,
    normalize_contacto,
)
from .servicios.calculos import calcular_compra
from .servicios.enviador import enviar_evento_meta
from apps.pauta.servicios.insights import fetch_meta_page_views
from apps.pauta.servicios.telegram_alerts import send_lead_queue_alert
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


def _resolve_target_empresa_for_write(request, *, cliente_empresa_id=None, empresa_input=None) -> int:
    if empresa_input not in (None, ""):
        try:
            empresa_input = int(empresa_input)
        except (TypeError, ValueError):
            raise ValidationError("Parametro empresa invalido.")
    else:
        empresa_input = None

    user = request.user
    if user.is_superuser:
        target = empresa_input or cliente_empresa_id
        if not target:
            raise ValidationError("Empresa requerida.")
        return int(target)

    allowed_ids = get_user_empresa_ids(user)
    if not allowed_ids:
        raise ValidationError("Empresa no disponible en el usuario actual.")

    if empresa_input is not None:
        if empresa_input not in allowed_ids:
            raise ValidationError("No tenes acceso a la empresa seleccionada.")
        target = empresa_input
    else:
        if cliente_empresa_id and int(cliente_empresa_id) in allowed_ids:
            target = int(cliente_empresa_id)
        elif len(allowed_ids) == 1:
            target = int(allowed_ids[0])
        else:
            raise ValidationError("Empresa requerida para crear el registro.")

    if cliente_empresa_id and int(cliente_empresa_id) != int(target):
        raise ValidationError("El cliente no pertenece a la empresa seleccionada.")
    return int(target)


def _get_empresa_operating_mode(empresa_id: int) -> str:
    empresa = (
        Empresa.objects
        .filter(id=empresa_id)
        .only("id", "operating_mode")
        .first()
    )
    if not empresa:
        return Empresa.OPERATING_MODE_FULL
    return empresa.operating_mode or Empresa.OPERATING_MODE_FULL


def _is_wallet_enabled_for_empresa(empresa_id: int) -> bool:
    return _get_empresa_operating_mode(empresa_id) == Empresa.OPERATING_MODE_FULL


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    filterset_fields = ["empresa__id"]
    EDITABLE_FIELDS = {"nombre", "contacto", "username"}

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
            return self.action in {"list", "retrieve", "partial_update"}
        return False

    def get_queryset(self):
        qs = filter_queryset_by_empresa(super().get_queryset(), self.request, field_name="empresa_id")

        compras_base = Compra.objects.filter(cliente_id=OuterRef("pk")).values("cliente_id")
        retiros_base = Retiro.objects.filter(cliente_id=OuterRef("pk")).values("cliente_id")

        qs = qs.annotate(
            total_bonos_ars=Coalesce(
                Subquery(compras_base.annotate(v=Sum("bono_ars")).values("v")[:1]),
                Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            total_bonos_usd=Coalesce(
                Subquery(compras_base.annotate(v=Sum("bono_usd")).values("v")[:1]),
                Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            cant_retiros=Coalesce(
                Subquery(retiros_base.annotate(v=Count("id")).values("v")[:1]),
                Value(0),
                output_field=IntegerField(),
            ),
            total_retiros_ars=Coalesce(
                Subquery(retiros_base.annotate(v=Sum("monto_ars")).values("v")[:1]),
                Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            total_retiros_usd=Coalesce(
                Subquery(retiros_base.annotate(v=Sum("monto_usd")).values("v")[:1]),
                Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
        )
        return qs

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

        publish_empresa_event(
            empresa_id=landing.empresa_id,
            event_type="lead_created",
            payload={
                "id": evento.id,
                "cliente": cliente.id,
                "cliente_codigo": cliente.codigo,
                "cliente_nombre": cliente.nombre,
                "cliente_username": cliente.username,
                "cliente_contacto": cliente.contacto,
                "creado_en": evento.creado_en.isoformat(),
            },
        )

        output = ClienteSerializer(cliente)
        return Response(output.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        payload = {}
        for field_name in self.EDITABLE_FIELDS:
            if field_name not in request.data:
                continue
            raw_value = request.data.get(field_name)
            value = raw_value.strip() if isinstance(raw_value, str) else raw_value
            if field_name == "contacto":
                value = normalize_contacto(value)
            payload[field_name] = value or None

        if not payload:
            raise ValidationError("No hay campos editables para actualizar.")

        serializer = self.get_serializer(instance, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class KommoWebhookViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def _normalize_phone(self, value):
        if not value:
            return ""
        return "".join(ch for ch in str(value) if ch.isdigit())[:15]

    def _resolve_landing(self, landing_token):
        if not landing_token:
            return None
        return get_object_or_404(Landing, token=landing_token, activo=True)

    def _phone_candidates(self, value):
        digits = self._normalize_phone(value)
        if not digits:
            return []
        candidates = [digits]
        if len(digits) > 10:
            candidates.append(digits[-10:])
        if len(digits) > 8:
            candidates.append(digits[-8:])
        # keep order and unique
        seen = set()
        result = []
        for item in candidates:
            if item in seen:
                continue
            seen.add(item)
            result.append(item)
        return result

    def _resolve_cliente(self, data, landing=None):
        cliente_id = data.get("cliente_id")
        if cliente_id:
            return Cliente.objects.filter(id=cliente_id).first()

        cliente_uuid = data.get("cliente_uuid")
        if cliente_uuid:
            return Cliente.objects.filter(uuid=cliente_uuid).first()

        phone_candidates = self._phone_candidates(data.get("contacto") or data.get("phone"))
        if not phone_candidates:
            return None

        filters = {}
        empresa_id = data.get("empresa_id")
        if empresa_id:
            filters["empresa_id"] = empresa_id
        elif landing:
            filters["empresa_id"] = landing.empresa_id

        base_qs = Cliente.objects.filter(**filters)
        by_exact = base_qs.filter(contacto__in=phone_candidates).order_by("-id").first()
        if by_exact:
            return by_exact

        # fallback: match by suffix in case Kommo phone carries country/mobile prefixes
        q = models.Q()
        for candidate in phone_candidates:
            q |= models.Q(contacto__endswith=candidate)
        return base_qs.filter(q).order_by("-id").first()

    def _event_payload(self, cliente, data, include_value=False):
        payload = {
            "phone": self._normalize_phone(data.get("phone") or data.get("contacto")) or cliente.contacto,
            "email": data.get("email"),
            "external_id": str(cliente.uuid),
            "nombre": cliente.nombre,
            "event_source_url": data.get("event_source_url") or cliente.event_source_url,
        }
        if include_value:
            payload["value"] = data.get("value")
            payload["currency"] = data.get("currency")
        return payload

    def _is_deduped(self, dedup_key):
        if not dedup_key:
            return False
        cache_key = f"kommo_webhook_dedup:{dedup_key}"
        if cache.get(cache_key):
            return True
        cache.set(cache_key, True, timeout=24 * 60 * 60)
        return False

    def _contact_dedup_days(self):
        try:
            return max(int(getattr(settings, "KOMMO_CONTACT_DEDUP_DAYS", 7) or 7), 0)
        except (TypeError, ValueError):
            return 7

    def _has_recent_contact(self, cliente):
        days = self._contact_dedup_days()
        if days <= 0:
            return False
        since = timezone.now() - timedelta(days=days)
        return EventosMeta.objects.filter(
            cliente=cliente,
            tipo="contact",
            creado_en__gte=since,
        ).exists()

    def _as_dict(self, value):
        if isinstance(value, dict):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                return {}
        return {}

    def _first_kommo_entity(self, block):
        if not isinstance(block, dict):
            return None
        for key in ("add", "update", "status", "restore", "merge"):
            items = block.get(key)
            if isinstance(items, list) and items:
                return items[0]
        return None

    def _extract_kommo_custom_fields(self, entity):
        result = {}
        if not isinstance(entity, dict):
            return result
        fields = entity.get("custom_fields_values")
        if not isinstance(fields, list):
            return result
        for field in fields:
            if not isinstance(field, dict):
                continue
            field_code = str(field.get("field_code") or "").upper()
            field_name = str(field.get("field_name") or "").strip().lower()
            values = field.get("values")
            if not isinstance(values, list) or not values:
                continue
            raw_value = values[0].get("value")
            if raw_value in (None, ""):
                continue
            value = str(raw_value)
            if field_code == "PHONE" and not result.get("phone"):
                result["phone"] = value
            elif field_code == "EMAIL" and not result.get("email"):
                result["email"] = value
            elif field_name in {"cliente_id", "client_id"} and not result.get("cliente_id"):
                try:
                    result["cliente_id"] = int(value)
                except (TypeError, ValueError):
                    pass
            elif field_name in {"cliente_uuid", "client_uuid", "uuid_cliente"} and not result.get("cliente_uuid"):
                result["cliente_uuid"] = value
            elif field_name in {"landing_token"} and not result.get("landing_token"):
                result["landing_token"] = value
        return result

    def _resolve_kommo_empresa(self, data):
        account_id = data.get("kommo_account_id")
        subdomain = str(data.get("kommo_subdomain") or "").strip().lower()

        empresa = None
        if account_id:
            try:
                empresa = Empresa.objects.filter(kommo_account_id=int(account_id), activo=True).only(
                    "id",
                    "kommo_enabled",
                    "kommo_access_token",
                    "kommo_webhook_secret",
                    "kommo_subdomain",
                    "kommo_account_id",
                ).first()
            except (TypeError, ValueError):
                empresa = None
        if not empresa and subdomain:
            empresa = Empresa.objects.filter(kommo_subdomain=subdomain, activo=True).only(
                "id",
                "kommo_enabled",
                "kommo_access_token",
                "kommo_webhook_secret",
                "kommo_subdomain",
                "kommo_account_id",
            ).first()
        return empresa

    def _kommo_headers(self, empresa=None):
        token = ""
        if empresa and empresa.kommo_access_token:
            token = str(empresa.kommo_access_token).strip()
        if not token:
            token = getattr(settings, "KOMMO_ACCESS_TOKEN", "")
        if not token:
            return None
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

    def _kommo_base_url(self, subdomain):
        if not subdomain:
            return None
        return f"https://{subdomain}.amocrm.com/api/v4"

    def _kommo_get(self, base_url, path, empresa=None):
        headers = self._kommo_headers(empresa=empresa)
        if not headers or not base_url:
            return None
        try:
            response = requests.get(f"{base_url}{path}", headers=headers, timeout=8)
            if response.status_code >= 400:
                return None
            return response.json()
        except Exception:
            return None

    def _extract_phone_email_from_kommo_entity(self, entity):
        result = {}
        extracted = self._extract_kommo_custom_fields(entity or {})
        if extracted.get("phone"):
            result["phone"] = extracted["phone"]
        if extracted.get("email"):
            result["email"] = extracted["email"]
        return result

    def _kommo_lookup_details(self, kind, data, empresa=None):
        subdomain = data.get("kommo_subdomain")
        base_url = self._kommo_base_url(subdomain)
        if not base_url:
            return {}

        if kind == "lead":
            lead_id = data.get("kommo_entity_id")
            if not lead_id:
                return {}
            lead = self._kommo_get(base_url, f"/leads/{lead_id}?with=contacts", empresa=empresa)
            if not isinstance(lead, dict):
                return {}

            result = self._extract_phone_email_from_kommo_entity(lead)
            if result.get("phone"):
                return result

            contacts_embedded = ((lead.get("_embedded") or {}).get("contacts") or [])
            for contact_ref in contacts_embedded:
                contact_id = contact_ref.get("id")
                if not contact_id:
                    continue
                contact = self._kommo_get(base_url, f"/contacts/{contact_id}", empresa=empresa)
                if not isinstance(contact, dict):
                    continue
                cdata = self._extract_phone_email_from_kommo_entity(contact)
                if cdata.get("phone"):
                    return cdata
            return result

        contact_id = data.get("kommo_entity_id")
        if not contact_id:
            return {}
        contact = self._kommo_get(base_url, f"/contacts/{contact_id}", empresa=empresa)
        if not isinstance(contact, dict):
            return {}
        return self._extract_phone_email_from_kommo_entity(contact)

    def _extract_kommo_payload(self, request, kind):
        request_data = request.data
        account = self._as_dict(request_data.get("account"))
        leads = self._as_dict(request_data.get("leads"))
        contacts = self._as_dict(request_data.get("contacts"))
        if not account and not leads and not contacts:
            return None

        entity = self._first_kommo_entity(leads if kind == "lead" else contacts)
        if entity is None:
            entity = self._first_kommo_entity(contacts if kind == "lead" else leads)
        if entity is None:
            return None

        account_id = account.get("id")
        account_subdomain = account.get("subdomain")
        entity_id = entity.get("id")
        modified_at = entity.get("updated_at") or entity.get("last_modified") or ""
        request_id = request.headers.get("X-AmoCRM-RequestId") or request.headers.get("x-amocrm-requestid")
        dedup_key = request_id or f"kommo:{account_id}:{kind}:{entity_id}:{modified_at}"

        extracted = self._extract_kommo_custom_fields(entity)
        payload = {
            "dedup_key": dedup_key,
            "cliente_id": extracted.get("cliente_id"),
            "cliente_uuid": extracted.get("cliente_uuid"),
            "landing_token": extracted.get("landing_token"),
            "contacto": extracted.get("phone"),
            "phone": extracted.get("phone"),
            "email": extracted.get("email"),
            "nombre": entity.get("name"),
            "kommo_account_id": account_id,
            "kommo_subdomain": account_subdomain,
            "kommo_entity_id": entity_id,
        }
        return payload

    def _validate_secret(self, request, tenant_empresa=None):
        expected = ""
        if tenant_empresa and str(getattr(tenant_empresa, "kommo_webhook_secret", "")).strip():
            expected = str(tenant_empresa.kommo_webhook_secret).strip()
        if not expected:
            expected = getattr(settings, "KOMMO_WEBHOOK_SECRET", "")
        if not expected:
            return
        provided = (
            request.headers.get("X-Kommo-Secret")
            or request.query_params.get("secret")
            or request.data.get("secret")
            or ""
        )
        if provided != expected:
            raise ValidationError("Webhook secret invalido.")

    @action(detail=False, methods=["post"], url_path="lead-confirm")
    def lead_confirm(self, request):
        kommo_data = self._extract_kommo_payload(request, kind="lead")
        tenant_empresa = None
        if kommo_data is not None:
            data = kommo_data
            tenant_empresa = self._resolve_kommo_empresa(data)
            self._validate_secret(request, tenant_empresa=tenant_empresa)
            if not tenant_empresa:
                return Response(
                    {"ok": False, "ignored": True, "detail": "Empresa tenant no mapeada para esta cuenta Kommo."},
                    status=status.HTTP_202_ACCEPTED,
                )
            if not bool(getattr(tenant_empresa, "kommo_enabled", False)):
                return Response(
                    {"ok": False, "ignored": True, "detail": "Empresa con integracion Kommo desactivada."},
                    status=status.HTTP_202_ACCEPTED,
                )
            data["empresa_id"] = tenant_empresa.id
        else:
            self._validate_secret(request)
            serializer = KommoLeadWebhookSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data

        if self._is_deduped(data.get("dedup_key")):
            return Response({"ok": True, "deduped": True}, status=status.HTTP_200_OK)

        landing = self._resolve_landing(data.get("landing_token"))
        if landing and data.get("empresa_id") and landing.empresa_id != int(data["empresa_id"]):
            return Response(
                {"ok": False, "ignored": True, "detail": "Landing no coincide con empresa tenant."},
                status=status.HTTP_202_ACCEPTED,
            )
        cliente = self._resolve_cliente(data, landing=landing)
        if not cliente and data.get("kommo_entity_id"):
            details = self._kommo_lookup_details("lead", data, empresa=tenant_empresa)
            if details.get("phone") and not data.get("phone"):
                data["phone"] = details["phone"]
                data["contacto"] = details["phone"]
            if details.get("email") and not data.get("email"):
                data["email"] = details["email"]
            cliente = self._resolve_cliente(data, landing=landing)
        if not cliente:
            return Response(
                {
                    "ok": False,
                    "ignored": True,
                    "detail": "Cliente no encontrado para confirmar lead.",
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if self._has_recent_contact(cliente):
            return Response(
                {
                    "ok": True,
                    "deduped_window": True,
                    "detail": f"Contacto ya registrado en la ventana de {self._contact_dedup_days()} dias.",
                    "cliente_id": cliente.id,
                },
                status=status.HTTP_200_OK,
            )

        # En Kommo, "Lead agregado" representa el primer mensaje/contacto.
        # Lo mapeamos a evento "contact" en ControlAR.
        evento = EventosMeta.objects.create(
            id_evento=uuid.uuid4(),
            cliente=cliente,
            empresa=cliente.empresa,
            landing=landing,
            operador=None,
            tipo="contact",
            data=self._event_payload(cliente, data),
            fbp=data.get("fbp") or cliente.fbp,
            fbc=data.get("fbc") or cliente.fbc,
        )
        try:
            enviar_evento_meta(evento, request=request)
        except Exception as exc:
            evento.estado_envio = "fallido"
            evento.respuesta_meta = {"error": str(exc)}
            evento.save(update_fields=["estado_envio", "respuesta_meta"])

        publish_empresa_event(
            empresa_id=cliente.empresa_id,
            event_type="contact_created",
            payload={
                "id": evento.id,
                "cliente": cliente.id,
                "cliente_nombre": cliente.nombre,
                "cliente_username": cliente.username,
                "cliente_contacto": cliente.contacto,
                "creado_en": evento.creado_en.isoformat(),
            },
        )
        return Response({"ok": True, "evento_id": evento.id, "cliente_id": cliente.id}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="contact")
    def contact(self, request):
        kommo_data = self._extract_kommo_payload(request, kind="contact")
        tenant_empresa = None
        if kommo_data is not None:
            data = kommo_data
            tenant_empresa = self._resolve_kommo_empresa(data)
            self._validate_secret(request, tenant_empresa=tenant_empresa)
            if not tenant_empresa:
                return Response(
                    {"ok": False, "ignored": True, "detail": "Empresa tenant no mapeada para esta cuenta Kommo."},
                    status=status.HTTP_202_ACCEPTED,
                )
            if not bool(getattr(tenant_empresa, "kommo_enabled", False)):
                return Response(
                    {"ok": False, "ignored": True, "detail": "Empresa con integracion Kommo desactivada."},
                    status=status.HTTP_202_ACCEPTED,
                )
            data["empresa_id"] = tenant_empresa.id
        else:
            self._validate_secret(request)
            serializer = KommoContactWebhookSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data

        if self._is_deduped(data.get("dedup_key")):
            return Response({"ok": True, "deduped": True}, status=status.HTTP_200_OK)

        landing = self._resolve_landing(data.get("landing_token"))
        if landing and data.get("empresa_id") and landing.empresa_id != int(data["empresa_id"]):
            return Response(
                {"ok": False, "ignored": True, "detail": "Landing no coincide con empresa tenant."},
                status=status.HTTP_202_ACCEPTED,
            )
        cliente = self._resolve_cliente(data, landing=landing)
        if not cliente and data.get("kommo_entity_id"):
            details = self._kommo_lookup_details("contact", data, empresa=tenant_empresa)
            if details.get("phone") and not data.get("phone"):
                data["phone"] = details["phone"]
                data["contacto"] = details["phone"]
            if details.get("email") and not data.get("email"):
                data["email"] = details["email"]
            cliente = self._resolve_cliente(data, landing=landing)
        if not cliente:
            return Response(
                {
                    "ok": False,
                    "ignored": True,
                    "detail": "Cliente no encontrado para crear contacto.",
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if not landing:
            landing = (
                EventosMeta.objects.filter(cliente=cliente, tipo="lead", landing__isnull=False)
                .order_by("-creado_en")
                .values_list("landing", flat=True)
                .first()
            )
            if landing:
                landing = Landing.objects.filter(id=landing).first()

        evento = EventosMeta.objects.create(
            id_evento=uuid.uuid4(),
            cliente=cliente,
            empresa=cliente.empresa,
            landing=landing,
            operador=None,
            tipo="contact",
            data=self._event_payload(cliente, data),
            fbp=data.get("fbp") or cliente.fbp,
            fbc=data.get("fbc") or cliente.fbc,
        )
        try:
            enviar_evento_meta(evento, request=request)
        except Exception as exc:
            evento.estado_envio = "fallido"
            evento.respuesta_meta = {"error": str(exc)}
            evento.save(update_fields=["estado_envio", "respuesta_meta"])

        publish_empresa_event(
            empresa_id=cliente.empresa_id,
            event_type="contact_created",
            payload={
                "id": evento.id,
                "cliente": cliente.id,
                "cliente_nombre": cliente.nombre,
                "cliente_username": cliente.username,
                "cliente_contacto": cliente.contacto,
                "creado_en": evento.creado_en.isoformat(),
            },
        )
        return Response({"ok": True, "evento_id": evento.id, "cliente_id": cliente.id}, status=status.HTTP_201_CREATED)


class LandingViewSet(viewsets.ModelViewSet):
    queryset = Landing.objects.all()
    serializer_class = LandingSerializer
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        if self.action in {"whatsapp_rotacion", "whatsapp_rotacion_consume", "public"}:
            return [AllowAny()]
        return [IsAuthenticated(), RoleBasedPermission()]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return is_admin(request.user) or is_pauta(request.user)

    def get_queryset(self):
        return filter_queryset_by_empresa(super().get_queryset(), self.request, field_name="empresa_id")

    def perform_create(self, serializer):
        user = self.request.user
        empresa = None
        empresa_id = self.request.data.get("empresa") or self.request.query_params.get("empresa")

        if user.is_superuser:
            if not empresa_id:
                raise ValidationError("Empresa requerida.")
            empresa = Empresa.objects.filter(id=empresa_id).first()
        else:
            allowed_ids = get_user_empresa_ids(user)
            if empresa_id not in (None, ""):
                try:
                    empresa_id = int(empresa_id)
                except (TypeError, ValueError):
                    raise ValidationError("Empresa invalida.")
                if empresa_id not in allowed_ids:
                    raise ValidationError("No tenes acceso a la empresa seleccionada.")
                empresa = Empresa.objects.filter(id=empresa_id).first()
            elif getattr(user, "empresa_id", None):
                empresa = Empresa.objects.filter(id=user.empresa_id).first()
            elif len(allowed_ids) == 1:
                empresa = Empresa.objects.filter(id=allowed_ids[0]).first()

        if not empresa:
            raise ValidationError("Empresa requerida.")
        credencial_meta = serializer.validated_data.get("credencial_meta")
        if credencial_meta and credencial_meta.bm.organizacion_id != empresa.organizacion_id:
            raise ValidationError("La credencial Meta seleccionada no pertenece a la organizacion de la empresa.")
        serializer.save(empresa=empresa)

    @action(detail=False, methods=["get"], permission_classes=[AllowAny], url_path="whatsapp-rotacion")
    def whatsapp_rotacion(self, request):
        token = request.query_params.get("landing_token")
        if not token:
            raise ValidationError("landing_token requerido")
        landing = get_object_or_404(Landing, token=token, activo=True)
        try:
            numero = seleccionar_numero_whatsapp(landing.empresa_id, consume=False)
        except ValueError as exc:
            return Response({"detail": str(exc), "numero": ""}, status=status.HTTP_404_NOT_FOUND)
        return Response({"numero": numero})

    @action(detail=False, methods=["post"], permission_classes=[AllowAny], url_path="whatsapp-rotacion/consume")
    def whatsapp_rotacion_consume(self, request):
        token = request.data.get("landing_token")
        if not token:
            raise ValidationError("landing_token requerido")
        landing = get_object_or_404(Landing, token=token, activo=True)
        try:
            numero = seleccionar_numero_whatsapp(landing.empresa_id, consume=True)
            siguiente_numero = seleccionar_numero_whatsapp(landing.empresa_id, consume=False)
        except ValueError as exc:
            return Response(
                {"detail": str(exc), "numero": "", "siguiente_numero": ""},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"numero": numero, "siguiente_numero": siguiente_numero})

    @action(detail=False, methods=["get"], permission_classes=[AllowAny], url_path="public")
    def public(self, request):
        token = request.query_params.get("landing_token")
        if not token:
            raise ValidationError("landing_token requerido")
        landing = get_object_or_404(Landing, token=token, activo=True)
        serializer = self.get_serializer(landing)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[AllowAny], url_path="queue-alert")
    def queue_alert(self, request):
        token = request.data.get("landing_token")
        if not token:
            raise ValidationError("landing_token requerido")

        landing = get_object_or_404(Landing, token=token, activo=True)

        try:
            queue_size = max(int(request.data.get("queue_size") or 0), 0)
        except (TypeError, ValueError):
            queue_size = 0
        try:
            oldest_pending_ms = max(int(request.data.get("oldest_pending_ms") or 0), 0)
        except (TypeError, ValueError):
            oldest_pending_ms = 0
        try:
            threshold_ms = max(int(request.data.get("threshold_ms") or 0), 0)
        except (TypeError, ValueError):
            threshold_ms = 0
        source = str(request.data.get("source") or "landing_form")[:50]

        dedup_key = f"lead_queue_alert:{landing.id}"
        if cache.get(dedup_key):
            return Response({"ok": True, "deduped": True})

        cache.set(dedup_key, True, timeout=30 * 60)

        empresa = landing.empresa
        telegram_result = send_lead_queue_alert(
            empresa_id=empresa.id,
            empresa_nombre=empresa.nombre,
            queue_size=queue_size,
            oldest_pending_ms=oldest_pending_ms,
            threshold_ms=threshold_ms,
            source=source,
        )

        publish_empresa_event(
            empresa_id=empresa.id,
            event_type="lead_queue_alert",
            payload={
                "landing_id": landing.id,
                "landing_nombre": landing.nombre,
                "queue_size": queue_size,
                "oldest_pending_ms": oldest_pending_ms,
                "threshold_ms": threshold_ms,
                "source": source,
                "telegram_sent": int(telegram_result.get("sent") or 0),
                "created_at": timezone.now().isoformat(),
            },
        )

        return Response(
            {
                "ok": True,
                "deduped": False,
                "telegram": {
                    "ok": bool(telegram_result.get("ok")),
                    "sent": int(telegram_result.get("sent") or 0),
                    "error": telegram_result.get("error"),
                },
            },
            status=status.HTTP_202_ACCEPTED,
        )


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
        tipo = serializer.validated_data["tipo"]
        operador = request.user if request.user.is_authenticated else None

        value = serializer.validated_data.get("value")
        if value is not None:
            value = float(value)
        cliente = (
            Cliente.objects
            .filter(id=serializer.validated_data["cliente_id"])
            .only("id", "uuid", "fbp", "fbc", "contacto", "nombre")
            .first()
        )
        payload = {
            "value": value,
            "currency": serializer.validated_data.get("currency"),
            "email": serializer.validated_data.get("email"),
            "phone": serializer.validated_data.get("phone") or (cliente.contacto if cliente else None),
            "nombre": cliente.nombre if cliente else None,
        }
        if cliente:
            payload["external_id"] = str(cliente.uuid)

        evento = EventosMeta.objects.create(
            id_evento=uuid.uuid4(),
            cliente_id=serializer.validated_data["cliente_id"],
            empresa_id=empresa_id,
            landing=landing,
            operador=operador,
            tipo=tipo,
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
        tipo = request.data.get("tipo", "lead")
        test_event_code = request.data.get("test_event_code")
        landing = None

        if tipo == "lead":
            landing_token = request.data.get("landing_token")
            if not landing_token:
                raise ValidationError("landing_token requerido para test de lead.")
            landing = get_object_or_404(Landing, token=landing_token, activo=True)

            _resolve_target_empresa_for_write(
                request,
                empresa_input=landing.empresa_id,
            )

            raw_phone = str(request.data.get("phone") or "")
            digits_phone = "".join(ch for ch in raw_phone if ch.isdigit())[:15]
            phone_value = digits_phone or "0000000000"

            base_username = f"meta_test_e{landing.empresa_id}"
            cliente = Cliente.objects.filter(username=base_username, empresa_id=landing.empresa_id).first()
            if not cliente:
                username_candidate = base_username
                suffix = 1
                while Cliente.objects.filter(username=username_candidate).exists():
                    username_candidate = f"{base_username}_{suffix}"
                    suffix += 1
                cliente = Cliente.objects.create(
                    empresa=landing.empresa,
                    nombre="Meta Test Lead",
                    contacto=phone_value,
                    username=username_candidate,
                    fbp=request.data.get("fbp"),
                    fbc=request.data.get("fbc"),
                )

            payload = {
                "email": request.data.get("email"),
                "phone": request.data.get("phone") or phone_value,
                "value": None,
                "currency": None,
                "fbp": request.data.get("fbp"),
                "fbc": request.data.get("fbc"),
                "external_id": str(cliente.uuid),
                "event_source_url": request.data.get("event_source_url") or landing.url,
            }
            evento = EventosMeta.objects.create(
                tipo="lead",
                data=payload,
                cliente=cliente,
                empresa=landing.empresa,
                operador=request.user,
                landing=landing,
                fbp=request.data.get("fbp"),
                fbc=request.data.get("fbc"),
            )
        else:
            cliente_id = request.data.get("cliente_id")
            if not cliente_id:
                raise ValidationError("cliente_id requerido para contact/purchase.")
            cliente = get_object_or_404(Cliente, id=cliente_id)

            _resolve_target_empresa_for_write(
                request,
                cliente_empresa_id=cliente.empresa_id,
                empresa_input=request.data.get("empresa") or request.data.get("empresa_id"),
            )

            payload = {
                "email": request.data.get("email"),
                "phone": request.data.get("phone"),
                "value": request.data.get("value"),
                "currency": request.data.get("currency"),
                "fbp": request.data.get("fbp"),
                "fbc": request.data.get("fbc"),
            }
            evento = EventosMeta.objects.create(
                tipo=tipo,
                data=payload,
                cliente=cliente,
                empresa=cliente.empresa,
                operador=request.user,
                landing=None,
                fbp=request.data.get("fbp"),
                fbc=request.data.get("fbc"),
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
        target_empresa_id = _resolve_target_empresa_for_write(
            request,
            cliente_empresa_id=cliente.empresa_id,
            empresa_input=request.data.get("empresa") or request.data.get("empresa_id"),
        )
        wallet_enabled = _is_wallet_enabled_for_empresa(target_empresa_id)
        monto_ars = serializer.validated_data["monto_ars"]
        bono_ars = (serializer.validated_data.get("bono_ars") or 0) if wallet_enabled else 0
        comprobante = serializer.validated_data.get("comprobante")
        comprobante_archivo = serializer.validated_data.get("comprobante_archivo")
        was_first_purchase = False
        compra = None

        with transaction.atomic():
            cliente = Cliente.objects.select_for_update().get(pk=cliente.pk)
            was_first_purchase = cliente.cant_compras == 0
            tc_obj, tc_valor, monto_usd = calcular_compra(monto_ars)
            _, _, bono_usd = calcular_compra(bono_ars) if bono_ars else (None, None, 0)
            compra = Compra.objects.create(
                cliente=cliente,
                empresa=cliente.empresa,
                operador=request.user,
                monto_ars=monto_ars,
                bono_ars=bono_ars,
                bono_usd=bono_usd,
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


class RetiroViewSet(viewsets.ModelViewSet):
    queryset = Retiro.objects.all()
    serializer_class = RetiroSerializer
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
        target_empresa_id = _resolve_target_empresa_for_write(
            request,
            cliente_empresa_id=cliente.empresa_id,
            empresa_input=request.data.get("empresa") or request.data.get("empresa_id"),
        )
        if not _is_wallet_enabled_for_empresa(target_empresa_id):
            raise ValidationError("Retiros deshabilitados para esta organizacion (modo solo FTD).")
        monto_ars = serializer.validated_data["monto_ars"]
        comprobante = serializer.validated_data.get("comprobante")
        comprobante_archivo = serializer.validated_data.get("comprobante_archivo")

        tc_obj, tc_valor, monto_usd = calcular_compra(monto_ars)
        retiro = Retiro.objects.create(
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

        output = self.get_serializer(retiro)
        publish_empresa_event(
            empresa_id=cliente.empresa_id,
            event_type="retiro_created",
            payload={
                "id": retiro.id,
                "username": cliente.username,
                "contacto": cliente.contacto,
                "hora": retiro.creado_en.isoformat(),
                "monto_ars": float(retiro.monto_ars or 0),
                "monto_usd": float(retiro.monto_usd or 0),
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
        operating_mode = _get_empresa_operating_mode(empresa_id)
        wallet_enabled = operating_mode == Empresa.OPERATING_MODE_FULL

        visitas_qs = LandingVisit.objects.filter(empresa_id=empresa_id)
        eventos_qs = EventosMeta.objects.filter(empresa_id=empresa_id)
        compras_qs = Compra.objects.filter(empresa_id=empresa_id)
        retiros_qs = Retiro.objects.filter(empresa_id=empresa_id)
        gastos_qs = GastoDiario.objects.filter(empresa_id=empresa_id)

        visitas_qs = _apply_date_filters(visitas_qs, "creado_en", request)
        eventos_qs = _apply_date_filters(eventos_qs, "creado_en", request)
        compras_qs = _apply_date_filters(compras_qs, "creado_en", request)
        retiros_qs = _apply_date_filters(retiros_qs, "creado_en", request)
        from_date, to_date = _get_date_range(request)
        gastos_qs = gastos_qs.filter(fecha__gte=from_date, fecha__lte=to_date)

        web_visitors = visitas_qs.count()
        leads = eventos_qs.filter(tipo="lead").count()
        contactos = eventos_qs.filter(tipo="contact").count()

        compras_count = compras_qs.count()
        compras_total = compras_qs.aggregate(total=Sum("monto_ars"))["total"] or 0
        compras_total_usd = compras_qs.aggregate(total=Sum("monto_usd"))["total"] or 0
        bonos_total_ars = (compras_qs.aggregate(total=Sum("bono_ars"))["total"] or 0) if wallet_enabled else 0
        bonos_total_usd = (compras_qs.aggregate(total=Sum("bono_usd"))["total"] or 0) if wallet_enabled else 0
        retiros_count = retiros_qs.count() if wallet_enabled else 0
        retiros_total_ars = (retiros_qs.aggregate(total=Sum("monto_ars"))["total"] or 0) if wallet_enabled else 0
        retiros_total_usd = (retiros_qs.aggregate(total=Sum("monto_usd"))["total"] or 0) if wallet_enabled else 0

        compras_clientes = compras_qs.values("cliente_id").distinct().count()
        conversion_pct = (compras_clientes / contactos * 100) if contactos else 0
        valor_compra_prom_ars = (compras_total / compras_count) if compras_count else 0
        valor_compra_prom_usd = (compras_total_usd / compras_count) if compras_count else 0

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
        primeras_compras_count = primeras_compras_qs.count()
        primeras_compras_total_ars = primeras_compras_qs.aggregate(total=Sum("monto_ars"))["total"] or 0
        primeras_compras_usd = primeras_compras_qs.aggregate(total=Sum("monto_usd"))["total"] or 0
        gasto_ars = gastos_qs.aggregate(total=Sum("monto_ars"))["total"] or 0
        gasto_usd = gastos_qs.aggregate(total=Sum("monto_usd"))["total"] or 0
        roas_ftd = (primeras_compras_usd / gasto_usd) if gasto_usd else 0
        ganancia_neta_ars = (compras_total - retiros_total_ars - bonos_total_ars) if wallet_enabled else 0
        ganancia_neta_usd = (compras_total_usd - retiros_total_usd - bonos_total_usd) if wallet_enabled else 0
        roas_neto = ((ganancia_neta_usd / gasto_usd) if gasto_usd else 0) if wallet_enabled else 0

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

        cohort_rows = list(
            primeras_compras_qs.values("cliente_id", "creado_en")
        )

        def _compute_ltv(days: int, amount_field: str, bonus_field: str) -> float:
            if not cohort_rows:
                return 0.0
            cohort_ids = [row["cliente_id"] for row in cohort_rows]
            first_map_local = {row["cliente_id"]: row["creado_en"] for row in cohort_rows}
            min_first = min(first_map_local.values())
            max_end = max(dt + timedelta(days=days) for dt in first_map_local.values())

            compras_movs = Compra.objects.filter(
                empresa_id=empresa_id,
                cliente_id__in=cohort_ids,
                creado_en__gte=min_first,
                creado_en__lte=max_end,
            ).values("cliente_id", "creado_en", amount_field, bonus_field)

            retiros_movs = Retiro.objects.filter(
                empresa_id=empresa_id,
                cliente_id__in=cohort_ids,
                creado_en__gte=min_first,
                creado_en__lte=max_end,
            ).values("cliente_id", "creado_en", amount_field)

            net_by_cliente = defaultdict(float)
            for row in compras_movs:
                cliente_id = row["cliente_id"]
                first_at = first_map_local.get(cliente_id)
                if not first_at:
                    continue
                if first_at <= row["creado_en"] <= first_at + timedelta(days=days):
                    net_by_cliente[cliente_id] += float(row.get(amount_field) or 0)
                    if wallet_enabled:
                        net_by_cliente[cliente_id] -= float(row.get(bonus_field) or 0)

            if wallet_enabled:
                for row in retiros_movs:
                    cliente_id = row["cliente_id"]
                    first_at = first_map_local.get(cliente_id)
                    if not first_at:
                        continue
                    if first_at <= row["creado_en"] <= first_at + timedelta(days=days):
                        net_by_cliente[cliente_id] -= float(row.get(amount_field) or 0)

            cohort_size = len(cohort_ids)
            if cohort_size == 0:
                return 0.0
            return float(sum(net_by_cliente.values()) / cohort_size)

        ltv7_usd = _compute_ltv(7, "monto_usd", "bono_usd")
        ltv30_usd = _compute_ltv(30, "monto_usd", "bono_usd")
        ltv60_usd = _compute_ltv(60, "monto_usd", "bono_usd")
        ltv7_ars = _compute_ltv(7, "monto_ars", "bono_ars")
        ltv30_ars = _compute_ltv(30, "monto_ars", "bono_ars")
        ltv60_ars = _compute_ltv(60, "monto_ars", "bono_ars")

        tc_vigente_obj = (
            TipoCambio.objects.filter(vigente_hasta__isnull=True)
            .order_by("-vigente_desde", "-creado_en")
            .first()
        )
        tc_vigente = float(tc_vigente_obj.valor) if tc_vigente_obj and tc_vigente_obj.valor is not None else None

        response = {
            "web_visitors": web_visitors,
            "leads": leads,
            "contactos": contactos,
            "compras": {
                "count": compras_count,
                "monto_total": compras_total,
                "monto_total_ars": compras_total,
                "monto_total_usd": compras_total_usd,
                "bonos_ars": bonos_total_ars,
                "bonos_usd": bonos_total_usd,
            },
            "retiros": {
                "count": retiros_count,
                "monto_total_ars": retiros_total_ars,
                "monto_total_usd": retiros_total_usd,
            },
            "conversion_pct": conversion_pct,
            "valor_compra_prom": valor_compra_prom_ars,
            "valor_compra_prom_ars": valor_compra_prom_ars,
            "valor_compra_prom_usd": valor_compra_prom_usd,
            "retencion_pct": retencion_pct,
            "ftd": {
                "count": primeras_compras_count,
                "monto_total": primeras_compras_total_ars,
                "monto_total_ars": primeras_compras_total_ars,
                "monto_total_usd": primeras_compras_usd,
            },
            "primeras_compras_usd": primeras_compras_usd,
            "gasto_ars": gasto_ars,
            "gasto_usd": gasto_usd,
            "ganancia_neta_ars": ganancia_neta_ars,
            "ganancia_neta_usd": ganancia_neta_usd,
            "roas": roas_ftd,
            "roas_ftd": roas_ftd,
            "roas_neto": roas_neto,
            "ltv7_ars": ltv7_ars,
            "ltv7_usd": ltv7_usd,
            "ltv30_ars": ltv30_ars,
            "ltv30_usd": ltv30_usd,
            "ltv60_ars": ltv60_ars,
            "ltv60_usd": ltv60_usd,
            "tc_vigente": tc_vigente,
            "base": {
                "contactos": contactos,
                "compras_clientes": compras_clientes,
                "clientes_primera_compra": len(cohort_rows),
            },
            "operating_mode": operating_mode,
            "features": {
                "bonos": wallet_enabled,
                "retiros": wallet_enabled,
                "net_metrics": wallet_enabled,
                "ftd_only": not wallet_enabled,
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
