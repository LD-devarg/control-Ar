from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0032_cliente_eventosmeta_ip_user_agent"),
    ]

    operations = [
        migrations.AddField(
            model_name="landing",
            name="mostrar_campo_nombre",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="landing",
            name="mostrar_campo_telefono",
            field=models.BooleanField(default=False),
        ),
    ]
