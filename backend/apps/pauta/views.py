from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import (
    BM,
    CuentaPublicitaria,
    Campaña,
    ConjuntoAnuncios,
    Anuncio,
    GastoDiario,
    CredencialesMeta,
)
from .serializers import (
    BMSerializer,
    CuentaPublicitariaSerializer,
    CampañaSerializer,
    ConjuntoAnunciosSerializer,
    AnuncioSerializer,
    GastoDiarioSerializer,
    CredencialesMetaSerializer,
)


class BMViewSet(viewsets.ModelViewSet):
    queryset = BM.objects.all()
    serializer_class = BMSerializer
    permission_classes = [IsAuthenticated]


class CuentaPublicitariaViewSet(viewsets.ModelViewSet):
    queryset = CuentaPublicitaria.objects.all()
    serializer_class = CuentaPublicitariaSerializer
    permission_classes = [IsAuthenticated]


class CampañaViewSet(viewsets.ModelViewSet):
    queryset = Campaña.objects.all()
    serializer_class = CampañaSerializer
    permission_classes = [IsAuthenticated]


class ConjuntoAnunciosViewSet(viewsets.ModelViewSet):
    queryset = ConjuntoAnuncios.objects.all()
    serializer_class = ConjuntoAnunciosSerializer
    permission_classes = [IsAuthenticated]


class AnuncioViewSet(viewsets.ModelViewSet):
    queryset = Anuncio.objects.all()
    serializer_class = AnuncioSerializer
    permission_classes = [IsAuthenticated]


class GastoDiarioViewSet(viewsets.ModelViewSet):
    queryset = GastoDiario.objects.all()
    serializer_class = GastoDiarioSerializer
    permission_classes = [IsAuthenticated]


class CredencialesMetaViewSet(viewsets.ModelViewSet):
    queryset = CredencialesMeta.objects.all()
    serializer_class = CredencialesMetaSerializer
    permission_classes = [IsAuthenticated]
