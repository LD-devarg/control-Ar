import uuid
from django.db import models
from .storages import PrivateMediaStorage, PublicMediaStorage


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

def generar_codigo_corto():
    import random
    return f"{random.randint(0, 999999):06d}"

class Cliente(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    codigo = models.CharField(max_length=6, default=generar_codigo_corto, unique=True)
    idempotency_key = models.UUIDField(null=True, blank=True, unique=True)
    nombre = models.CharField(max_length=100, null=True, blank=True)
    contacto = models.CharField(max_length=15, null=True, blank=True)
    username = models.CharField(max_length=50, unique=True, null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    cant_compras = models.IntegerField(default=0)
    total_compras_ars = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_compras_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    first_touch_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    fbc = models.CharField(max_length=255, null=True, blank=True)
    fbp = models.CharField(max_length=255, null=True, blank=True)
    fbclid = models.CharField(max_length=255, null=True, blank=True)
    utm_source = models.CharField(max_length=255, null=True, blank=True)
    utm_medium = models.CharField(max_length=255, null=True, blank=True)
    utm_campaign = models.CharField(max_length=255, null=True, blank=True)
    utm_content = models.CharField(max_length=255, null=True, blank=True)
    utm_term = models.CharField(max_length=255, null=True, blank=True)
    event_source_url = models.URLField(max_length=1024, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="clientes",
    )

    class Meta:
        db_table = "operativo_cliente"

    def __str__(self):
        return self.nombre or f"Cliente #{self.pk}"


class Landing(models.Model):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="landings",
    )
    credencial_meta = models.ForeignKey(
        "pauta.CredencialesMeta",
        on_delete=models.SET_NULL,
        related_name="landings",
        null=True,
        blank=True,
    )
    enviar_capi_pixel_extra = models.BooleanField(default=False)
    credencial_meta_extra = models.ForeignKey(
        "pauta.CredencialesMeta",
        on_delete=models.SET_NULL,
        related_name="landings_capi_extra",
        null=True,
        blank=True,
    )
    nombre = models.CharField(max_length=120)
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    url = models.URLField()
    bono = models.CharField(max_length=50, default="100%")
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    titulo = models.CharField(max_length=255, null=True, blank=True)
    subtitulo = models.CharField(max_length=255, null=True, blank=True)
    texto_boton = models.CharField(max_length=100, null=True, blank=True)
    texto_info = models.CharField(max_length=255, null=True, blank=True)
    texto_whatsapp = models.TextField(blank=True, default="")
    mostrar_formulario = models.BooleanField(default=True)
    mostrar_campo_nombre = models.BooleanField(default=True)
    mostrar_campo_telefono = models.BooleanField(default=False)
    mostrar_disclaimer = models.BooleanField(default=True)
    mostrar_ticker = models.BooleanField(default=True)
    mostrar_medios_pago = models.BooleanField(default=False)
    mostrar_comunidad = models.BooleanField(default=False)
    texto_comunidad = models.CharField(max_length=255, null=True, blank=True)
    mostrar_pasos = models.BooleanField(default=False)
    texto_pasos = models.TextField(null=True, blank=True)
    color_titulo = models.CharField(max_length=255, default="#ffffff")
    color_subtitulo = models.CharField(max_length=255, default="#ffffff")
    color_keyword = models.CharField(max_length=255, default="#ffe600")
    color_bono = models.CharField(max_length=255, default="#ffe600")
    color_info = models.CharField(max_length=255, default="#ffffff")
    form_bg_color = models.CharField(max_length=255, default="#000000")
    form_bg_opacity = models.DecimalField(max_digits=3, decimal_places=2, default=0.70)
    form_field_border_color = models.CharField(max_length=20, default="#e014ff")
    font_family = models.CharField(max_length=40, default="roboto")
    font_scale = models.DecimalField(max_digits=4, decimal_places=2, default=1.00)
    font_titulo = models.CharField(max_length=40, default="roboto")
    font_subtitulo = models.CharField(max_length=40, default="roboto")
    font_keyword = models.CharField(max_length=40, default="roboto")
    font_bono = models.CharField(max_length=40, default="roboto")
    font_info = models.CharField(max_length=40, default="roboto")
    font_boton = models.CharField(max_length=40, default="roboto")
    font_form = models.CharField(max_length=40, default="roboto")
    size_titulo = models.DecimalField(max_digits=4, decimal_places=2, default=2.50)
    size_subtitulo = models.DecimalField(max_digits=4, decimal_places=2, default=1.50)
    size_keyword = models.DecimalField(max_digits=4, decimal_places=2, default=2.00)
    size_bono = models.DecimalField(max_digits=4, decimal_places=2, default=3.00)
    size_info = models.DecimalField(max_digits=4, decimal_places=2, default=1.00)
    size_boton = models.DecimalField(max_digits=4, decimal_places=2, default=1.20)
    size_form = models.DecimalField(max_digits=4, decimal_places=2, default=1.00)
    weight_titulo = models.PositiveSmallIntegerField(default=800)
    weight_subtitulo = models.PositiveSmallIntegerField(default=700)
    weight_keyword = models.PositiveSmallIntegerField(default=700)
    weight_bono = models.PositiveSmallIntegerField(default=800)
    weight_info = models.PositiveSmallIntegerField(default=700)
    weight_boton = models.PositiveSmallIntegerField(default=700)
    weight_form = models.PositiveSmallIntegerField(default=400)
    bg_type = models.CharField(max_length=20, default="gradient")
    bg_color = models.CharField(max_length=40, default="#0f172a")
    bg_gradient = models.CharField(
        max_length=255,
        default="linear-gradient(135deg, #0b1f3a 0%, #0f172a 40%, #111827 100%)",
    )
    def _landing_upload_to(instance, filename):
        empresa_id = instance.empresa_id or "unknown"
        return f"landings/{empresa_id}/{filename}"

    background_vertical = models.ImageField(
        upload_to=_landing_upload_to,
        storage=PublicMediaStorage(),
        null=True,
        blank=True,
    )
    background_horizontal = models.ImageField(
        upload_to=_landing_upload_to,
        storage=PublicMediaStorage(),
        null=True,
        blank=True,
    )
    imagen_reemplazo_form = models.ImageField(
        upload_to=_landing_upload_to,
        storage=PublicMediaStorage(),
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "operativo_landing"

    def __str__(self):
        return f"{self.nombre} ({self.empresa})"


class LandingVisit(models.Model):
    landing = models.ForeignKey(
        "operativo.Landing",
        on_delete=models.CASCADE,
        related_name="visitas",
    )
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="visitas_landing",
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "operativo_landing_visit"

    def __str__(self):
        return f"Visit {self.landing_id} ({self.creado_en})"


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
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
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
    def _comprobante_upload_to(instance, filename):
        empresa_id = instance.empresa_id or "unknown"
        cliente_id = instance.cliente_id or "unknown"
        return f"compras/{empresa_id}/clientes/{cliente_id}/{filename}"

    monto_ars = models.DecimalField(max_digits=10, decimal_places=2)
    comprobante = models.CharField(max_length=255, null=True, blank=True)
    comprobante_archivo = models.FileField(
        upload_to=_comprobante_upload_to,
        storage=PrivateMediaStorage(),
        null=True,
        blank=True,
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    monto_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    bono_ars = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bono_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0)
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


class Retiro(models.Model):
    def _comprobante_upload_to(instance, filename):
        empresa_id = instance.empresa_id or "unknown"
        cliente_id = instance.cliente_id or "unknown"
        return f"retiros/{empresa_id}/clientes/{cliente_id}/{filename}"

    monto_ars = models.DecimalField(max_digits=10, decimal_places=2)
    comprobante = models.CharField(max_length=255, null=True, blank=True)
    comprobante_archivo = models.FileField(
        upload_to=_comprobante_upload_to,
        storage=PrivateMediaStorage(),
        null=True,
        blank=True,
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    monto_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    tc = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    cliente = models.ForeignKey(
        "operativo.Cliente",
        on_delete=models.CASCADE,
        related_name="retiros",
    )
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="retiros",
    )
    operador = models.ForeignKey(
        "empresas.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        related_name="retiros",
    )
    tipo_cambio = models.ForeignKey(
        "recursos.TipoCambio",
        on_delete=models.SET_NULL,
        null=True,
        related_name="retiros",
    )

    class Meta:
        db_table = "operativo_retiro"

    def __str__(self):
        return f"Retiro {self.id} - Cliente: {self.cliente.nombre} - Monto: {self.monto_ars}"
