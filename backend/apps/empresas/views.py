from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models

from .models import Empresa, Organizacion, Usuario, UsuarioEmpresaAcceso, NotificacionEstructural
from django.contrib.auth.models import Group
from .serializers import (
    EmpresaSerializer,
    OrganizacionSerializer,
    UsuarioSerializer,
    UsuarioEmpresaAccesoSerializer,
    GroupSerializer,
    NotificacionEstructuralSerializer,
)
from .servicios.validaciones_empresa import (
    validar_usuario_superusuario,
    validar_nombre_empresa,
    validar_cupos_organizacion,
    validar_creacion_usuario,
    validar_borrado_usuario,
    validar_modificacion_usuario,
)
from .permissions import RoleBasedPermission, is_admin, is_admin_organizacional, is_pauta
from .scope import get_user_empresa_ids
from .notificaciones import crear_notificacion_estructural


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
        if view.action == "set_meta_test_mode":
            return request.user.is_superuser
        if request.user.is_superuser:
            return True
        if is_pauta(request.user):
            return view.action in {"list", "retrieve"}
        return is_admin(request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_superuser:
            return qs
        if is_admin_organizacional(self.request.user):
            org_id = self.request.user.organizacion_id
            if not org_id:
                return qs.none()
            return qs.filter(organizacion_id=org_id)
        allowed_ids = get_user_empresa_ids(self.request.user)
        if allowed_ids:
            return qs.filter(id__in=allowed_ids)
        if self.request.user.empresa_id:
            return qs.filter(id=self.request.user.empresa_id)
        return qs.none()

    def perform_create(self, serializer):
        if not (self.request.user.is_superuser or is_admin_organizacional(self.request.user)):
            _run_validation(validar_usuario_superusuario, self.request.user)
        _run_validation(validar_nombre_empresa, serializer.validated_data.get("nombre"))
        organizacion = serializer.validated_data.get("organizacion")
        if is_admin_organizacional(self.request.user):
            user_org = self.request.user.organizacion
            if not user_org:
                raise ValidationError("El admin organizacional no tiene organizacion asignada.")
            if organizacion and organizacion.id != user_org.id:
                raise ValidationError("Solo podes crear empresas en tu organizacion.")
            organizacion = user_org
        _run_validation(validar_cupos_organizacion, organizacion)
        serializer.validated_data["organizacion"] = organizacion
        serializer.save()

    def perform_update(self, serializer):
        nombre = serializer.validated_data.get("nombre", serializer.instance.nombre)
        organizacion = serializer.validated_data.get("organizacion", serializer.instance.organizacion)
        if is_admin_organizacional(self.request.user):
            user_org = self.request.user.organizacion
            if not user_org:
                raise ValidationError("El admin organizacional no tiene organizacion asignada.")
            if serializer.instance.organizacion_id != user_org.id:
                raise ValidationError("No tenes acceso a esta empresa.")
            if organizacion and organizacion.id != user_org.id:
                raise ValidationError("No podes mover empresas fuera de tu organizacion.")
            organizacion = user_org
        _run_validation(validar_nombre_empresa, nombre)
        _run_validation(validar_cupos_organizacion, organizacion, serializer.instance.id)
        serializer.validated_data["organizacion"] = organizacion
        serializer.save()

    @action(detail=True, methods=["post"], url_path="meta-test-mode")
    def set_meta_test_mode(self, request, pk=None):
        if not request.user.is_superuser:
            raise ValidationError("Solo superuser puede activar/desactivar Meta test mode.")
        instance = self.get_object()
        enabled = bool(request.data.get("enabled", False))
        if instance.meta_test_mode != enabled:
            instance.meta_test_mode = enabled
            instance.save(update_fields=["meta_test_mode"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class OrganizacionViewSet(viewsets.ModelViewSet):
    queryset = Organizacion.objects.all()
    serializer_class = OrganizacionSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        return request.user.is_superuser


class UsuarioEmpresaAccesoViewSet(viewsets.ModelViewSet):
    queryset = UsuarioEmpresaAcceso.objects.select_related("usuario", "empresa").all()
    serializer_class = UsuarioEmpresaAccesoSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return is_admin(request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_superuser:
            return qs
        if is_admin_organizacional(self.request.user):
            org_id = self.request.user.organizacion_id
            if not org_id:
                return qs.none()
            return qs.filter(empresa__organizacion_id=org_id)
        if self.request.user.empresa_id:
            return qs.filter(empresa_id=self.request.user.empresa_id)
        return qs.none()


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
        if view.action == "logout":
            return True
        if view.action == "retrieve":
            target_id = view.kwargs.get("pk")
            return str(target_id) == str(request.user.id)
        return False

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_superuser:
            empresa_param = self.request.query_params.get("empresa")
            if empresa_param:
                try:
                    return qs.filter(empresa_id=int(empresa_param))
                except (TypeError, ValueError):
                    return qs.none()
            return qs
        if is_admin_organizacional(self.request.user):
            org_id = self.request.user.organizacion_id
            if not org_id:
                return qs.none()
            scoped = qs.filter(is_superuser=False).filter(
                models.Q(organizacion_id=org_id) | models.Q(empresa__organizacion_id=org_id)
            )
            empresa_param = self.request.query_params.get("empresa")
            if empresa_param:
                try:
                    return scoped.filter(empresa_id=int(empresa_param))
                except (TypeError, ValueError):
                    return qs.none()
            return scoped
        if self.request.user.empresa_id:
            return qs.filter(empresa_id=self.request.user.empresa_id)
        return qs.none()

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="logout")
    def logout(self, request):
        user = request.user
        crear_notificacion_estructural(
            tipo="logout",
            actor=user,
            empresa=user.empresa,
            mensaje=f"El operador {user.username} cerro sesion.",
            payload={},
        )
        return Response({"ok": True})

    def perform_create(self, serializer):
        if serializer.validated_data.get("is_superuser"):
            raise ValidationError("No se puede crear un superusuario por API.")
        grupos = serializer.validated_data.get("groups") or []
        for grupo in grupos:
            _run_validation(validar_creacion_usuario, self.request.user, grupo)
        if self.request.user.is_superuser:
            target_groups = serializer.validated_data.get("groups") or []
            target_group_names = {group.name for group in target_groups}
            is_org_admin_target = "Admin Organizacional" in target_group_names
            if is_org_admin_target:
                if serializer.validated_data.get("organizacion") is None:
                    raise ValidationError("Para Admin Organizacional, organizacion es obligatoria.")
            elif serializer.validated_data.get("empresa") is None:
                raise ValidationError("Para crear usuarios, selecciona una empresa.")
        elif is_admin_organizacional(self.request.user):
            if self.request.user.organizacion_id is None:
                raise ValidationError("Tu usuario no tiene organizacion asignada.")
            serializer.validated_data["organizacion"] = self.request.user.organizacion
            target_groups = serializer.validated_data.get("groups") or []
            target_group_names = {group.name for group in target_groups}
            if "Admin Organizacional" in target_group_names:
                raise ValidationError("No podes crear usuarios de tipo Admin Organizacional.")
            empresa = serializer.validated_data.get("empresa")
            if empresa is None:
                raise ValidationError("Selecciona una empresa.")
            if empresa.organizacion_id != self.request.user.organizacion_id:
                raise ValidationError("La empresa seleccionada no pertenece a tu organizacion.")
        else:
            if self.request.user.empresa_id is None:
                raise ValidationError("Tu usuario no tiene empresa asignada.")
            serializer.validated_data["empresa"] = self.request.user.empresa
        serializer.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        if serializer.validated_data.get("is_superuser"):
            raise ValidationError("No se puede asignar superusuario por API.")
        if not (self.request.user.is_superuser or is_admin(self.request.user)):
            raise ValidationError("No tenes permisos para modificar usuarios.")
        grupos = serializer.validated_data.get("groups") or []
        if grupos:
            for grupo in grupos:
                _run_validation(validar_modificacion_usuario, self.request.user, instance, grupo)
        else:
            _run_validation(validar_modificacion_usuario, self.request.user, instance, None)
        if self.request.user.is_superuser and not instance.is_superuser:
            next_empresa = serializer.validated_data.get("empresa", instance.empresa)
            next_groups = serializer.validated_data.get("groups", instance.groups.all())
            next_group_names = {group.name for group in next_groups}
            is_org_admin_target = "Admin Organizacional" in next_group_names
            if is_org_admin_target:
                next_org = serializer.validated_data.get("organizacion", instance.organizacion)
                if next_org is None:
                    raise ValidationError("Para Admin Organizacional, organizacion es obligatoria.")
            elif next_empresa is None:
                raise ValidationError("Para usuarios no superusuario, empresa es obligatoria.")
        if is_admin_organizacional(self.request.user):
            if self.request.user.organizacion_id is None:
                raise ValidationError("Tu usuario no tiene organizacion asignada.")
            next_groups = serializer.validated_data.get("groups", instance.groups.all())
            next_group_names = {group.name for group in next_groups}
            if "Admin Organizacional" in next_group_names:
                raise ValidationError("No podes asignar grupo Admin Organizacional.")
            next_empresa = serializer.validated_data.get("empresa", instance.empresa)
            if next_empresa is None:
                raise ValidationError("Empresa obligatoria.")
            if next_empresa.organizacion_id != self.request.user.organizacion_id:
                raise ValidationError("La empresa seleccionada no pertenece a tu organizacion.")
            if instance.organizacion_id and instance.organizacion_id != self.request.user.organizacion_id:
                raise ValidationError("No tenes acceso a este usuario.")
            serializer.validated_data["organizacion"] = self.request.user.organizacion
        elif not self.request.user.is_superuser:
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


class NotificacionEstructuralViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NotificacionEstructural.objects.select_related("actor", "empresa", "organizacion").all()
    serializer_class = NotificacionEstructuralSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]

    def has_role_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return is_admin(request.user) or is_admin_organizacional(request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            empresa_param = self.request.query_params.get("empresa")
            if empresa_param:
                try:
                    return qs.filter(empresa_id=int(empresa_param))
                except (TypeError, ValueError):
                    return qs.none()
            return qs
        if is_admin_organizacional(user):
            if not user.organizacion_id:
                return qs.none()
            return qs.filter(organizacion_id=user.organizacion_id)
        if user.empresa_id:
            return qs.filter(empresa_id=user.empresa_id)
        return qs.none()

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(leida=False).update(leida=True)
        return Response({"updated": updated})


