from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0003_empresa_beat_activo"),
        ("pauta", "0003_alter_anuncio_creative"),
    ]

    operations = [
        migrations.CreateModel(
            name="RendimientoPautaDiario",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("fecha", models.DateField()),
                ("campaign_meta_id", models.CharField(blank=True, default="", max_length=100)),
                ("campaign_name", models.CharField(blank=True, default="", max_length=255)),
                ("adset_meta_id", models.CharField(blank=True, default="", max_length=100)),
                ("adset_name", models.CharField(blank=True, default="", max_length=255)),
                ("ad_meta_id", models.CharField(max_length=100)),
                ("ad_name", models.CharField(blank=True, default="", max_length=255)),
                ("spend_usd", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("impressions", models.BigIntegerField(default=0)),
                ("reach", models.BigIntegerField(default=0)),
                ("clicks", models.BigIntegerField(default=0)),
                ("ctr", models.DecimalField(decimal_places=4, default=0, max_digits=10)),
                ("cpc_usd", models.DecimalField(decimal_places=4, default=0, max_digits=14)),
                ("frequency", models.DecimalField(decimal_places=4, default=0, max_digits=10)),
                ("web_visitors", models.BigIntegerField(default=0)),
                ("leads", models.BigIntegerField(default=0)),
                ("contacts", models.BigIntegerField(default=0)),
                ("purchases", models.BigIntegerField(default=0)),
                ("purchase_value_usd", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                (
                    "cuenta_publicitaria",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="rendimientos_diarios",
                        to="pauta.cuentapublicitaria",
                    ),
                ),
                (
                    "empresa",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="rendimientos_pauta_diarios",
                        to="empresas.empresa",
                    ),
                ),
            ],
            options={
                "db_table": "pauta_rendimientopautadiario",
            },
        ),
        migrations.AddConstraint(
            model_name="rendimientopautadiario",
            constraint=models.UniqueConstraint(
                fields=("empresa", "cuenta_publicitaria", "fecha", "ad_meta_id"),
                name="uniq_rend_pauta_diario_ad",
            ),
        ),
    ]
