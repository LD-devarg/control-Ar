from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pauta", "0007_kpiobjetivo"),
    ]

    operations = [
        migrations.AddField(
            model_name="rendimientopautadiario",
            name="link_clicks",
            field=models.BigIntegerField(default=0),
        ),
    ]
