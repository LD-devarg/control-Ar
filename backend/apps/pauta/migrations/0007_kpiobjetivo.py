from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0004_empresa_beat_tasks_config"),
        ("pauta", "0006_programar_sync_pauta_estado_15m"),
    ]

    operations = [
        migrations.CreateModel(
            name="KPIObjetivo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("ingresos_objetivo_usd", models.DecimalField(decimal_places=2, default=1000, max_digits=14)),
                ("roas_objetivo", models.DecimalField(decimal_places=4, default=2, max_digits=10)),
                ("cpa_objetivo_usd", models.DecimalField(decimal_places=2, default=20, max_digits=14)),
                ("cpc_objetivo_usd", models.DecimalField(decimal_places=2, default=5, max_digits=14)),
                ("cpl_objetivo_usd", models.DecimalField(decimal_places=2, default=10, max_digits=14)),
                ("efectividad_objetivo", models.DecimalField(decimal_places=4, default=0.03, max_digits=10)),
                ("frecuencia_objetivo", models.DecimalField(decimal_places=4, default=3, max_digits=10)),
                ("ctr_objetivo", models.DecimalField(decimal_places=4, default=0.02, max_digits=10)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                (
                    "empresa",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="kpi_objetivo",
                        to="empresas.empresa",
                    ),
                ),
            ],
            options={
                "db_table": "pauta_kpiobjetivo",
            },
        ),
    ]
