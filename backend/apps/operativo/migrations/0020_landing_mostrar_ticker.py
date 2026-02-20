from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0019_landing_texto_whatsapp"),
    ]

    operations = [
        migrations.AddField(
            model_name="landing",
            name="mostrar_ticker",
            field=models.BooleanField(default=True),
        ),
    ]
