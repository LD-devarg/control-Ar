from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0008_compra_comprobante_archivo"),
    ]

    operations = [
        migrations.CreateModel(
            name="LandingVisit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("empresa", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="visitas_landing", to="empresas.empresa")),
                ("landing", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="visitas", to="operativo.landing")),
            ],
            options={
                "db_table": "operativo_landing_visit",
            },
        ),
    ]
