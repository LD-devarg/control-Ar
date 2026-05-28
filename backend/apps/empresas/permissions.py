from __future__ import annotations

from rest_framework.permissions import BasePermission

GROUP_ADMIN = "Admin"
GROUP_ADMIN_ORGANIZACIONAL = "Admin Organizacional"
GROUP_OPERADOR = "Operador"
GROUP_PAUTA = "Pauta"


def user_in_group(user, name: str) -> bool:
    return user.groups.filter(name=name).exists()


def is_admin(user) -> bool:
    return user_in_group(user, GROUP_ADMIN) or is_admin_organizacional(user)


def is_admin_organizacional(user) -> bool:
    return user_in_group(user, GROUP_ADMIN_ORGANIZACIONAL)


def is_operador(user) -> bool:
    return user_in_group(user, GROUP_OPERADOR)


def is_pauta(user) -> bool:
    return user_in_group(user, GROUP_PAUTA)


class RoleBasedPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        checker = getattr(view, "has_role_permission", None)
        if checker:
            return checker(request, view)
        return True
