from __future__ import annotations

from datetime import timedelta

from django.db import connection
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.empresas.permissions import RoleBasedPermission, is_admin, is_operador, is_pauta
from configs.celery import app as celery_app

try:
    from django_celery_beat.models import PeriodicTask
except Exception:  # pragma: no cover
    PeriodicTask = None


class HealthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response({"detail": "Solo superuser."}, status=403)
        backend_ok = True

        db_ok = True
        db_error = None
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception as exc:  # pragma: no cover
            db_ok = False
            db_error = str(exc)

        broker_ok = True
        broker_error = None
        try:
            conn = celery_app.connection()
            conn.ensure_connection(max_retries=1, timeout=2)
            conn.release()
        except Exception as exc:  # pragma: no cover
            broker_ok = False
            broker_error = str(exc)

        worker_ok = False
        worker_count = 0
        worker_error = None
        try:
            ping = celery_app.control.inspect(timeout=2).ping() or {}
            worker_count = len(ping)
            worker_ok = worker_count > 0
        except Exception as exc:  # pragma: no cover
            worker_error = str(exc)

        beat_ok = None
        beat_last_run = None
        beat_error = None
        if PeriodicTask is None:
            beat_ok = None
            beat_error = "django_celery_beat no disponible"
        else:
            try:
                task = PeriodicTask.objects.filter(name="health_heartbeat").only("last_run_at").first()
                if not task or not task.last_run_at:
                    beat_ok = False
                else:
                    beat_last_run = task.last_run_at
                    beat_ok = beat_last_run >= timezone.now() - timedelta(minutes=5)
            except Exception as exc:  # pragma: no cover
                beat_ok = False
                beat_error = str(exc)

        overall_ok = all([
            backend_ok,
            db_ok,
            broker_ok,
            worker_ok,
            beat_ok is not False,
        ])

        return Response({
            "ok": overall_ok,
            "backend": {"ok": backend_ok},
            "database": {"ok": db_ok, "error": db_error},
            "celery": {"ok": broker_ok, "error": broker_error},
            "worker": {"ok": worker_ok, "count": worker_count, "error": worker_error},
            "beat": {
                "ok": beat_ok,
                "last_run_at": beat_last_run,
                "error": beat_error,
            },
        })
