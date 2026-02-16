from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0006_empresa_sync_errors"),
    ]

    operations = [
        migrations.CreateModel(
            name="Organizacion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=255)),
                ("cupos", models.PositiveIntegerField(default=1)),
                ("activo", models.BooleanField(default=True)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "empresas_organizacion",
            },
        ),
        migrations.AddField(
            model_name="empresa",
            name="organizacion",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="empresas",
                to="empresas.organizacion",
            ),
        ),
    ]
