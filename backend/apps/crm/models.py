from django.db import models


class WhatsAppConfig(models.Model):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="whatsapp_configs",
    )
    phone_number_id = models.CharField(max_length=80, unique=True)
    waba_id = models.CharField(max_length=80)
    access_token_encrypted = models.TextField(blank=True, default="")
    verify_token = models.CharField(max_length=255, blank=True, default="")
    app_secret = models.CharField(max_length=255, blank=True, default="")
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_whatsapp_config"
        ordering = ["empresa_id", "phone_number_id"]

    def __str__(self):
        return f"{self.empresa_id} - {self.phone_number_id}"


class Conversation(models.Model):
    ESTADO_CHOICES = [
        ("nuevo", "Nuevo"),
        ("en_conversacion", "En conversacion"),
        ("calificado", "Calificado"),
        ("convertido", "Convertido"),
        ("perdido", "Perdido"),
    ]

    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="conversaciones",
    )
    cliente = models.ForeignKey(
        "operativo.Cliente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversaciones",
    )
    wa_phone = models.CharField(max_length=20)
    contact_name = models.CharField(max_length=120, null=True, blank=True)
    ctwa_clid = models.CharField(max_length=512, null=True, blank=True)
    source_ad_id = models.CharField(max_length=100, null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="nuevo")
    last_inbound_at = models.DateTimeField(null=True, blank=True)
    last_outbound_at = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_conversation"
        ordering = ["-actualizado_en", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["empresa", "wa_phone"], name="uniq_crm_empresa_wa_phone"),
        ]

    def __str__(self):
        return f"{self.wa_phone} ({self.empresa_id})"


class Message(models.Model):
    DIRECTION_IN = "inbound"
    DIRECTION_OUT = "outbound"
    DIRECTION_CHOICES = [
        (DIRECTION_IN, "Inbound"),
        (DIRECTION_OUT, "Outbound"),
    ]

    conversation = models.ForeignKey(
        "crm.Conversation",
        on_delete=models.CASCADE,
        related_name="mensajes",
    )
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    wa_message_id = models.CharField(max_length=128, unique=True, null=True, blank=True)
    body = models.TextField(blank=True, default="")
    tipo = models.CharField(max_length=20, default="text")
    estado = models.CharField(max_length=20, null=True, blank=True)
    timestamp = models.DateTimeField()
    raw = models.JSONField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "crm_message"
        ordering = ["timestamp", "id"]

    def __str__(self):
        return f"{self.direction} {self.tipo} {self.timestamp}"
