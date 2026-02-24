from __future__ import annotations

from datetime import timedelta

from django.db import connection
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.empresas.models import Empresa, TelegramBot
from apps.empresas.permissions import RoleBasedPermission, is_admin, is_operador, is_pauta
from apps.empresas.serializers import TelegramBotSerializer
from apps.pauta.servicios.telegram_alerts import send_test_alert
from apps.pauta.servicios.crypto import encrypt_token
from configs.celery import app as celery_app

try:
    from django_celery_beat.models import PeriodicTask
except Exception:  # pragma: no cover
    PeriodicTask = None


class HealthView(APIView):
    permission_classes = [IsAuthenticated]
    HEARTBEAT_MAX_AGE_MINUTES = 15

    @staticmethod
    def _managed_tasks_queryset():
        if PeriodicTask is None:
            return None
        return PeriodicTask.objects.exclude(name="health_heartbeat")

    @classmethod
    def _managed_tasks_status(cls):
        if PeriodicTask is None:
            return {
                "ok": None,
                "error": "django_celery_beat no disponible",
                "managed_total": 0,
                "enabled_count": 0,
                "paused_count": 0,
                "managed_enabled": False,
            }
        qs = cls._managed_tasks_queryset()
        total = qs.count()
        enabled = qs.filter(enabled=True).count()
        return {
            "ok": True,
            "error": None,
            "managed_total": total,
            "enabled_count": enabled,
            "paused_count": max(total - enabled, 0),
            "managed_enabled": total > 0 and enabled == total,
        }

    @staticmethod
    def _periodic_tasks_list():
        if PeriodicTask is None:
            return []
        tasks = (
            PeriodicTask.objects
            .order_by("name")
            .values("name", "task", "enabled", "last_run_at", "total_run_count")
        )
        return list(tasks)

    @staticmethod
    def _empresa_sync_debug():
        rows = list(
            Empresa.objects.order_by("nombre").values(
                "id",
                "nombre",
                "activo",
                "workers_activos",
                "beat_activo",
                "kpi_sync_last_run_at",
                "kpi_sync_last_status",
                "kpi_sync_last_error",
                "estado_sync_last_run_at",
                "estado_sync_last_status",
                "estado_sync_last_error",
            )
        )
        summary = {
            "total_empresas": len(rows),
            "kpi_ok": sum(1 for row in rows if row.get("kpi_sync_last_status") == "ok"),
            "kpi_error": sum(1 for row in rows if row.get("kpi_sync_last_status") == "error"),
            "estado_ok": sum(1 for row in rows if row.get("estado_sync_last_status") == "ok"),
            "estado_error": sum(1 for row in rows if row.get("estado_sync_last_status") == "error"),
        }
        return {"summary": summary, "rows": rows}

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
                    beat_ok = beat_last_run >= timezone.now() - timedelta(minutes=self.HEARTBEAT_MAX_AGE_MINUTES)
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

        managed_tasks = self._managed_tasks_status()

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
            "tasks": managed_tasks,
            "periodic_tasks": self._periodic_tasks_list(),
            "debug": {
                "sync": self._empresa_sync_debug(),
            },
        })

    def post(self, request):
        if not request.user.is_superuser:
            return Response({"detail": "Solo superuser."}, status=403)
        if PeriodicTask is None:
            return Response(
                {"detail": "django_celery_beat no disponible"},
                status=503,
            )

        enabled = request.data.get("enabled")
        task_name = request.data.get("task_name")
        if not isinstance(enabled, bool):
            return Response(
                {"detail": "Campo 'enabled' requerido y debe ser booleano."},
                status=400,
            )

        if task_name:
            task = PeriodicTask.objects.filter(name=task_name).first()
            if not task:
                return Response({"detail": "Tarea no encontrada."}, status=404)
            task.enabled = enabled
            task.save(update_fields=["enabled"])
            return Response(
                {
                    "ok": True,
                    "task": {
                        "name": task.name,
                        "task": task.task,
                        "enabled": task.enabled,
                    },
                    "periodic_tasks": self._periodic_tasks_list(),
                }
            )

        qs = self._managed_tasks_queryset()
        updated = qs.update(enabled=enabled)
        return Response(
            {
                "ok": True,
                "updated": updated,
                "enabled": enabled,
                "tasks": self._managed_tasks_status(),
            }
        )


class TelegramBotView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _assert_superuser(request):
        if not request.user.is_superuser:
            return Response({"detail": "Solo superuser."}, status=403)
        return None

    def get(self, request):
        forbidden = self._assert_superuser(request)
        if forbidden:
            return forbidden
        rows = TelegramBot.objects.all().order_by("-actualizado_en", "-id")
        return Response({"results": TelegramBotSerializer(rows, many=True).data})

    def post(self, request):
        forbidden = self._assert_superuser(request)
        if forbidden:
            return forbidden

        serializer = TelegramBotSerializer(data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data.pop("token", None)
        if not token:
            return Response({"detail": "Campo 'token' requerido."}, status=400)

        bot = TelegramBot(**serializer.validated_data)
        bot.token_encrypted = encrypt_token(str(token).strip())
        bot.save()
        return Response(TelegramBotSerializer(bot).data, status=201)

    def patch(self, request):
        forbidden = self._assert_superuser(request)
        if forbidden:
            return forbidden

        bot_id = request.data.get("id")
        if not bot_id:
            return Response({"detail": "Campo 'id' requerido."}, status=400)

        bot = TelegramBot.objects.filter(id=bot_id).first()
        if not bot:
            return Response({"detail": "Bot no encontrado."}, status=404)

        serializer = TelegramBotSerializer(bot, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data.pop("token", None)

        for field, value in serializer.validated_data.items():
            setattr(bot, field, value)
        if token:
            bot.token_encrypted = encrypt_token(str(token).strip())
        bot.save()
        return Response(TelegramBotSerializer(bot).data)


class TelegramTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_superuser:
            return Response({"detail": "Solo superuser."}, status=403)

        empresa_id = request.data.get("empresa_id")
        try:
            empresa_id = int(empresa_id)
        except Exception:
            return Response({"detail": "Campo 'empresa_id' requerido."}, status=400)

        empresa = Empresa.objects.filter(id=empresa_id).only("id", "nombre").first()
        if not empresa:
            return Response({"detail": "Empresa no encontrada."}, status=404)

        result = send_test_alert(empresa_id=empresa.id, empresa_nombre=empresa.nombre)
        status_code = 200 if result.get("ok") else 400
        return Response(
            {
                "ok": bool(result.get("ok")),
                "empresa_id": empresa.id,
                "empresa_nombre": empresa.nombre,
                "sent": int(result.get("sent") or 0),
                "error": result.get("error"),
            },
            status=status_code,
        )
