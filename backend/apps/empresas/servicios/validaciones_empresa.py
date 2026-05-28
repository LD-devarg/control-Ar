from django.core.exceptions import ValidationError

from apps.empresas.models import Empresa
from apps.empresas.permissions import (
    GROUP_ADMIN,
    GROUP_ADMIN_ORGANIZACIONAL,
    GROUP_OPERADOR,
    GROUP_PAUTA,
    is_admin,
    is_admin_organizacional,
)


# Solamente un Usuario Superusuario puede crear Empresas
def validar_usuario_superusuario(usuario):
    if not usuario.is_superuser:
        raise ValidationError("Solo un usuario superusuario puede crear una empresa.")
    return True


# Validar que el nombre de la empresa no este vacio
def validar_nombre_empresa(nombre):
    if not nombre or nombre.strip() == "":
        raise ValidationError("El nombre de la empresa no puede estar vacio.")
    return True


def validar_cupos_organizacion(organizacion, empresa_actual_id=None):
    if organizacion is None:
        return True
    if not organizacion.activo:
        raise ValidationError("La organizacion seleccionada no esta activa.")

    cupos = int(organizacion.cupos or 0)
    if cupos <= 0:
        raise ValidationError("La organizacion no tiene cupos disponibles.")

    usadas = Empresa.objects.filter(organizacion_id=organizacion.id).exclude(id=empresa_actual_id).count()
    if usadas >= cupos:
        raise ValidationError("No se pueden crear mas empresas para la organizacion.")
    return True


# Solo puede crear usuarios de grupo Admin u Operador si es superusuario u otro Admin
# Solo un superusuario puede crear usuarios del grupo Pauta
def validar_creacion_usuario(usuario_creador, grupo_nuevo_usuario):
    if not (usuario_creador.is_superuser or is_admin(usuario_creador)):
        raise ValidationError("No tenes permisos para crear usuarios.")

    if usuario_creador.is_superuser:
        return True

    if is_admin_organizacional(usuario_creador):
        if grupo_nuevo_usuario.name not in [GROUP_ADMIN, GROUP_OPERADOR, GROUP_PAUTA]:
            raise ValidationError(f"{GROUP_ADMIN_ORGANIZACIONAL} solo puede crear Admin, Operador o Pauta.")
        return True

    if grupo_nuevo_usuario.name not in [GROUP_OPERADOR, GROUP_PAUTA]:
        raise ValidationError("Un Admin solo puede crear usuarios Operador o Pauta.")
    return True


def validar_borrado_usuario(usuario_borrador, usuario_a_borrar):
    if usuario_a_borrar.is_superuser:
        raise ValidationError("No se puede borrar un usuario superusuario.")
    if usuario_a_borrar.groups.filter(name__in=[GROUP_PAUTA, GROUP_ADMIN]).exists() and not usuario_borrador.is_superuser:
        raise ValidationError("Solo un superusuario puede borrar usuarios del grupo Pauta o Admin.")
    if usuario_a_borrar.groups.filter(name=GROUP_OPERADOR).exists():
        if not (usuario_borrador.is_superuser or usuario_borrador.groups.filter(name=GROUP_ADMIN).exists()):
            raise ValidationError("Solo un superusuario o un Admin pueden borrar usuarios del grupo Operador.")
    return True


def validar_modificacion_usuario(usuario_modificador, usuario_a_modificar, nuevo_grupo=None):
    if usuario_a_modificar.is_superuser:
        raise ValidationError("No se puede modificar un usuario superusuario.")
    if nuevo_grupo:
        if not (usuario_modificador.is_superuser or is_admin(usuario_modificador)):
            raise ValidationError("No tenes permisos para modificar usuarios.")
        if not usuario_modificador.is_superuser:
            if is_admin_organizacional(usuario_modificador):
                if nuevo_grupo.name not in [GROUP_ADMIN, GROUP_OPERADOR, GROUP_PAUTA]:
                    raise ValidationError(f"{GROUP_ADMIN_ORGANIZACIONAL} solo puede asignar Admin, Operador o Pauta.")
            elif nuevo_grupo.name not in [GROUP_OPERADOR, GROUP_PAUTA]:
                raise ValidationError("Un Admin solo puede asignar Operador o Pauta.")
    if usuario_a_modificar.groups.filter(name__in=[GROUP_PAUTA, GROUP_ADMIN]).exists() and not usuario_modificador.is_superuser:
        raise ValidationError("Solo un superusuario puede modificar usuarios del grupo Pauta o Admin.")
    if usuario_a_modificar.groups.filter(name=GROUP_OPERADOR).exists():
        if not (usuario_modificador.is_superuser or usuario_modificador.groups.filter(name=GROUP_ADMIN).exists()):
            raise ValidationError("Solo un superusuario o un Admin pueden modificar usuarios del grupo Operador.")
    return True
