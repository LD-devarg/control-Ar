from django.db import models


class BM(models.Model):
    organizacion = models.ForeignKey(
        "empresas.Organizacion",
        on_delete=models.CASCADE,
        related_name="bms",
        null=True,
        blank=True,
    )
    meta_id = models.CharField(max_length=100)
    nombre = models.CharField(max_length=120)
    estado = models.CharField(max_length=50)
    empresas = models.ManyToManyField(
        "empresas.Empresa",
        related_name="bms",
        blank=True,
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_bm"

    def __str__(self):
        return f"{self.nombre} ({self.organizacion})"


class CuentaPublicitaria(models.Model):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="cuentas_publicitarias",
    )
    bm = models.ForeignKey(
        "pauta.BM",
        on_delete=models.CASCADE,
        related_name="cuentas_publicitarias",
    )
    meta_id = models.CharField(max_length=100)
    nombre = models.CharField(max_length=120)
    estado = models.CharField(max_length=50)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_cuentapublicitaria"

    def __str__(self):
        return f"{self.nombre} ({self.empresa})"

class FanPage(models.Model):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="fanpages",
    )
    bm = models.ForeignKey(
        "pauta.BM",
        on_delete=models.CASCADE,
        related_name="fanpages",
    )

    meta_id = models.CharField(max_length=100)
    nombre = models.CharField(max_length=120)
    estado = models.CharField(max_length=50)  # active, unpublished, restricted, etc.

    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_fanpage"

    def __str__(self):
        return f"{self.nombre} ({self.empresa})"
    
class InstagramAccount(models.Model):
    empresa = models.ForeignKey("empresas.Empresa", on_delete=models.CASCADE)
    fanpage = models.OneToOneField(
        "pauta.FanPage",
        on_delete=models.CASCADE,
        related_name="instagram_account",
    )
    meta_id = models.CharField(max_length=100)
    username = models.CharField(max_length=120)
    estado = models.CharField(max_length=50)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_instagram_account"


class Campaña(models.Model):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="campañas",
    )
    cuenta_publicitaria = models.ForeignKey(
        "pauta.CuentaPublicitaria",
        on_delete=models.CASCADE,
        related_name="campañas",
    )
    meta_id = models.CharField(max_length=100)
    nombre = models.CharField(max_length=120)
    estado = models.CharField(max_length=50)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    objetivo = models.CharField(max_length=100)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_campaña"

    def __str__(self):
        return f"{self.nombre} ({self.empresa})"


class ConjuntoAnuncios(models.Model):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="conjuntos_anuncios",
    )
    campaña = models.ForeignKey(
        "pauta.Campaña",
        on_delete=models.CASCADE,
        related_name="conjuntos_anuncios",
        db_column="campaña_id",
    )
    meta_id = models.CharField(max_length=100)
    nombre = models.CharField(max_length=120)
    estado = models.CharField(max_length=50)
    presupuesto_diario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    segmentacion = models.JSONField(null=True, blank=True, default=dict)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_conjuntoanuncios"

    def __str__(self):
        return f"{self.nombre} ({self.empresa})"


class Anuncio(models.Model):
    empresa = models.ForeignKey("empresas.Empresa", on_delete=models.CASCADE)
    conjunto_anuncios = models.ForeignKey(
        "pauta.ConjuntoAnuncios",
        on_delete=models.CASCADE,
        related_name="anuncios",
    )
    creative = models.ForeignKey(
        "pauta.Creative",
        on_delete=models.PROTECT,
        related_name="anuncios",
    )

    meta_id = models.CharField(max_length=100, null=True, blank=True)
    nombre = models.CharField(max_length=120)
    estado = models.CharField(max_length=50)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_anuncio"



class PautaAsset(models.Model):
    empresa = models.ForeignKey("empresas.Empresa", on_delete=models.CASCADE)
    tipo = models.CharField(max_length=20)  # image | video
    s3_url = models.URLField()
    meta_asset_id = models.CharField(max_length=100, null=True, blank=True)  
    estado = models.CharField(max_length=30, default="pending")  # uploaded / error
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_asset"

class Creative(models.Model):
    empresa = models.ForeignKey("empresas.Empresa", on_delete=models.CASCADE)
    fanpage = models.ForeignKey(
        "pauta.FanPage",
        on_delete=models.PROTECT,
        related_name="creatives",
    )
    instagram_account = models.ForeignKey(
        "pauta.InstagramAccount",
        on_delete=models.PROTECT,
        related_name="creatives",
        null=True,
        blank=True,
    )
    nombre = models.CharField(max_length=120)

    primary_text = models.TextField()
    headline = models.CharField(max_length=255)
    descripcion = models.CharField(max_length=255, null=True, blank=True)

    url_destino = models.URLField()
    cta = models.CharField(max_length=50)

    asset = models.ForeignKey("pauta.PautaAsset", on_delete=models.PROTECT)
    meta_id = models.CharField(max_length=100, null=True, blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_creative"


class GastoDiario(models.Model):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="gastos_diarios",
    )
    cuenta_publicitaria = models.ForeignKey(
        "pauta.CuentaPublicitaria",
        on_delete=models.CASCADE,
        related_name="gastos_diarios",
    )
    fecha = models.DateField()
    monto_usd = models.DecimalField(max_digits=10, decimal_places=2)
    tc = models.DecimalField(max_digits=10, decimal_places=4)
    monto_ars = models.DecimalField(max_digits=10, decimal_places=2)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_gastodiario"

    def __str__(self):
        return f"Gasto {self.monto_usd} el {self.fecha} para {self.cuenta_publicitaria}"


class CredencialesMeta(models.Model):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="credenciales_meta",
    )
    bm = models.ForeignKey(
        "pauta.BM",
        on_delete=models.CASCADE,
        related_name="credenciales_meta",
    )
    nombre = models.CharField(max_length=120, default="Credencial Meta")
    pixel_id = models.CharField(max_length=100)
    app_id = models.CharField(max_length=100, null=True, blank=True)
    token_acceso_encrypted = models.TextField()

    class Meta:
        db_table = "pauta_credencialesmeta"


class RendimientoPautaDiario(models.Model):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="rendimientos_pauta_diarios",
    )
    cuenta_publicitaria = models.ForeignKey(
        "pauta.CuentaPublicitaria",
        on_delete=models.CASCADE,
        related_name="rendimientos_diarios",
    )

    fecha = models.DateField()

    campaign_meta_id = models.CharField(max_length=100, blank=True, default="")
    campaign_name = models.CharField(max_length=255, blank=True, default="")
    adset_meta_id = models.CharField(max_length=100, blank=True, default="")
    adset_name = models.CharField(max_length=255, blank=True, default="")
    ad_meta_id = models.CharField(max_length=100)
    ad_name = models.CharField(max_length=255, blank=True, default="")

    spend_usd = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    impressions = models.BigIntegerField(default=0)
    reach = models.BigIntegerField(default=0)
    clicks = models.BigIntegerField(default=0)
    link_clicks = models.BigIntegerField(default=0)
    ctr = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    cpc_usd = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    frequency = models.DecimalField(max_digits=10, decimal_places=4, default=0)

    web_visitors = models.BigIntegerField(default=0)
    leads = models.BigIntegerField(default=0)
    contacts = models.BigIntegerField(default=0)
    purchases = models.BigIntegerField(default=0)
    purchase_value_usd = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pauta_rendimientopautadiario"
        constraints = [
            models.UniqueConstraint(
                fields=["empresa", "cuenta_publicitaria", "fecha", "ad_meta_id"],
                name="uniq_rend_pauta_diario_ad",
            )
        ]

    def __str__(self):
        return f"{self.fecha} {self.ad_name or self.ad_meta_id} ({self.empresa_id})"


class KPIObjetivo(models.Model):
    empresa = models.OneToOneField(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="kpi_objetivo",
    )
    ingresos_objetivo_usd = models.DecimalField(max_digits=14, decimal_places=2, default=1000)
    roas_objetivo = models.DecimalField(max_digits=10, decimal_places=4, default=2)
    cpa_objetivo_usd = models.DecimalField(max_digits=14, decimal_places=2, default=20)
    cpc_objetivo_usd = models.DecimalField(max_digits=14, decimal_places=2, default=5)
    cpl_objetivo_usd = models.DecimalField(max_digits=14, decimal_places=2, default=10)
    efectividad_objetivo = models.DecimalField(max_digits=10, decimal_places=4, default=0.03)
    frecuencia_objetivo = models.DecimalField(max_digits=10, decimal_places=4, default=3)
    ctr_objetivo = models.DecimalField(max_digits=10, decimal_places=4, default=0.02)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pauta_kpiobjetivo"

    def __str__(self):
        return f"KPIObjetivo({self.empresa_id})"
