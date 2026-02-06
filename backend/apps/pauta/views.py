from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.empresas.permissions import RoleBasedPermission, is_admin, is_operador, is_pauta
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
)


def _filter_by_empresa(qs, user):
    if user.is_superuser:
        return qs
    if user.empresa_id:
        return qs.filter(empresa_id=user.empresa_id)
    return qs.none()


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


class BMViewSet(viewsets.ModelViewSet):
    queryset = BM.objects.all()
    serializer_class = BMSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)


class CuentaPublicitariaViewSet(viewsets.ModelViewSet):
    queryset = CuentaPublicitaria.objects.all()
    serializer_class = CuentaPublicitariaSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)


class CampañaViewSet(viewsets.ModelViewSet):
    queryset = Campaña.objects.all()
    serializer_class = CampañaSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)


class ConjuntoAnunciosViewSet(viewsets.ModelViewSet):
    queryset = ConjuntoAnuncios.objects.all()
    serializer_class = ConjuntoAnunciosSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)


class AnuncioViewSet(viewsets.ModelViewSet):
    queryset = Anuncio.objects.all()
    serializer_class = AnuncioSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)


class GastoDiarioViewSet(viewsets.ModelViewSet):
    queryset = GastoDiario.objects.all()
    serializer_class = GastoDiarioSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)


class CredencialesMetaViewSet(viewsets.ModelViewSet):
    queryset = CredencialesMeta.objects.all()
    serializer_class = CredencialesMetaSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)


class FanPageViewSet(viewsets.ModelViewSet):
    queryset = FanPage.objects.all()
    serializer_class = FanPageSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)


class InstagramAccountViewSet(viewsets.ModelViewSet):
    queryset = InstagramAccount.objects.all()
    serializer_class = InstagramAccountSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)


class PautaAssetViewSet(viewsets.ModelViewSet):
    queryset = PautaAsset.objects.all()
    serializer_class = PautaAssetSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)


class CreativeViewSet(viewsets.ModelViewSet):
    queryset = Creative.objects.all()
    serializer_class = CreativeSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return _has_pauta_permission(request.user, self.action)

    def get_queryset(self):
        return _filter_by_empresa(super().get_queryset(), self.request.user)
