from __future__ import annotations

from celery import shared_task

from apps.pauta.servicios.estado_sync import sync_pauta_estado_15m
from apps.pauta.servicios.rendimiento_sync import sync_rendimientos_meta_diarios
from django.utils import timezone
import datetime as dt


@shared_task(bind=True)
def sync_pauta_kpi_15m(self):
    today = timezone.localdate()
    from_date = today - dt.timedelta(days=1)
    return sync_rendimientos_meta_diarios(from_date=from_date, to_date=today)


@shared_task(bind=True)
def sync_pauta_estado_15m_task(self):
    return sync_pauta_estado_15m()
