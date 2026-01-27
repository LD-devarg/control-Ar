from __future__ import annotations

from celery import shared_task

from .servicios.tipo_cambio_fetcher import actualizar_tipo_cambio


@shared_task(bind=True)
def fetch_tipo_cambio(self):
    return actualizar_tipo_cambio()
