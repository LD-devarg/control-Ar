from django.db import migrations


def actualizar_heartbeat_a_10_min(apps, schema_editor):
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    intervalo, _ = IntervalSchedule.objects.get_or_create(every=10, period="minutes")
    task = PeriodicTask.objects.filter(name="health_heartbeat").first()
    if not task:
        return
    task.interval = intervalo
    task.enabled = True
    task.save(update_fields=["interval", "enabled"])


def revertir_heartbeat_a_1_min(apps, schema_editor):
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    intervalo, _ = IntervalSchedule.objects.get_or_create(every=1, period="minutes")
    task = PeriodicTask.objects.filter(name="health_heartbeat").first()
    if not task:
        return
    task.interval = intervalo
    task.enabled = True
    task.save(update_fields=["interval", "enabled"])


class Migration(migrations.Migration):

    dependencies = [
        ("recursos", "0003_programar_health_heartbeat"),
        ("django_celery_beat", "0019_alter_periodictasks_options"),
    ]

    operations = [
        migrations.RunPython(actualizar_heartbeat_a_10_min, revertir_heartbeat_a_1_min),
    ]
