from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0019_empresa_codigo_prefijo"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="empresa",
            name="kommo_access_token",
        ),
        migrations.RemoveField(
            model_name="empresa",
            name="kommo_account_id",
        ),
        migrations.RemoveField(
            model_name="empresa",
            name="kommo_enabled",
        ),
        migrations.RemoveField(
            model_name="empresa",
            name="kommo_subdomain",
        ),
        migrations.RemoveField(
            model_name="empresa",
            name="kommo_webhook_secret",
        ),
    ]
