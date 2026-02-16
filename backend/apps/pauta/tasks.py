from __future__ import annotations

from celery import shared_task

from apps.pauta.servicios.estado_sync import sync_pauta_estado_15m
from apps.pauta.servicios.rendimiento_sync import sync_rendimientos_meta_diarios


@shared_task(bind=True)
def sync_pauta_kpi_15m(self):
    return sync_rendimientos_meta_diarios()


@shared_task(bind=True)
def sync_pauta_estado_15m_task(self):
    return sync_pauta_estado_15m()
