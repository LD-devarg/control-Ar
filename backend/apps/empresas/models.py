from django.db import models
from django.contrib.auth.models import AbstractUser


class Empresa(models.Model):
    nombre = models.CharField(max_length=255)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "empresas_empresa"

    def __str__(self):
        return self.nombre


class Usuario(AbstractUser):
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
