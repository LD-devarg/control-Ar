import uuid
from django.db import models


TIPO_EVENTO_CHOICES = [
    ("lead", "Lead"),
    ("contact", "Contact"),
    ("purchase", "Purchase"),
]

BONO_CHOICES = [
    ("100%", "100%"),
    ("50%", "50%"),
    ("25%", "25%"),
    ("30%", "30%"),
]


class Cliente(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    nombre = models.CharField(max_length=100)
    contacto = models.CharField(max_length=15)
    username = models.CharField(max_length=50, unique=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    cant_compras = models.IntegerField(default=0)
    total_compras_ars = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_compras_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="clientes",
    )

    class Meta:
        db_table = "operativo_cliente"

    def __str__(self):
        return self.nombre


class Landing(models.Model):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="landings",
    )
    nombre = models.CharField(max_length=120)
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    url = models.URLField()
    bono = models.CharField(max_length=50, choices=BONO_CHOICES, default="100%")
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "operativo_landing"

    def __str__(self):
        return f"{self.nombre} ({self.empresa})"


class EventosMeta(models.Model):
    id_evento = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    tipo = models.CharField(max_length=50, choices=TIPO_EVENTO_CHOICES)
    data = models.JSONField()
    creado_en = models.DateTimeField(auto_now_add=True)
    enviado_en = models.DateTimeField(null=True, blank=True)
    estado_envio = models.CharField(
        max_length=20,
        choices=[("pendiente", "Pendiente"), ("enviado", "Enviado"), ("fallido", "Fallido")],
        default="pendiente",
    )
    reintentos = models.IntegerField(default=0)
    respuesta_meta = models.JSONField(null=True, blank=True)
    fbc = models.CharField(max_length=255, null=True, blank=True)
    fbp = models.CharField(max_length=255, null=True, blank=True)
    cliente = models.ForeignKey(
        "operativo.Cliente",
        on_delete=models.CASCADE,
        related_name="eventos_meta",
    )
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="eventos_meta",
    )
    operador = models.ForeignKey(
        "empresas.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        related_name="eventos_meta",
    )
    landing = models.ForeignKey(
        "operativo.Landing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos_meta",
    )

    class Meta:
        db_table = "operativo_eventosmeta"

    def __str__(self):
        return f"{self.tipo} - {self.cliente} ({self.estado_envio})"


class Compra(models.Model):
    monto_ars = models.DecimalField(max_digits=10, decimal_places=2)
    comprobante = models.CharField(max_length=255, null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    monto_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    tc = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    cliente = models.ForeignKey(
        "operativo.Cliente",
        on_delete=models.CASCADE,
        related_name="compras",
    )
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="compras",
    )
    operador = models.ForeignKey(
        "empresas.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        related_name="compras",
    )
    tipo_cambio = models.ForeignKey(
        "recursos.TipoCambio",
        on_delete=models.SET_NULL,
        null=True,
        related_name="compras",
    )

    class Meta:
        db_table = "operativo_compra"

    def __str__(self):
        return f"Compra {self.id} - Cliente: {self.cliente.nombre} - Monto: {self.monto_ars}"
