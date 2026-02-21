from django.db import migrations, models


def copy_operating_mode_from_org_to_empresa(apps, schema_editor):
    Empresa = apps.get_model("empresas", "Empresa")
    for empresa in Empresa.objects.select_related("organizacion").all():
        org = getattr(empresa, "organizacion", None)
        if org and getattr(org, "operating_mode", None):
            empresa.operating_mode = org.operating_mode
            empresa.save(update_fields=["operating_mode"])


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0010_organizacion_operating_mode"),
    ]

    operations = [
        migrations.AddField(
            model_name="empresa",
            name="operating_mode",
            field=models.CharField(
                choices=[("full", "Completo"), ("ftd_only", "Solo FTD")],
                default="full",
                max_length=20,
            ),
        ),
        migrations.RunPython(copy_operating_mode_from_org_to_empresa, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="organizacion",
            name="operating_mode",
        ),
    ]
