from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("operativo", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="landing",
            name="titulo",
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name="landing",
            name="subtitulo",
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name="landing",
            name="descripcion",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="landing",
            name="boton_texto",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="landing",
            name="boton_url",
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="landing",
            name="imagen_url",
            field=models.URLField(blank=True, null=True),
        ),
    ]
