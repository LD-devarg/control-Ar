from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0031_landing_capi_pixel_extra"),
    ]

    operations = [
        migrations.AddField(
            model_name="cliente",
            name="ip_address",
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="cliente",
            name="user_agent",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="eventosmeta",
            name="ip_address",
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="eventosmeta",
            name="user_agent",
            field=models.TextField(blank=True, null=True),
        ),
    ]
