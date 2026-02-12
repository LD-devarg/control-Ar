# Solamente un Usuario Superusuario puede crear Empresas
from django.core.exceptions import ValidationError
def validar_usuario_superusuario(usuario):
    if not usuario.is_superuser:
        raise ValidationError("Solo un usuario superusuario puede crear una empresa.")
    return True
# Validar que el nombre de la empresa no esté vacío
def validar_nombre_empresa(nombre):
    if not nombre or nombre.strip() == "":
        raise ValidationError("El nombre de la empresa no puede estar vacío.")
    return True

# Solo puede crear usuarios de grupo Admin u Operador si es superusuario u otro Admin
# Solo un superusuario puede crear usuarios del grupo Pauta
def validar_creacion_usuario(usuario_creador, grupo_nuevo_usuario):
    if not (usuario_creador.is_superuser or usuario_creador.groups.filter(name="Admin").exists()):
        raise ValidationError("No tenes permisos para crear usuarios.")

    if usuario_creador.is_superuser:
        return True

    if grupo_nuevo_usuario.name not in ["Operador", "Pauta"]:
        raise ValidationError("Un Admin solo puede crear usuarios Operador o Pauta.")
    return True

def validar_borrado_usuario(usuario_borrador, usuario_a_borrar):
    if usuario_a_borrar.is_superuser:
        raise ValidationError("No se puede borrar un usuario superusuario.")
    if usuario_a_borrar.groups.filter(name__in=["Pauta", "Admin"]).exists() and not usuario_borrador.is_superuser:
        raise ValidationError("Solo un superusuario puede borrar usuarios del grupo Pauta o Admin.")
    if usuario_a_borrar.groups.filter(name="Operador").exists():
        if not (usuario_borrador.is_superuser or usuario_borrador.groups.filter(name="Admin").exists()):
            raise ValidationError("Solo un superusuario o un Admin pueden borrar usuarios del grupo Operador.")
    return True

def validar_modificacion_usuario(usuario_modificador, usuario_a_modificar, nuevo_grupo=None):
    if usuario_a_modificar.is_superuser:
        raise ValidationError("No se puede modificar un usuario superusuario.")
    if nuevo_grupo:
        if not (usuario_modificador.is_superuser or usuario_modificador.groups.filter(name="Admin").exists()):
            raise ValidationError("No tenes permisos para modificar usuarios.")
        if not usuario_modificador.is_superuser and nuevo_grupo.name not in ["Operador", "Pauta"]:
            raise ValidationError("Un Admin solo puede asignar Operador o Pauta.")
    if usuario_a_modificar.groups.filter(name__in=["Pauta", "Admin"]).exists() and not usuario_modificador.is_superuser:
        raise ValidationError("Solo un superusuario puede modificar usuarios del grupo Pauta o Admin.")
    if usuario_a_modificar.groups.filter(name="Operador").exists():
        if not (usuario_modificador.is_superuser or usuario_modificador.groups.filter(name="Admin").exists()):
            raise ValidationError("Solo un superusuario o un Admin pueden modificar usuarios del grupo Operador.")
    return True
