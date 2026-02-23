from apps.empresas.models import NotificacionEstructural
from apps.operativo.realtime import publish_empresa_event


def crear_notificacion_estructural(*, tipo: str, mensaje: str, actor=None, empresa=None, payload=None):
    organizacion = None
    if empresa is not None:
        organizacion = getattr(empresa, "organizacion", None)
    elif actor is not None and getattr(actor, "organizacion_id", None):
        organizacion = actor.organizacion

    notificacion = NotificacionEstructural.objects.create(
        tipo=tipo,
        mensaje=mensaje[:255],
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        empresa=empresa,
        organizacion=organizacion,
        payload=payload or {},
    )
    if empresa is not None:
        publish_empresa_event(
            empresa_id=empresa.id,
            event_type="notificacion_estructural_created",
            payload={
                "id": notificacion.id,
                "tipo": notificacion.tipo,
                "mensaje": notificacion.mensaje,
                "leida": notificacion.leida,
                "creado_en": notificacion.creado_en.isoformat(),
            },
        )
    return notificacion
