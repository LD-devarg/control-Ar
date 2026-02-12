from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0011_remove_color_boton"),
    ]

    operations = [
        migrations.AddField(
            model_name="landing",
            name="color_bono",
            field=models.CharField(default="#ffe600", max_length=20),
        ),
    ]
