from django.db import models
from django.contrib.auth.models import AbstractUser

BEAT_TASKS_AVAILABLE = {
    "sync_pauta_kpi_15m": "Sync KPI pauta (4h)",
    "sync_pauta_estado_15m": "Sync estados pauta (4h)",
}


class Empresa(models.Model):
    OPERATING_MODE_FULL = "full"
    OPERATING_MODE_FTD_ONLY = "ftd_only"
    OPERATING_MODE_CHOICES = [
        (OPERATING_MODE_FULL, "Completo"),
        (OPERATING_MODE_FTD_ONLY, "Solo FTD"),
    ]

    organizacion = models.ForeignKey(
        "empresas.Organizacion",
        on_delete=models.CASCADE,
        related_name="empresas",
        null=True,
        blank=True,
    )
    nombre = models.CharField(max_length=255)
    meta_test_mode = models.BooleanField(default=False)
    operating_mode = models.CharField(
        max_length=20,
        choices=OPERATING_MODE_CHOICES,
        default=OPERATING_MODE_FULL,
    )
    activo = models.BooleanField(default=True)
    workers_activos = models.BooleanField(default=False)
    beat_activo = models.BooleanField(default=True)
    beat_tasks_config = models.JSONField(default=dict, blank=True)
    telegram_chat_ids = models.JSONField(default=list, blank=True)
    kommo_enabled = models.BooleanField(default=False)
    kommo_subdomain = models.CharField(max_length=120, null=True, blank=True, unique=True)
    kommo_account_id = models.BigIntegerField(null=True, blank=True, unique=True)
    kommo_access_token = models.TextField(blank=True, default="")
    kommo_webhook_secret = models.CharField(max_length=255, blank=True, default="")
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


class NotificacionEstructural(models.Model):
    TIPO_WHATSAPP_ACTIVADA = "whatsapp_activada"
    TIPO_WHATSAPP_DESACTIVADA = "whatsapp_desactivada"
    TIPO_LOGIN = "login"
    TIPO_LOGOUT = "logout"
    TIPO_CHOICES = [
        (TIPO_WHATSAPP_ACTIVADA, "WhatsApp activada"),
        (TIPO_WHATSAPP_DESACTIVADA, "WhatsApp desactivada"),
        (TIPO_LOGIN, "Login"),
        (TIPO_LOGOUT, "Logout"),
    ]

    organizacion = models.ForeignKey(
        "empresas.Organizacion",
        on_delete=models.CASCADE,
        related_name="notificaciones_estructurales",
        null=True,
        blank=True,
    )
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="notificaciones_estructurales",
        null=True,
        blank=True,
    )
    actor = models.ForeignKey(
        "empresas.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notificaciones_emitidas",
    )
    tipo = models.CharField(max_length=50, choices=TIPO_CHOICES)
    mensaje = models.CharField(max_length=255)
    payload = models.JSONField(default=dict, blank=True)
    leida = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "empresas_notificacion_estructural"
        ordering = ["-creado_en", "-id"]

    def __str__(self):
        return f"{self.tipo} - {self.mensaje}"


class TelegramBot(models.Model):
    TIPO_BOT = "BOT"
    TIPO_CHOICES = [
        (TIPO_BOT, "Bot"),
    ]

    nombre = models.CharField(max_length=120)
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES, default=TIPO_BOT)
    token_encrypted = models.TextField(blank=True, default="")
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "empresas_telegram_bot"
        ordering = ["-actualizado_en", "-id"]

    def __str__(self):
        return f"{self.nombre} ({self.tipo})"
