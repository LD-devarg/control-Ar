from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from .models import Empresa, Usuario
from .serializers import EmpresaSerializer, UsuarioSerializer
from .servicios.validaciones_empresa import (
    validar_usuario_superusuario,
    validar_nombre_empresa,
    validar_creacion_usuario,
    validar_borrado_usuario,
    validar_modificacion_usuario,
)


def _run_validation(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception as exc:
        raise ValidationError(str(exc))


class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        _run_validation(validar_usuario_superusuario, self.request.user)
        _run_validation(validar_nombre_empresa, serializer.validated_data.get("nombre"))
        serializer.save()

    def perform_update(self, serializer):
        _run_validation(validar_nombre_empresa, serializer.validated_data.get("nombre"))
        serializer.save()


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        grupos = serializer.validated_data.get("groups") or []
        for grupo in grupos:
            _run_validation(validar_creacion_usuario, self.request.user, grupo)
        serializer.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        grupos = serializer.validated_data.get("groups") or []
        if grupos:
            for grupo in grupos:
                _run_validation(validar_modificacion_usuario, self.request.user, instance, grupo)
        else:
            _run_validation(validar_modificacion_usuario, self.request.user, instance, None)
        serializer.save()

    def perform_destroy(self, instance):
        _run_validation(validar_borrado_usuario, self.request.user, instance)
        instance.delete()
