from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.empresas.views import EmpresaViewSet, UsuarioViewSet
from apps.operativo.views import ClienteViewSet, EventosMetaViewSet, LandingViewSet, CompraViewSet
from apps.recursos.views import WhatsAppViewSet, TipoCambioViewSet
from apps.pauta.views import (
    BMViewSet,
    CuentaPublicitariaViewSet,
    CampañaViewSet,
    ConjuntoAnunciosViewSet,
    AnuncioViewSet,
    GastoDiarioViewSet,
    CredencialesMetaViewSet,
)

router = DefaultRouter()
router.register(r"empresas", EmpresaViewSet, basename="empresa")
router.register(r"usuarios", UsuarioViewSet, basename="usuario")
router.register(r"clientes", ClienteViewSet, basename="cliente")
router.register(r"landings", LandingViewSet, basename="landing")
router.register(r"eventos-meta", EventosMetaViewSet, basename="eventos-meta")
router.register(r"compras", CompraViewSet, basename="compra")
router.register(r"whatsapps", WhatsAppViewSet, basename="whatsapp")
router.register(r"tipos-cambio", TipoCambioViewSet, basename="tipo-cambio")
router.register(r"bms", BMViewSet, basename="bm")
router.register(r"cuentas-publicitarias", CuentaPublicitariaViewSet, basename="cuenta-publicitaria")
router.register(r"campanias", CampañaViewSet, basename="campania")
router.register(r"conjuntos-anuncios", ConjuntoAnunciosViewSet, basename="conjunto-anuncios")
router.register(r"anuncios", AnuncioViewSet, basename="anuncio")
router.register(r"gastos-diarios", GastoDiarioViewSet, basename="gasto-diario")
router.register(r"credenciales-meta", CredencialesMetaViewSet, basename="credenciales-meta")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include(router.urls)),
]
