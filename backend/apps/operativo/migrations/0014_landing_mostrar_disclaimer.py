from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0013_drop_color_boton_column"),
    ]

    operations = [
        migrations.AddField(
            model_name="landing",
            name="mostrar_disclaimer",
            field=models.BooleanField(default=True),
        ),
    ]
