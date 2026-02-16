from __future__ import annotations

from rest_framework.exceptions import ValidationError

from apps.empresas.models import Empresa, UsuarioEmpresaAcceso
from apps.empresas.permissions import is_admin_organizacional, is_pauta


def get_user_empresa_ids(user) -> list[int]:
    if not user or not user.is_authenticated:
        return []
    if user.is_superuser:
        return []
    if is_admin_organizacional(user):
        if not user.organizacion_id:
            return []
        ids = Empresa.objects.filter(organizacion_id=user.organizacion_id).values_list("id", flat=True)
        return sorted(int(item) for item in ids)

    empresa_ids: set[int] = set()
    if user.empresa_id:
        empresa_ids.add(int(user.empresa_id))

    if is_pauta(user):
        extra_ids = (
            UsuarioEmpresaAcceso.objects.filter(usuario_id=user.id, activo=True)
            .values_list("empresa_id", flat=True)
        )
        empresa_ids.update(int(item) for item in extra_ids)

    return sorted(empresa_ids)


def resolve_request_empresa_id(request, *, allow_empty_for_superuser: bool = False) -> int:
    user = request.user
    empresa_param = request.query_params.get("empresa")

    if user.is_superuser:
        if not empresa_param:
            if allow_empty_for_superuser:
                return 0
            raise ValidationError("Empresa requerida para superusuario.")
        try:
            return int(empresa_param)
        except (TypeError, ValueError):
            raise ValidationError("Parametro empresa invalido.")

    if is_admin_organizacional(user):
        if not user.organizacion_id:
            raise ValidationError("El usuario no tiene organizacion asignada.")
        allowed_ids = get_user_empresa_ids(user)
        if not allowed_ids:
            raise ValidationError("No hay empresas disponibles en la organizacion actual.")
        if empresa_param:
            try:
                empresa_id = int(empresa_param)
            except (TypeError, ValueError):
                raise ValidationError("Parametro empresa invalido.")
            if empresa_id not in allowed_ids:
                raise ValidationError("No tenes acceso a la empresa seleccionada.")
            return empresa_id
        return allowed_ids[0]

    allowed_ids = get_user_empresa_ids(user)
    if not allowed_ids:
        raise ValidationError("Empresa no disponible en el usuario actual.")

    if empresa_param:
        try:
            empresa_id = int(empresa_param)
        except (TypeError, ValueError):
            raise ValidationError("Parametro empresa invalido.")
        if empresa_id not in allowed_ids:
            raise ValidationError("No tenes acceso a la empresa seleccionada.")
        return empresa_id

    return allowed_ids[0]


def filter_queryset_by_empresa(qs, request, *, field_name: str = "empresa_id"):
    user = request.user
    if user.is_superuser:
        empresa_param = request.query_params.get("empresa")
        if empresa_param:
            try:
                return qs.filter(**{field_name: int(empresa_param)})
            except (TypeError, ValueError):
                return qs.none()
        return qs

    if is_admin_organizacional(user):
        if not user.organizacion_id:
            return qs.none()
        allowed_ids = get_user_empresa_ids(user)
        if not allowed_ids:
            return qs.none()
        empresa_param = request.query_params.get("empresa")
        if empresa_param:
            try:
                empresa_id = int(empresa_param)
            except (TypeError, ValueError):
                return qs.none()
            if empresa_id not in allowed_ids:
                return qs.none()
            return qs.filter(**{field_name: empresa_id})
        return qs.filter(**{f"{field_name}__in": allowed_ids})

    allowed_ids = get_user_empresa_ids(user)
    if not allowed_ids:
        return qs.none()

    empresa_param = request.query_params.get("empresa")
    if empresa_param:
        try:
            empresa_id = int(empresa_param)
        except (TypeError, ValueError):
            return qs.none()
        if empresa_id not in allowed_ids:
            return qs.none()
        return qs.filter(**{field_name: empresa_id})

    if len(allowed_ids) == 1:
        return qs.filter(**{field_name: allowed_ids[0]})
    return qs.filter(**{f"{field_name}__in": allowed_ids})
