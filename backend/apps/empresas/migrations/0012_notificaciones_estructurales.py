from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0011_move_operating_mode_to_empresa"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificacionEstructural",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("whatsapp_activada", "WhatsApp activada"),
                            ("whatsapp_desactivada", "WhatsApp desactivada"),
                            ("login", "Login"),
                        ],
                        max_length=50,
                    ),
                ),
                ("mensaje", models.CharField(max_length=255)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("leida", models.BooleanField(default=False)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="notificaciones_emitidas",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "empresa",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notificaciones_estructurales",
                        to="empresas.empresa",
                    ),
                ),
                (
                    "organizacion",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notificaciones_estructurales",
                        to="empresas.organizacion",
                    ),
                ),
            ],
            options={
                "db_table": "empresas_notificacion_estructural",
                "ordering": ["-creado_en", "-id"],
            },
        ),
    ]
