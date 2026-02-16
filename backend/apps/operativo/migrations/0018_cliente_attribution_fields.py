from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0017_force_bono_length"),
    ]

    operations = [
        migrations.AddField(
            model_name="cliente",
            name="event_source_url",
            field=models.URLField(blank=True, max_length=1024, null=True),
        ),
        migrations.AddField(
            model_name="cliente",
            name="fbclid",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="cliente",
            name="fbc",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="cliente",
            name="fbp",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="cliente",
            name="first_touch_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="cliente",
            name="utm_campaign",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="cliente",
            name="utm_content",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="cliente",
            name="utm_medium",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="cliente",
            name="utm_source",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="cliente",
            name="utm_term",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
