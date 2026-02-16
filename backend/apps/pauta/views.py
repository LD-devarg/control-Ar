from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action

from apps.empresas.permissions import RoleBasedPermission, is_admin, is_operador, is_pauta
from apps.empresas.models import Empresa
from apps.empresas.scope import filter_queryset_by_empresa, get_user_empresa_ids, resolve_request_empresa_id
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
    "ingresos_objetivo_usd": 1000.0,
    "roas_objetivo": 2.0,
    "cpa_objetivo_usd": 20.0,
    "cpc_objetivo_usd": 5.0,
    "cpl_objetivo_usd": 10.0,
    "efectividad_objetivo": 0.03,
    "frecuencia_objetivo": 3.0,
    "ctr_objetivo": 0.02,
}


class BMViewSet(viewsets.ModelViewSet):
    queryset = BM.objects.all()
    serializer_class = BMSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user, self.request)


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
        return _filter_by_empresa(super().get_queryset(), self.request.user, self.request)


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
        kpi_result = sync_rendimientos_meta_diarios(empresa_ids=[empresa_id], force=True)
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

    def _apply_account_scope(self, rows, empresa_id, account_scope):
        if account_scope not in {"main", "scale"} or not empresa_id:
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

        account_scope = request.query_params.get("account", "all")
        rows = self._apply_account_scope(rows, empresa_id, account_scope)

        totals = {
            "inversion": 0.0,
            "ingresos": 0.0,
            "impressions": 0.0,
            "reach": 0.0,
            "clicks": 0.0,
            "link_clicks": 0.0,
            "web_visitors": 0.0,
            "leads": 0.0,
            "contactos": 0.0,
            "compras": 0.0,
        }
        daily = {}
        by_level = {"campaign": {}, "adset": {}, "ad": {}}

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
            compras = float(row["purchases"] or 0)

            totals["inversion"] += inversion
            totals["ingresos"] += ingresos
            totals["impressions"] += impressions
            totals["reach"] += reach
            totals["clicks"] += clicks
            totals["link_clicks"] += link_clicks
            totals["web_visitors"] += web_visitors
            totals["leads"] += leads
            totals["contactos"] += contactos
            totals["compras"] += compras

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
                        "compras": 0.0,
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
                item["compras"] += compras

        def finalize(item):
            inversion = item["inversion"]
            ingresos = item["ingresos"]
            leads = item["leads"]
            contactos = item["contactos"]
            compras = item["compras"]
            impressions = item["impressions"]
            link_clicks = item["link_clicks"]
            reach = item["reach"]
            return {
                **item,
                "ctr": self._safe_div(link_clicks, impressions),
                "cpc": self._safe_div(inversion, contactos),
                "cpc_click": self._safe_div(inversion, link_clicks),
                "cpl": self._safe_div(inversion, leads),
                "cpa": self._safe_div(inversion, compras),
                "roas": self._safe_div(ingresos, inversion),
                "frecuencia": self._safe_div(impressions, reach),
                "valor_compras": ingresos,
            }

        operative = {
            "campaign": sorted([finalize(item) for item in by_level["campaign"].values()], key=lambda x: x["inversion"], reverse=True),
            "adset": sorted([finalize(item) for item in by_level["adset"].values()], key=lambda x: x["inversion"], reverse=True),
            "ad": sorted([finalize(item) for item in by_level["ad"].values()], key=lambda x: x["inversion"], reverse=True),
        }

        inv = totals["inversion"]
        ing = totals["ingresos"]
        leads = totals["leads"]
        contactos = totals["contactos"]
        compras = totals["compras"]
        impressions = totals["impressions"]
        link_clicks = totals["link_clicks"]
        reach = totals["reach"]
        web_visitors = totals["web_visitors"]

        executive = {
            "cards": {
                "inversion": inv,
                "ingresos": ing,
                "roas": self._safe_div(ing, inv),
                "cpa": self._safe_div(inv, compras),
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
                "compras": compras,
                "valor_compras": ing,
                "efectividad": self._safe_div(compras, web_visitors),
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
            "ingresos": self._score_higher_better(metrics["ingresos"], objectives["ingresos_objetivo_usd"]),
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
                "objectives": objectives,
                "weights": PERFORMANCE_WEIGHTS,
                "component_scores": component_scores,
                "last_sync": empresa_sync,
                "executive": executive,
                "operative": operative,
            }
        )
