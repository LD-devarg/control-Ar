from django.db import models


class BM(models.Model):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="bms",
    )
    meta_id = models.CharField(max_length=100)
    nombre = models.CharField(max_length=120)
    estado = models.CharField(max_length=50)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_bm"

    def __str__(self):
        return f"{self.nombre} ({self.empresa})"


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
    segmentacion = models.JSONField()
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_conjuntoanuncios"

    def __str__(self):
        return f"{self.nombre} ({self.empresa})"


class Anuncio(models.Model):
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="anuncios",
    )
    conjunto_anuncios = models.ForeignKey(
        "pauta.ConjuntoAnuncios",
        on_delete=models.CASCADE,
        related_name="anuncios",
    )
    meta_id = models.CharField(max_length=100)
    nombre = models.CharField(max_length=120)
    estado = models.CharField(max_length=50)
    contenido = models.JSONField()
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pauta_anuncio"

    def __str__(self):
        return f"{self.nombre} ({self.empresa})"


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
    pixel_id = models.CharField(max_length=100)
    app_id = models.CharField(max_length=100)
    token_acceso_encrypted = models.TextField()

    class Meta:
        db_table = "pauta_credencialesmeta"
