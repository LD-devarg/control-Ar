from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0015_remove_bono_choices"),
    ]

    operations = [
        migrations.AlterField(
            model_name="landing",
            name="bono",
            field=models.CharField(default="100%", max_length=50),
        ),
    ]
