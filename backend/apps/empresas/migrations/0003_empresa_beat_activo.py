from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0002_empresa_workers_activos"),
    ]

    operations = [
        migrations.AddField(
            model_name="empresa",
            name="beat_activo",
            field=models.BooleanField(default=True),
        ),
    ]
