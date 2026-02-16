from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Empresa, Usuario
from django.contrib.auth.models import Group
from .serializers import EmpresaSerializer, UsuarioSerializer, GroupSerializer
from .servicios.validaciones_empresa import (
    validar_usuario_superusuario,
    validar_nombre_empresa,
    validar_creacion_usuario,
    validar_borrado_usuario,
    validar_modificacion_usuario,
)
from .permissions import RoleBasedPermission, is_admin


def _run_validation(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception as exc:
        raise ValidationError(str(exc))


class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return is_admin(request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_superuser:
            return qs
        if self.request.user.empresa_id:
            return qs.filter(id=self.request.user.empresa_id)
        return qs.none()

    def perform_create(self, serializer):
        _run_validation(validar_usuario_superusuario, self.request.user)
        _run_validation(validar_nombre_empresa, serializer.validated_data.get("nombre"))
        serializer.save()

    def perform_update(self, serializer):
        nombre = serializer.validated_data.get("nombre", serializer.instance.nombre)
        _run_validation(validar_nombre_empresa, nombre)
        serializer.save()


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        if is_admin(request.user):
            return True
        if view.action == "me":
            return True
        if view.action == "retrieve":
            target_id = view.kwargs.get("pk")
            return str(target_id) == str(request.user.id)
        return False

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_superuser:
            return qs
        if self.request.user.empresa_id:
            return qs.filter(empresa_id=self.request.user.empresa_id)
        return qs.none()

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def perform_create(self, serializer):
        if serializer.validated_data.get("is_superuser"):
            raise ValidationError("No se puede crear un superusuario por API.")
        grupos = serializer.validated_data.get("groups") or []
        for grupo in grupos:
            _run_validation(validar_creacion_usuario, self.request.user, grupo)
        if self.request.user.is_superuser:
            if serializer.validated_data.get("empresa") is None:
                raise ValidationError("Para crear usuarios, selecciona una empresa.")
        else:
            if self.request.user.empresa_id is None:
                raise ValidationError("Tu usuario no tiene empresa asignada.")
            serializer.validated_data["empresa"] = self.request.user.empresa
        serializer.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        if serializer.validated_data.get("is_superuser"):
            raise ValidationError("No se puede asignar superusuario por API.")
        if not (self.request.user.is_superuser or self.request.user.groups.filter(name="Admin").exists()):
            raise ValidationError("No tenes permisos para modificar usuarios.")
        grupos = serializer.validated_data.get("groups") or []
        if grupos:
            for grupo in grupos:
                _run_validation(validar_modificacion_usuario, self.request.user, instance, grupo)
        else:
            _run_validation(validar_modificacion_usuario, self.request.user, instance, None)
        if self.request.user.is_superuser and not instance.is_superuser:
            next_empresa = serializer.validated_data.get("empresa", instance.empresa)
            if next_empresa is None:
                raise ValidationError("Para usuarios no superusuario, empresa es obligatoria.")
        if not self.request.user.is_superuser:
            if self.request.user.empresa_id is None:
                raise ValidationError("Tu usuario no tiene empresa asignada.")
            serializer.validated_data["empresa"] = self.request.user.empresa
        serializer.save()


class GroupViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return is_admin(request.user)

    def perform_destroy(self, instance):
        _run_validation(validar_borrado_usuario, self.request.user, instance)
        instance.delete()
