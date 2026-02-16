from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0004_empresa_beat_tasks_config"),
    ]

    operations = [
        migrations.AddField(
            model_name="empresa",
            name="kpi_sync_last_run_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="empresa",
            name="kpi_sync_last_status",
            field=models.CharField(blank=True, max_length=30, null=True),
        ),
        migrations.AddField(
            model_name="empresa",
            name="estado_sync_last_run_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="empresa",
            name="estado_sync_last_status",
            field=models.CharField(blank=True, max_length=30, null=True),
        ),
    ]
