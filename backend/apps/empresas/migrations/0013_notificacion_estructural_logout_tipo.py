from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0012_notificaciones_estructurales"),
    ]

    operations = [
        migrations.AlterField(
            model_name="notificacionestructural",
            name="tipo",
            field=models.CharField(
                choices=[
                    ("whatsapp_activada", "WhatsApp activada"),
                    ("whatsapp_desactivada", "WhatsApp desactivada"),
                    ("login", "Login"),
                    ("logout", "Logout"),
                ],
                max_length=50,
            ),
        ),
    ]
