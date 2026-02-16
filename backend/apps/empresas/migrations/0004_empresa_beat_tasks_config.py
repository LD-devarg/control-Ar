from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0003_empresa_beat_activo"),
    ]

    operations = [
        migrations.AddField(
            model_name="empresa",
            name="beat_tasks_config",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
