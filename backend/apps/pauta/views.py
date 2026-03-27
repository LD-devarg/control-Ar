from datetime import timedelta
import re

from django.conf import settings
from django.db import transaction
from django.db.models import Sum, OuterRef, Subquery, Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action

from apps.empresas.permissions import RoleBasedPermission, is_admin, is_operador, is_pauta
from apps.empresas.models import Empresa
from apps.empresas.scope import filter_queryset_by_empresa, get_user_empresa_ids, resolve_request_empresa_id
from apps.operativo.models import Compra, EventosMeta, LandingVisit
from .models import (
    BM,
    CuentaPublicitaria,
    Campaña,
    ConjuntoAnuncios,
    Anuncio,
    GastoDiario,
    CredencialesMeta,
    FanPage,
    InstagramAccount,
    PautaAsset,
    Creative,
    RendimientoPautaDiario,
    KPIObjetivo,
)
from .serializers import (
    BMSerializer,
    CuentaPublicitariaSerializer,
    CampañaSerializer,
    ConjuntoAnunciosSerializer,
    AnuncioSerializer,
    GastoDiarioSerializer,
    CredencialesMetaSerializer,
    FanPageSerializer,
    InstagramAccountSerializer,
    PautaAssetSerializer,
    CreativeSerializer,
    KPIObjetivoSerializer,
)
from .servicios.estado_sync import sync_pauta_estado_15m
from .servicios.rendimiento_sync import sync_rendimientos_meta_diarios


def _filter_by_empresa(qs, user, request=None):
    if not request:
        return qs.none()
    return filter_queryset_by_empresa(qs, request, field_name="empresa_id")


def _has_pauta_permission(user, action: str) -> bool:
    if user.is_superuser:
        return True
    if is_pauta(user):
        return True
    if is_admin(user):
        return action in {"list", "retrieve"}
    if is_operador(user):
        return False
    return False


def _get_request_organizacion_id(request):
    user = request.user
    empresa_param = request.query_params.get("empresa")

    if empresa_param:
        try:
            empresa_id = int(empresa_param)
        except (TypeError, ValueError):
            return 0
        if not user.is_superuser:
            allowed_ids = set(get_user_empresa_ids(user))
            if empresa_id not in allowed_ids:
                return 0
        empresa = Empresa.objects.filter(id=empresa_id).only("organizacion_id").first()
        return int(empresa.organizacion_id or 0) if empresa else 0

    if user.is_superuser:
        return 0

    if user.organizacion_id:
        return int(user.organizacion_id)

    if user.empresa_id:
        empresa = Empresa.objects.filter(id=user.empresa_id).only("organizacion_id").first()
        if empresa and empresa.organizacion_id:
            return int(empresa.organizacion_id)

    allowed_ids = get_user_empresa_ids(user)
    if not allowed_ids:
        return 0
    empresa = (
        Empresa.objects.filter(id__in=allowed_ids, organizacion_id__isnull=False)
        .only("organizacion_id")
        .first()
    )
    return int(empresa.organizacion_id or 0) if empresa else 0


PERFORMANCE_WEIGHTS = {
    "ingresos": 30.0,
    "roas": 20.0,
    "cpa": 15.0,
    "cpc": 10.0,
    "cpl": 10.0,
    "efectividad": 10.0,
    "frecuencia": 2.5,
    "ctr": 2.5,
}

DEFAULT_OBJECTIVES = {
    "ingresos_objetivo_usd": 0.0,
    "roas_objetivo": 2.0,
    "cpa_objetivo_usd": 20.0,
    "cpc_objetivo_usd": 5.0,
    "cpl_objetivo_usd": 10.0,
    "efectividad_objetivo": 0.03,
    "frecuencia_objetivo": 3.0,
    "ctr_objetivo": 0.02,
}

ACTIVE_META_STATUSES = {"ACTIVE"}


class BMViewSet(viewsets.ModelViewSet):
    queryset = BM.objects.all()
    serializer_class = BMSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        qs = super().get_queryset().prefetch_related("empresas").distinct()
        user = self.request.user
        empresa_param = self.request.query_params.get("empresa")

        if user.is_superuser:
            if empresa_param:
                try:
                    return qs.filter(empresas__id=int(empresa_param))
                except (TypeError, ValueError):
                    return qs.none()
            return qs

        allowed_ids = get_user_empresa_ids(user)
        if not allowed_ids:
            return qs.none()

        if empresa_param:
            try:
                empresa_id = int(empresa_param)
            except (TypeError, ValueError):
                return qs.none()
            if empresa_id not in allowed_ids:
                return qs.none()
            return qs.filter(empresas__id=empresa_id)

        return qs.filter(empresas__id__in=allowed_ids)


class CuentaPublicitariaViewSet(viewsets.ModelViewSet):
    queryset = CuentaPublicitaria.objects.all()
    serializer_class = CuentaPublicitariaSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user, self.request)


class CampañaViewSet(viewsets.ModelViewSet):
    queryset = Campaña.objects.all()
    serializer_class = CampañaSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user, self.request)


class ConjuntoAnunciosViewSet(viewsets.ModelViewSet):
    queryset = ConjuntoAnuncios.objects.all()
    serializer_class = ConjuntoAnunciosSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user, self.request)


class AnuncioViewSet(viewsets.ModelViewSet):
    queryset = Anuncio.objects.all()
    serializer_class = AnuncioSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user, self.request)


class GastoDiarioViewSet(viewsets.ModelViewSet):
    queryset = GastoDiario.objects.all()
    serializer_class = GastoDiarioSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user, self.request)


class CredencialesMetaViewSet(viewsets.ModelViewSet):
    queryset = CredencialesMeta.objects.all()
    serializer_class = CredencialesMetaSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        qs = super().get_queryset().prefetch_related("empresas").distinct()
        user = self.request.user
        empresa_param = self.request.query_params.get("empresa")

        if user.is_superuser:
            if empresa_param:
                try:
                    empresa_id = int(empresa_param)
                except (TypeError, ValueError):
                    return qs.none()
                return qs.filter(Q(empresa_id=empresa_id) | Q(empresas__id=empresa_id)).distinct()
            return qs

        allowed_ids = get_user_empresa_ids(user)
        if not allowed_ids:
            return qs.none()

        if empresa_param:
            try:
                empresa_id = int(empresa_param)
            except (TypeError, ValueError):
                return qs.none()
            if empresa_id not in allowed_ids:
                return qs.none()
            return qs.filter(Q(empresa_id=empresa_id) | Q(empresas__id=empresa_id)).distinct()

        return qs.filter(Q(empresa_id__in=allowed_ids) | Q(empresas__id__in=allowed_ids)).distinct()


class FanPageViewSet(viewsets.ModelViewSet):
    queryset = FanPage.objects.all()
    serializer_class = FanPageSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user, self.request)


class InstagramAccountViewSet(viewsets.ModelViewSet):
    queryset = InstagramAccount.objects.all()
    serializer_class = InstagramAccountSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user, self.request)


class PautaAssetViewSet(viewsets.ModelViewSet):
    queryset = PautaAsset.objects.all()
    serializer_class = PautaAssetSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user, self.request)


class CreativeViewSet(viewsets.ModelViewSet):
    queryset = Creative.objects.all()
    serializer_class = CreativeSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user, self.request)


class KPIObjetivoViewSet(viewsets.ModelViewSet):
    queryset = KPIObjetivo.objects.all()
    serializer_class = KPIObjetivoSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user, self.request)

    def perform_create(self, serializer):
        if self.request.user.is_superuser:
            serializer.save()
            return
        empresa_id = self.request.data.get("empresa")
        allowed = get_user_empresa_ids(self.request.user)
        if empresa_id:
            try:
                empresa_id = int(empresa_id)
            except (TypeError, ValueError):
                raise ValidationError("Empresa invalida.")
            if empresa_id not in allowed:
                raise ValidationError("No tenes acceso a la empresa seleccionada.")
            serializer.save(empresa_id=empresa_id)
            return
        if not allowed:
            raise ValidationError("Empresa no disponible para el usuario actual.")
        serializer.save(empresa_id=allowed[0])


class PautaProvisioningViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    @staticmethod
    def _normalize_payload(payload):
        return payload if isinstance(payload, dict) else {}

    def _resolve_empresa(self, request, payload):
        if request.user.is_superuser:
            empresa_id = payload.get("empresa")
            if not empresa_id:
                raise ValidationError("Empresa requerida para superuser.")
            empresa = Empresa.objects.filter(id=empresa_id).first()
            if not empresa:
                raise ValidationError("Empresa invalida.")
            return empresa
        if not request.user.empresa_id:
            raise ValidationError("Empresa no disponible para el usuario actual.")
        return request.user.empresa

    def _create_with_serializer(self, serializer_class, payload, request):
        serializer = serializer_class(data=payload, context={"request": request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return instance, serializer.data

    def _resolve_campaign(self, empresa, payload):
        campaign_id = payload.get("campaña_id") or payload.get("campana_id")
        campaign_meta_id = payload.get("campaign_meta_id")
        if campaign_id:
            campaign = Campaña.objects.filter(id=campaign_id, empresa_id=empresa.id).first()
            if not campaign:
                raise ValidationError("La campaña indicada no existe para la empresa.")
            return campaign
        if campaign_meta_id:
            campaign = Campaña.objects.filter(meta_id=str(campaign_meta_id), empresa_id=empresa.id).first()
            if not campaign:
                raise ValidationError("No existe campaña local para el campaign_meta_id indicado.")
            return campaign
        return None

    def _resolve_adset(self, empresa, payload):
        adset_id = payload.get("adset_id")
        adset_meta_id = payload.get("adset_meta_id")
        if adset_id:
            adset = ConjuntoAnuncios.objects.filter(id=adset_id, empresa_id=empresa.id).first()
            if not adset:
                raise ValidationError("El adset indicado no existe para la empresa.")
            return adset
        if adset_meta_id:
            adset = ConjuntoAnuncios.objects.filter(meta_id=str(adset_meta_id), empresa_id=empresa.id).first()
            if not adset:
                raise ValidationError("No existe adset local para el adset_meta_id indicado.")
            return adset
        return None

    def create(self, request):
        payload = self._normalize_payload(request.data)
        empresa = self._resolve_empresa(request, payload)

        created_campaign = None
        created_adsets = []
        created_ads = []
        created_campaign_data = None
        created_adsets_data = []
        created_ads_data = []

        with transaction.atomic():
            campaign = self._resolve_campaign(empresa, payload)
            campaign_payload = self._normalize_payload(payload.get("campaña") or payload.get("campana"))
            if campaign_payload:
                if not campaign_payload.get("cuenta_publicitaria") and payload.get("cuenta_publicitaria"):
                    campaign_payload["cuenta_publicitaria"] = payload.get("cuenta_publicitaria")
                campaign_payload["empresa"] = empresa.id
                campaign, created_campaign_data = self._create_with_serializer(CampañaSerializer, campaign_payload, request)
                created_campaign = campaign

            adsets_payload = payload.get("adsets") or []
            for raw_adset in adsets_payload:
                adset_input = self._normalize_payload(raw_adset).copy()
                nested_ads = adset_input.pop("ads", []) or []

                adset = None
                adset_id = adset_input.get("id")
                adset_meta_id = adset_input.get("adset_meta_id")
                if adset_id:
                    adset = ConjuntoAnuncios.objects.filter(id=adset_id, empresa_id=empresa.id).first()
                elif adset_meta_id:
                    adset = ConjuntoAnuncios.objects.filter(meta_id=str(adset_meta_id), empresa_id=empresa.id).first()

                if not adset:
                    if not adset_input.get("campaña") and campaign:
                        adset_input["campaña"] = campaign.id
                    if not adset_input.get("campaña"):
                        raise ValidationError("Cada adset nuevo requiere campaña (campaña/campaña_id/campaign_meta_id).")
                    adset_input["empresa"] = empresa.id
                    adset, adset_data = self._create_with_serializer(ConjuntoAnunciosSerializer, adset_input, request)
                    created_adsets.append(adset)
                    created_adsets_data.append(adset_data)

                for raw_ad in nested_ads:
                    ad_input = self._normalize_payload(raw_ad).copy()
                    ad_input["empresa"] = empresa.id
                    ad_input["conjunto_anuncios"] = adset.id
                    ad, ad_data = self._create_with_serializer(AnuncioSerializer, ad_input, request)
                    created_ads.append(ad)
                    created_ads_data.append(ad_data)

            default_adset = self._resolve_adset(empresa, payload)
            ads_payload = payload.get("ads") or []
            for raw_ad in ads_payload:
                ad_input = self._normalize_payload(raw_ad).copy()
                if not ad_input.get("conjunto_anuncios"):
                    if default_adset:
                        ad_input["conjunto_anuncios"] = default_adset.id
                    elif len(created_adsets) == 1:
                        ad_input["conjunto_anuncios"] = created_adsets[0].id
                    else:
                        raise ValidationError("Para crear ads sueltos indica conjunto_anuncios/adset_id/adset_meta_id.")
                ad_input["empresa"] = empresa.id
                ad, ad_data = self._create_with_serializer(AnuncioSerializer, ad_input, request)
                created_ads.append(ad)
                created_ads_data.append(ad_data)

        return Response(
            {
                "empresa": empresa.id,
                "campaign": created_campaign_data,
                "adsets": created_adsets_data,
                "ads": created_ads_data,
                "summary": {
                    "campaign_created": bool(created_campaign),
                    "adsets_created": len(created_adsets_data),
                    "ads_created": len(created_ads_data),
                },
            },
            status=201,
        )


class PautaKPIViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    SUPPORTED_MONEY_CURRENCIES = {"USD", "ARS"}
    NAMING_TOKEN_RE = re.compile(r"[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+")
    PAUTA_SYNC_START_DATE = getattr(settings, "PAUTA_SYNC_START_DATE", None)

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def _empresa_id(self, request):
        try:
            return resolve_request_empresa_id(request, allow_empty_for_superuser=True) or None
        except ValidationError:
            return None

    def _date_range(self, request):
        from_param = request.query_params.get("from")
        to_param = request.query_params.get("to")

        if from_param and to_param:
            try:
                from_date = timezone.datetime.strptime(from_param, "%Y-%m-%d").date()
                to_date = timezone.datetime.strptime(to_param, "%Y-%m-%d").date()
            except ValueError:
                return None, None
            if from_date > to_date:
                from_date, to_date = to_date, from_date
            return from_date, to_date

        period = request.query_params.get("period", "week")
        today = timezone.localdate()
        if period == "day":
            return today, today
        if period == "month":
            return today - timedelta(days=29), today
        return today - timedelta(days=6), today

    @action(detail=False, methods=["post"], url_path="refresh")
    def refresh(self, request):
        empresa_id = resolve_request_empresa_id(request, allow_empty_for_superuser=False)
        from_date, to_date = self._date_range(request)
        kpi_result = sync_rendimientos_meta_diarios(
            empresa_ids=[empresa_id],
            force=True,
            from_date=from_date,
            to_date=to_date,
        )
        estado_result = sync_pauta_estado_15m(empresa_ids=[empresa_id], force=True)
        return Response(
            {
                "ok": True,
                "empresa_id": empresa_id,
                "kpi": kpi_result,
                "estado": estado_result,
            }
        )

    @staticmethod
    def _safe_div(num, den):
        if not den:
            return 0.0
        return float(num) / float(den)

    @classmethod
    def _extract_naming_tokens(cls, *names):
        tokens = []
        for name in names:
            value = str(name or "").strip()
            if not value:
                continue
            matches = cls.NAMING_TOKEN_RE.findall(value.upper())
            if matches:
                tokens.extend(matches)
                continue
            fallback = value.upper().replace("_", "-").replace(" ", "-")
            if "-" in fallback and len(fallback) <= 48:
                tokens.append(fallback)
        return sorted(set(tokens))

    @staticmethod
    def _score_higher_better(actual, target):
        if target <= 0:
            return 0.0
        score = (actual / target) * 100.0
        return max(0.0, min(100.0, score))

    @staticmethod
    def _score_lower_better(actual, target):
        if target <= 0:
            return 0.0
        if actual <= 0:
            return 100.0
        score = (target / actual) * 100.0
        return max(0.0, min(100.0, score))

    def _resolve_objectives(self, empresa_id):
        if not empresa_id:
            return DEFAULT_OBJECTIVES
        obj = KPIObjetivo.objects.filter(empresa_id=empresa_id).first()
        if not obj:
            return DEFAULT_OBJECTIVES
        return {
            "ingresos_objetivo_usd": float(obj.ingresos_objetivo_usd),
            "roas_objetivo": float(obj.roas_objetivo),
            "cpa_objetivo_usd": float(obj.cpa_objetivo_usd),
            "cpc_objetivo_usd": float(obj.cpc_objetivo_usd),
            "cpl_objetivo_usd": float(obj.cpl_objetivo_usd),
            "efectividad_objetivo": float(obj.efectividad_objetivo),
            "frecuencia_objetivo": float(obj.frecuencia_objetivo),
            "ctr_objetivo": float(obj.ctr_objetivo),
        }

    def _resolve_active_daily_budget_usd(self, empresa_id):
        if not empresa_id:
            return 0.0
        today = timezone.localdate()
        qs = ConjuntoAnuncios.objects.filter(
            empresa_id=empresa_id,
            estado__in=ACTIVE_META_STATUSES,
            presupuesto_diario__isnull=False,
        )
        qs = qs.filter(Q(fecha_inicio__isnull=True) | Q(fecha_inicio__lte=today))
        qs = qs.filter(Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=today))
        total = qs.aggregate(total=Sum("presupuesto_diario"))["total"] or 0
        return float(total)

    def _apply_account_scope(self, rows, empresa_id, account_scope):
        if not account_scope or account_scope == "all" or not empresa_id:
            return rows
        try:
            account_id = int(account_scope)
        except (TypeError, ValueError):
            account_id = None
        if account_id is not None:
            return [row for row in rows if row["cuenta_publicitaria_id"] == account_id]
        if account_scope not in {"main", "scale"}:
            return rows
        cuentas = list(
            CuentaPublicitaria.objects.filter(empresa_id=empresa_id)
            .order_by("id")
            .values_list("id", flat=True)
        )
        if not cuentas:
            return []
        if account_scope == "main":
            main_id = cuentas[0]
            return [row for row in rows if row["cuenta_publicitaria_id"] == main_id]
        main_id = cuentas[0]
        return [row for row in rows if row["cuenta_publicitaria_id"] != main_id]

    def list(self, request):
        empresa_id = self._empresa_id(request)
        from_date, to_date = self._date_range(request)
        if from_date is None or to_date is None:
            return Response({"detail": "Rango de fechas invalido."}, status=400)
        if self.PAUTA_SYNC_START_DATE:
            if to_date < self.PAUTA_SYNC_START_DATE:
                return Response(
                    {
                        "executive": {"cards": {}, "footer": {}, "daily_roas": [], "performance_score": 0.0},
                        "operative": {"campaign": [], "adset": [], "ad": [], "naming": []},
                        "money_currency": "USD",
                        "last_sync": {},
                    }
                )
            if from_date < self.PAUTA_SYNC_START_DATE:
                from_date = self.PAUTA_SYNC_START_DATE

        qs = RendimientoPautaDiario.objects.filter(fecha__gte=from_date, fecha__lte=to_date)
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        elif not request.user.is_superuser:
            return Response({"detail": "Empresa no disponible."}, status=400)

        rows = list(
            qs.values(
                "fecha",
                "cuenta_publicitaria_id",
                "campaign_meta_id",
                "campaign_name",
                "adset_meta_id",
                "adset_name",
                "ad_meta_id",
                "ad_name",
                "spend_usd",
                "impressions",
                "reach",
                "clicks",
                "link_clicks",
                "web_visitors",
                "leads",
                "contacts",
                "purchases",
                "purchase_value_usd",
            )
        )
        ad_meta_ids = {str(row.get("ad_meta_id") or "").strip() for row in rows if row.get("ad_meta_id")}
        ads_by_meta_id = {}
        if ad_meta_ids:
            ad_qs = (
                Anuncio.objects.filter(meta_id__in=ad_meta_ids)
                .select_related("creative__asset")
                .only("meta_id", "creative__nombre", "creative__asset__nombre")
            )
            if empresa_id:
                ad_qs = ad_qs.filter(empresa_id=empresa_id)
            for ad in ad_qs:
                key = str(ad.meta_id or "").strip()
                if key:
                    ads_by_meta_id[key] = ad

        account_currency_map = {
            item["id"]: (str(item["moneda"] or "USD").upper() if str(item["moneda"] or "").upper() in self.SUPPORTED_MONEY_CURRENCIES else "USD")
            for item in CuentaPublicitaria.objects.filter(
                id__in={row["cuenta_publicitaria_id"] for row in rows if row.get("cuenta_publicitaria_id")}
            ).values("id", "moneda")
        }

        account_scope = request.query_params.get("account", "all")
        rows = self._apply_account_scope(rows, empresa_id, account_scope)
        scoped_currencies = {
            account_currency_map.get(row["cuenta_publicitaria_id"], "USD")
            for row in rows
            if row.get("cuenta_publicitaria_id")
        }
        if not scoped_currencies:
            money_currency = "USD"
        elif len(scoped_currencies) == 1:
            money_currency = sorted(scoped_currencies)[0]
        else:
            money_currency = "MIXED"

        totals = {
            "inversion": 0.0,
            "impressions": 0.0,
            "reach": 0.0,
            "clicks": 0.0,
            "link_clicks": 0.0,
        }
        daily = {}
        by_level = {"campaign": {}, "adset": {}, "ad": {}, "naming": {}}

        for row in rows:
            inversion = float(row["spend_usd"] or 0)
            ingresos = float(row["purchase_value_usd"] or 0)
            impressions = float(row["impressions"] or 0)
            reach = float(row["reach"] or 0)
            clicks = float(row["clicks"] or 0)
            link_clicks = float(row["link_clicks"] or 0)
            web_visitors = float(row["web_visitors"] or 0)
            leads = float(row["leads"] or 0)
            contactos = float(row["contacts"] or 0)
            ftd = float(row["purchases"] or 0)

            totals["inversion"] += inversion
            totals["impressions"] += impressions
            totals["reach"] += reach
            totals["clicks"] += clicks
            totals["link_clicks"] += link_clicks

            date_key = row["fecha"].isoformat()
            if date_key not in daily:
                daily[date_key] = {"inversion": 0.0, "ingresos": 0.0}
            daily[date_key]["inversion"] += inversion
            daily[date_key]["ingresos"] += ingresos

            level_sources = [
                ("campaign", row["campaign_meta_id"], row["campaign_name"]),
                ("adset", row["adset_meta_id"], row["adset_name"]),
                ("ad", row["ad_meta_id"], row["ad_name"]),
            ]
            for level_key, meta_id, name in level_sources:
                meta_id = str(meta_id or "").strip()
                if not meta_id:
                    continue
                bucket = by_level[level_key]
                if meta_id not in bucket:
                    bucket[meta_id] = {
                        "id": meta_id,
                        "nombre": name or meta_id,
                        "inversion": 0.0,
                        "ingresos": 0.0,
                        "impressions": 0.0,
                        "reach": 0.0,
                        "clicks": 0.0,
                        "link_clicks": 0.0,
                        "web_visitors": 0.0,
                        "leads": 0.0,
                        "contactos": 0.0,
                        "ftd": 0.0,
                    }
                item = bucket[meta_id]
                item["inversion"] += inversion
                item["ingresos"] += ingresos
                item["impressions"] += impressions
                item["reach"] += reach
                item["clicks"] += clicks
                item["link_clicks"] += link_clicks
                item["web_visitors"] += web_visitors
                item["leads"] += leads
                item["contactos"] += contactos
                item["ftd"] += ftd

            ad_meta_id = str(row.get("ad_meta_id") or "").strip()
            ad_record = ads_by_meta_id.get(ad_meta_id)
            creative_name = ""
            asset_name = ""
            if ad_record and getattr(ad_record, "creative_id", None):
                creative_name = ad_record.creative.nombre or ""
                asset = getattr(ad_record.creative, "asset", None)
                asset_name = asset.nombre if asset else ""
            naming_tokens = self._extract_naming_tokens(
                row.get("campaign_name"),
                row.get("adset_name"),
                row.get("ad_name"),
                creative_name,
                asset_name,
            )
            for token in naming_tokens:
                bucket = by_level["naming"]
                if token not in bucket:
                    bucket[token] = {
                        "id": token,
                        "nombre": token,
                        "inversion": 0.0,
                        "ingresos": 0.0,
                        "impressions": 0.0,
                        "reach": 0.0,
                        "clicks": 0.0,
                        "link_clicks": 0.0,
                        "web_visitors": 0.0,
                        "leads": 0.0,
                        "contactos": 0.0,
                        "ftd": 0.0,
                    }
                item = bucket[token]
                item["inversion"] += inversion
                item["ingresos"] += ingresos
                item["impressions"] += impressions
                item["reach"] += reach
                item["clicks"] += clicks
                item["link_clicks"] += link_clicks
                item["web_visitors"] += web_visitors
                item["leads"] += leads
                item["contactos"] += contactos
                item["ftd"] += ftd

        def finalize(item):
            inversion = item["inversion"]
            ingresos = item["ingresos"]
            leads = item["leads"]
            contactos = item["contactos"]
            ftd = item["ftd"]
            impressions = item["impressions"]
            link_clicks = item["link_clicks"]
            reach = item["reach"]
            return {
                **item,
                "ctr": self._safe_div(link_clicks, impressions),
                "cpc": self._safe_div(inversion, contactos),
                "cpc_click": self._safe_div(inversion, link_clicks),
                "cpl": self._safe_div(inversion, leads),
                "cpa": self._safe_div(inversion, ftd),
                "roas": self._safe_div(ingresos, inversion),
                "frecuencia": self._safe_div(impressions, reach),
                "valor_ftd": ingresos,
                # Backward compatibility for older front clients.
                "compras": ftd,
                "valor_compras": ingresos,
            }

        operative = {
            "campaign": sorted([finalize(item) for item in by_level["campaign"].values()], key=lambda x: x["inversion"], reverse=True),
            "adset": sorted([finalize(item) for item in by_level["adset"].values()], key=lambda x: x["inversion"], reverse=True),
            "ad": sorted([finalize(item) for item in by_level["ad"].values()], key=lambda x: x["inversion"], reverse=True),
            "naming": sorted([finalize(item) for item in by_level["naming"].values()], key=lambda x: x["inversion"], reverse=True),
        }

        inv = totals["inversion"]
        impressions = totals["impressions"]
        link_clicks = totals["link_clicks"]
        reach = totals["reach"]

        operational_filters = {"empresa_id": empresa_id} if empresa_id else {}
        start_dt = timezone.make_aware(timezone.datetime.combine(from_date, timezone.datetime.min.time()))
        end_dt = timezone.make_aware(timezone.datetime.combine(to_date, timezone.datetime.max.time()))

        visitas_qs = LandingVisit.objects.filter(creado_en__gte=start_dt, creado_en__lte=end_dt, **operational_filters)
        eventos_qs = EventosMeta.objects.filter(creado_en__gte=start_dt, creado_en__lte=end_dt, **operational_filters)
        compras_qs = Compra.objects.filter(creado_en__gte=start_dt, creado_en__lte=end_dt, **operational_filters)

        first_purchase_id_subquery = (
            Compra.objects.filter(empresa_id=OuterRef("empresa_id"), cliente_id=OuterRef("cliente_id"))
            .order_by("creado_en", "id")
            .values("id")[:1]
        )
        primeras_compras_qs = compras_qs.filter(id=Subquery(first_purchase_id_subquery))

        web_visitors = float(visitas_qs.count())
        leads = float(eventos_qs.filter(tipo="lead").count())
        contactos = float(eventos_qs.filter(tipo="contact").count())
        ftd = float(primeras_compras_qs.count())
        ing = float(primeras_compras_qs.aggregate(total=Sum("monto_usd"))["total"] or 0)

        executive = {
            "cards": {
                "inversion": inv,
                "ingresos": ing,
                "roas": self._safe_div(ing, inv),
                "cpa": self._safe_div(inv, ftd),
                "cpc": self._safe_div(inv, contactos),
                "cpc_click": self._safe_div(inv, link_clicks),
                "cpl": self._safe_div(inv, leads),
                "frecuencia": self._safe_div(impressions, reach),
                "ctr": self._safe_div(link_clicks, impressions),
            },
            "footer": {
                "web_visitors": web_visitors,
                "leads": leads,
                "contactos": contactos,
                "ftd": ftd,
                "valor_ftd": ing,
                "efectividad": self._safe_div(ftd, contactos),
                # Backward compatibility for older front clients.
                "compras": ftd,
                "valor_compras": ing,
            },
            "daily_roas": [
                {
                    "date": date_key,
                    "day": timezone.datetime.strptime(date_key, "%Y-%m-%d").strftime("%a"),
                    "roas": self._safe_div(values["ingresos"], values["inversion"]),
                }
                for date_key, values in sorted(daily.items(), key=lambda x: x[0])
            ],
            "performance_score": 0,
        }

        objectives = self._resolve_objectives(empresa_id)
        active_daily_budget_usd = self._resolve_active_daily_budget_usd(empresa_id)
        days_in_range = max((to_date - from_date).days + 1, 1)
        ingresos_objetivo_diario_usd = round(active_daily_budget_usd * objectives["roas_objetivo"], 2)
        effective_objectives = {
            **objectives,
            "active_daily_budget_usd": round(active_daily_budget_usd, 2),
            "ingresos_objetivo_usd": ingresos_objetivo_diario_usd,
            "ingresos_objetivo_diario_usd": ingresos_objetivo_diario_usd,
            "ingresos_objetivo_total_usd": round(ingresos_objetivo_diario_usd * days_in_range, 2),
            "days_in_range": days_in_range,
        }
        empresa_sync = {}
        if empresa_id:
            empresa = Empresa.objects.filter(id=empresa_id).only(
                "kpi_sync_last_run_at",
                "kpi_sync_last_status",
                "estado_sync_last_run_at",
                "estado_sync_last_status",
            ).first()
            if empresa:
                empresa_sync = {
                    "kpi_last_run_at": empresa.kpi_sync_last_run_at,
                    "kpi_last_status": empresa.kpi_sync_last_status,
                    "estado_last_run_at": empresa.estado_sync_last_run_at,
                    "estado_last_status": empresa.estado_sync_last_status,
                }
        metrics = {
            "ingresos": ing,
            "roas": executive["cards"]["roas"],
            "cpa": executive["cards"]["cpa"],
            "cpc": executive["cards"]["cpc"],
            "cpl": executive["cards"]["cpl"],
            "efectividad": executive["footer"]["efectividad"],
            "frecuencia": executive["cards"]["frecuencia"],
            "ctr": executive["cards"]["ctr"],
        }
        component_scores = {
            "ingresos": self._score_higher_better(
                metrics["ingresos"],
                effective_objectives["ingresos_objetivo_total_usd"],
            ),
            "roas": self._score_higher_better(metrics["roas"], objectives["roas_objetivo"]),
            "cpa": self._score_lower_better(metrics["cpa"], objectives["cpa_objetivo_usd"]),
            "cpc": self._score_lower_better(metrics["cpc"], objectives["cpc_objetivo_usd"]),
            "cpl": self._score_lower_better(metrics["cpl"], objectives["cpl_objetivo_usd"]),
            "efectividad": self._score_higher_better(metrics["efectividad"], objectives["efectividad_objetivo"]),
            "frecuencia": self._score_lower_better(metrics["frecuencia"], objectives["frecuencia_objetivo"]),
            "ctr": self._score_higher_better(metrics["ctr"], objectives["ctr_objetivo"]),
        }
        weighted_score = sum(
            component_scores[key] * (PERFORMANCE_WEIGHTS[key] / 100.0)
            for key in PERFORMANCE_WEIGHTS
        )
        executive["performance_score"] = round(max(0.0, min(100.0, weighted_score)), 2)

        return Response(
            {
                "from": from_date.isoformat(),
                "to": to_date.isoformat(),
                "period": request.query_params.get("period", "week"),
                "account": account_scope,
                "money_currency": money_currency,
                "objectives": {
                    **objectives,
                    "ingresos_objetivo_usd": ingresos_objetivo_diario_usd,
                },
                "effective_objectives": effective_objectives,
                "weights": PERFORMANCE_WEIGHTS,
                "component_scores": component_scores,
                "last_sync": empresa_sync,
                "executive": executive,
                "operative": operative,
            }
        )
