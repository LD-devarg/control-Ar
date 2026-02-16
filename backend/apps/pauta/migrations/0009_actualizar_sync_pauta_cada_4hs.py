from django.db import migrations


def actualizar_sync_pauta_a_4hs(apps, schema_editor):
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    intervalo_4h, _ = IntervalSchedule.objects.get_or_create(
        every=240,
        period="minutes",
    )

    PeriodicTask.objects.filter(name__in=["sync_pauta_kpi_15m", "sync_pauta_estado_15m"]).update(
        interval=intervalo_4h
    )


def revertir_sync_pauta_a_15m(apps, schema_editor):
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    intervalo_15m, _ = IntervalSchedule.objects.get_or_create(
        every=15,
        period="minutes",
    )

    PeriodicTask.objects.filter(name__in=["sync_pauta_kpi_15m", "sync_pauta_estado_15m"]).update(
        interval=intervalo_15m
    )


class Migration(migrations.Migration):
    dependencies = [
        ("pauta", "0008_rendimientopautadiario_link_clicks"),
        ("django_celery_beat", "0019_alter_periodictasks_options"),
    ]

    operations = [
        migrations.RunPython(actualizar_sync_pauta_a_4hs, revertir_sync_pauta_a_15m),
    ]
