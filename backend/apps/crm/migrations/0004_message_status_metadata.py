from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0003_message_file_name_message_file_size_message_file_url_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="status_raw",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="message",
            name="status_timestamp",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
