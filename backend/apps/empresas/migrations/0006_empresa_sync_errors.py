from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0005_empresa_sync_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="empresa",
            name="kpi_sync_last_error",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="empresa",
            name="estado_sync_last_error",
            field=models.TextField(blank=True, null=True),
        ),
    ]
