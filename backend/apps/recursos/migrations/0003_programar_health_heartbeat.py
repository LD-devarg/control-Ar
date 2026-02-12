from django.db import migrations


def crear_tarea_periodica(apps, schema_editor):
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    intervalo, _ = IntervalSchedule.objects.get_or_create(
        every=1,
        period="minutes",
    )

    PeriodicTask.objects.get_or_create(
        name="health_heartbeat",
        defaults={
            "interval": intervalo,
            "task": "apps.recursos.tasks.health_heartbeat",
            "enabled": True,
        },
    )


def borrar_tarea_periodica(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(name="health_heartbeat").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("recursos", "0002_programar_fetch_tipo_cambio"),
        ("django_celery_beat", "0019_alter_periodictasks_options"),
    ]

    operations = [
        migrations.RunPython(crear_tarea_periodica, borrar_tarea_periodica),
    ]
