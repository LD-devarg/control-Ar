from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0037_compra_ocurrido_en"),
    ]

    operations = [
        migrations.AddField(
            model_name="cliente",
            name="ctwa_clid",
            field=models.CharField(blank=True, max_length=512, null=True),
        ),
        migrations.AddField(
            model_name="cliente",
            name="origen",
            field=models.CharField(
                choices=[
                    ("landing", "Landing"),
                    ("whatsapp", "WhatsApp"),
                    ("manual", "Manual"),
                    ("ecommerce", "Ecommerce"),
                ],
                default="landing",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="cliente",
            name="source_ad_id",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="cliente",
            name="wa_phone",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name="eventosmeta",
            name="ctwa_clid",
            field=models.CharField(blank=True, max_length=512, null=True),
        ),
        migrations.AddField(
            model_name="eventosmeta",
            name="fuente",
            field=models.CharField(
                choices=[
                    ("landing", "Landing"),
                    ("whatsapp", "WhatsApp"),
                    ("manual", "Manual"),
                    ("ecommerce", "Ecommerce"),
                ],
                default="landing",
                max_length=20,
            ),
        ),
    ]
