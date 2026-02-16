from django.db import migrations


def crear_tarea_periodica(apps, schema_editor):
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    intervalo, _ = IntervalSchedule.objects.get_or_create(
        every=15,
        period="minutes",
    )

    PeriodicTask.objects.get_or_create(
        name="sync_pauta_estado_15m",
        defaults={
            "interval": intervalo,
            "task": "apps.pauta.tasks.sync_pauta_estado_15m_task",
            "enabled": True,
        },
    )


def borrar_tarea_periodica(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(name="sync_pauta_estado_15m").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("pauta", "0005_programar_sync_pauta_kpi_15m"),
        ("django_celery_beat", "0019_alter_periodictasks_options"),
    ]

    operations = [
        migrations.RunPython(crear_tarea_periodica, borrar_tarea_periodica),
    ]
