from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0007_organizacion_and_empresa_fk"),
    ]

    operations = [
        migrations.CreateModel(
            name="UsuarioEmpresaAcceso",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("activo", models.BooleanField(default=True)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                (
                    "empresa",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="accesos_usuario",
                        to="empresas.empresa",
                    ),
                ),
                (
                    "usuario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="accesos_empresa",
                        to="empresas.usuario",
                    ),
                ),
            ],
            options={
                "db_table": "empresas_usuario_empresa_acceso",
            },
        ),
        migrations.AddConstraint(
            model_name="usuarioempresaacceso",
            constraint=models.UniqueConstraint(fields=("usuario", "empresa"), name="uniq_usuario_empresa_acceso"),
        ),
    ]
