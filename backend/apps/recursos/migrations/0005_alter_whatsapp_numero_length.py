from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recursos", "0004_heartbeat_cada_10_min"),
    ]

    operations = [
        migrations.AlterField(
            model_name="whatsapp",
            name="numero",
            field=models.CharField(max_length=15),
        ),
    ]
