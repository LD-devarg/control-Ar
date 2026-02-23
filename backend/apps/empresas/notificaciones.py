from apps.empresas.models import NotificacionEstructural


def crear_notificacion_estructural(*, tipo: str, mensaje: str, actor=None, empresa=None, payload=None):
    organizacion = None
    if empresa is not None:
        organizacion = getattr(empresa, "organizacion", None)
    elif actor is not None and getattr(actor, "organizacion_id", None):
        organizacion = actor.organizacion

    return NotificacionEstructural.objects.create(
        tipo=tipo,
        mensaje=mensaje[:255],
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        empresa=empresa,
        organizacion=organizacion,
        payload=payload or {},
    )
