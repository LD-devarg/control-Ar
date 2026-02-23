from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0013_notificacion_estructural_logout_tipo"),
    ]

    operations = [
        migrations.AddField(
            model_name="empresa",
            name="meta_test_mode",
            field=models.BooleanField(default=False),
        ),
    ]
