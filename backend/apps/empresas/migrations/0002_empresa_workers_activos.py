from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="empresa",
            name="workers_activos",
            field=models.BooleanField(default=False),
        ),
    ]
