from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0009_usuario_organizacion"),
    ]

    operations = [
        migrations.AddField(
            model_name="organizacion",
            name="operating_mode",
            field=models.CharField(
                choices=[("full", "Completo"), ("ftd_only", "Solo FTD")],
                default="full",
                max_length=20,
            ),
        ),
    ]
