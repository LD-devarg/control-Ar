from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("operativo", "0002_landing_content_fields"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="landing",
            name="titulo",
        ),
        migrations.RemoveField(
            model_name="landing",
            name="subtitulo",
        ),
        migrations.RemoveField(
            model_name="landing",
            name="descripcion",
        ),
        migrations.RemoveField(
            model_name="landing",
            name="imagen_url",
        ),
    ]
