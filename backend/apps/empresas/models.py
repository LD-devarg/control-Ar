from django.db import models
from django.contrib.auth.models import AbstractUser

BEAT_TASKS_AVAILABLE = {
    "sync_pauta_kpi_15m": "Sync KPI pauta (4h)",
    "sync_pauta_estado_15m": "Sync estados pauta (4h)",
}


class Empresa(models.Model):
    organizacion = models.ForeignKey(
        "empresas.Organizacion",
        on_delete=models.CASCADE,
        related_name="empresas",
        null=True,
        blank=True,
    )
    nombre = models.CharField(max_length=255)
    activo = models.BooleanField(default=True)
    workers_activos = models.BooleanField(default=False)
    beat_activo = models.BooleanField(default=True)
    beat_tasks_config = models.JSONField(default=dict, blank=True)
    kpi_sync_last_run_at = models.DateTimeField(null=True, blank=True)
    kpi_sync_last_status = models.CharField(max_length=30, null=True, blank=True)
    kpi_sync_last_error = models.TextField(null=True, blank=True)
    estado_sync_last_run_at = models.DateTimeField(null=True, blank=True)
    estado_sync_last_status = models.CharField(max_length=30, null=True, blank=True)
    estado_sync_last_error = models.TextField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "empresas_empresa"

    def __str__(self):
        return self.nombre


class Organizacion(models.Model):
    nombre = models.CharField(max_length=255)
    cupos = models.PositiveIntegerField(default=1)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "empresas_organizacion"

    def __str__(self):
        return self.nombre


class Usuario(AbstractUser):
    organizacion = models.ForeignKey(
        "empresas.Organizacion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "empresas_usuario"

    def __str__(self):
        return self.username


class UsuarioEmpresaAcceso(models.Model):
    usuario = models.ForeignKey(
        "empresas.Usuario",
        on_delete=models.CASCADE,
        related_name="accesos_empresa",
    )
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="accesos_usuario",
    )
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "empresas_usuario_empresa_acceso"
        constraints = [
            models.UniqueConstraint(
                fields=["usuario", "empresa"],
                name="uniq_usuario_empresa_acceso",
            )
        ]

    def __str__(self):
        return f"{self.usuario_id}-{self.empresa_id}"
