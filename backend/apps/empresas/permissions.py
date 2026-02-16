from __future__ import annotations

from rest_framework.permissions import BasePermission


def user_in_group(user, name: str) -> bool:
    return user.groups.filter(name=name).exists()


def is_admin(user) -> bool:
    return user_in_group(user, "Admin") or is_admin_organizacional(user)


def is_admin_organizacional(user) -> bool:
    return user_in_group(user, "Admin Organizacional")


def is_operador(user) -> bool:
    return user_in_group(user, "Operador")


def is_pauta(user) -> bool:
    return user_in_group(user, "Pauta")


class RoleBasedPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        checker = getattr(view, "has_role_permission", None)
        if checker:
            return checker(request, view)
        return True
