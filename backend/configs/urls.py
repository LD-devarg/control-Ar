from django.contrib import admin
from rest_framework_simplejwt.views import TokenRefreshView
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.empresas.views import (
    EmpresaViewSet,
    OrganizacionViewSet,
    UsuarioViewSet,
    UsuarioEmpresaAccesoViewSet,
    GroupViewSet,
    NotificacionEstructuralViewSet,
)
from apps.empresas.auth_views import LoggedTokenObtainPairView
from apps.operativo.views import ClienteViewSet, EventosMetaViewSet, LandingViewSet, CompraViewSet, RetiroViewSet, LandingVisitViewSet, StatsViewSet
from apps.operativo.health import HealthView, TelegramBotView, TelegramTestView
from apps.recursos.views import WhatsAppViewSet, TipoCambioViewSet
from apps.pauta.views import (
    BMViewSet,
    CuentaPublicitariaViewSet,
    CampañaViewSet,
    ConjuntoAnunciosViewSet,
    AnuncioViewSet,
    GastoDiarioViewSet,
    CredencialesMetaViewSet,
    FanPageViewSet,
    InstagramAccountViewSet,
    PautaAssetViewSet,
    CreativeViewSet,
    PautaKPIViewSet,
    KPIObjetivoViewSet,
    PautaProvisioningViewSet,
)

router = DefaultRouter()
router.register(r"organizaciones", OrganizacionViewSet, basename="organizacion")
router.register(r"empresas", EmpresaViewSet, basename="empresa")
router.register(r"usuario-empresa-accesos", UsuarioEmpresaAccesoViewSet, basename="usuario-empresa-acceso")
router.register(r"usuarios", UsuarioViewSet, basename="usuario")
router.register(r"grupos", GroupViewSet, basename="grupo")
router.register(r"notificaciones-estructura", NotificacionEstructuralViewSet, basename="notificaciones-estructura")
router.register(r"clientes", ClienteViewSet, basename="cliente")
router.register(r"landings", LandingViewSet, basename="landing")
router.register(r"eventos-meta", EventosMetaViewSet, basename="eventos-meta")
router.register(r"compras", CompraViewSet, basename="compra")
router.register(r"retiros", RetiroViewSet, basename="retiro")
router.register(r"landing-visits", LandingVisitViewSet, basename="landing-visit")
router.register(r"stats", StatsViewSet, basename="stats")
router.register(r"whatsapps", WhatsAppViewSet, basename="whatsapp")
router.register(r"tipos-cambio", TipoCambioViewSet, basename="tipo-cambio")
router.register(r"bms", BMViewSet, basename="bm")
router.register(r"cuentas-publicitarias", CuentaPublicitariaViewSet, basename="cuenta-publicitaria")
router.register(r"campanas", CampañaViewSet, basename="campana")
router.register(r"campañas", CampañaViewSet, basename="campana-legacy")
router.register(r"conjuntos-anuncios", ConjuntoAnunciosViewSet, basename="conjunto-anuncios")
router.register(r"anuncios", AnuncioViewSet, basename="anuncio")
router.register(r"gastos-diarios", GastoDiarioViewSet, basename="gasto-diario")
router.register(r"credenciales-meta", CredencialesMetaViewSet, basename="credenciales-meta")
router.register(r"fanpages", FanPageViewSet, basename="fanpage")
router.register(r"instagram-accounts", InstagramAccountViewSet, basename="instagram-account")
router.register(r"pauta-assets", PautaAssetViewSet, basename="pauta-asset")
router.register(r"creatives", CreativeViewSet, basename="creative")
router.register(r"pauta-kpi", PautaKPIViewSet, basename="pauta-kpi")
router.register(r"kpi-objetivos", KPIObjetivoViewSet, basename="kpi-objetivo")
router.register(r"pauta-provisioning", PautaProvisioningViewSet, basename="pauta-provisioning")

urlpatterns = [
    path("api/token/", LoggedTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("admin/", admin.site.urls),
    path("health/", HealthView.as_view(), name="health"),
    path("health/telegram-bots/", TelegramBotView.as_view(), name="health-telegram-bots"),
    path("health/telegram-test/", TelegramTestView.as_view(), name="health-telegram-test"),
    path("", include(router.urls)),
]
