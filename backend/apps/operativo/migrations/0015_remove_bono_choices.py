from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0014_landing_mostrar_disclaimer"),
    ]

    operations = [
        migrations.AlterField(
            model_name="landing",
            name="bono",
            field=models.CharField(default="100%", max_length=50),
        ),
    ]
