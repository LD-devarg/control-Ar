from __future__ import annotations

from celery import shared_task


@shared_task(bind=True)
def create_login_notification(self, user_id: int):
    from apps.empresas.models import Usuario
    from apps.empresas.notificaciones import crear_notificacion_estructural

    user = Usuario.objects.select_related("empresa").filter(pk=user_id).first()
    if not user:
        return

    crear_notificacion_estructural(
        tipo="login",
        actor=user,
        empresa=user.empresa,
        mensaje=f"El operador {user.username} se logueo.",
        payload={},
    )
