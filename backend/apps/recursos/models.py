from django.db import models


class TipoCambio(models.Model):
    moneda_origen = models.CharField(max_length=10)
    moneda_destino = models.CharField(max_length=10)
    valor = models.DecimalField(max_digits=10, decimal_places=4)
    fuente = models.CharField(max_length=255, null=True, blank=True)
    vigente_desde = models.DateTimeField(auto_now=True)
    vigente_hasta = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "recursos_tipocambio"

    def __str__(self):
        return f"{self.moneda_origen} to {self.moneda_destino} - Rate: {self.valor}"


class WhatsApp(models.Model):
    numero = models.CharField(max_length=15)
    activo = models.BooleanField(default=True)
    ultimo_uso = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="whatsapps",
    )

    class Meta:
        db_table = "recursos_whatsapp"
