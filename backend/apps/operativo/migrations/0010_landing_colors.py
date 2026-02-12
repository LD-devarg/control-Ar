from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0009_landingvisit"),
    ]

    operations = [
        migrations.AddField(
            model_name="landing",
            name="color_titulo",
            field=models.CharField(default="#ffffff", max_length=20),
        ),
        migrations.AddField(
            model_name="landing",
            name="color_subtitulo",
            field=models.CharField(default="#ffffff", max_length=20),
        ),
        migrations.AddField(
            model_name="landing",
            name="color_keyword",
            field=models.CharField(default="#ffe600", max_length=20),
        ),
        migrations.AddField(
            model_name="landing",
            name="color_bono",
            field=models.CharField(default="#ffe600", max_length=20),
        ),
        migrations.AddField(
            model_name="landing",
            name="color_info",
            field=models.CharField(default="#ffffff", max_length=20),
        ),
        migrations.AddField(
            model_name="landing",
            name="bg_type",
            field=models.CharField(default="gradient", max_length=20),
        ),
        migrations.AddField(
            model_name="landing",
            name="bg_color",
            field=models.CharField(default="#0f172a", max_length=40),
        ),
        migrations.AddField(
            model_name="landing",
            name="bg_gradient",
            field=models.CharField(
                default="linear-gradient(135deg, #0b1f3a 0%, #0f172a 40%, #111827 100%)",
                max_length=255,
            ),
        ),
    ]
