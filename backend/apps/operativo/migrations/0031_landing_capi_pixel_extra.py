from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pauta", "0001_initial"),
        ("operativo", "0030_alter_landing_color_bono_alter_landing_color_info_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="landing",
            name="credencial_meta_extra",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="landings_capi_extra",
                to="pauta.credencialesmeta",
            ),
        ),
        migrations.AddField(
            model_name="landing",
            name="enviar_capi_pixel_extra",
            field=models.BooleanField(default=False),
        ),
    ]
