from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("empresas", "0020_remove_empresa_kommo_fields"),
        ("operativo", "0038_cliente_whatsapp_ctwa_eventosmeta_fuente"),
    ]

    operations = [
        migrations.CreateModel(
            name="WhatsAppConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("phone_number_id", models.CharField(max_length=80, unique=True)),
                ("waba_id", models.CharField(max_length=80)),
                ("access_token_encrypted", models.TextField(blank=True, default="")),
                ("verify_token", models.CharField(blank=True, default="", max_length=255)),
                ("app_secret", models.CharField(blank=True, default="", max_length=255)),
                ("activo", models.BooleanField(default=True)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                (
                    "empresa",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="whatsapp_configs",
                        to="empresas.empresa",
                    ),
                ),
            ],
            options={
                "db_table": "crm_whatsapp_config",
                "ordering": ["empresa_id", "phone_number_id"],
            },
        ),
        migrations.CreateModel(
            name="Conversation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("wa_phone", models.CharField(max_length=20)),
                ("contact_name", models.CharField(blank=True, max_length=120, null=True)),
                ("ctwa_clid", models.CharField(blank=True, max_length=512, null=True)),
                ("source_ad_id", models.CharField(blank=True, max_length=100, null=True)),
                (
                    "estado",
                    models.CharField(
                        choices=[
                            ("nuevo", "Nuevo"),
                            ("en_conversacion", "En conversacion"),
                            ("calificado", "Calificado"),
                            ("convertido", "Convertido"),
                            ("perdido", "Perdido"),
                        ],
                        default="nuevo",
                        max_length=20,
                    ),
                ),
                ("last_inbound_at", models.DateTimeField(blank=True, null=True)),
                ("last_outbound_at", models.DateTimeField(blank=True, null=True)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                (
                    "cliente",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="conversaciones",
                        to="operativo.cliente",
                    ),
                ),
                (
                    "empresa",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="conversaciones",
                        to="empresas.empresa",
                    ),
                ),
            ],
            options={
                "db_table": "crm_conversation",
                "ordering": ["-actualizado_en", "-id"],
            },
        ),
        migrations.CreateModel(
            name="Message",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "direction",
                    models.CharField(
                        choices=[("inbound", "Inbound"), ("outbound", "Outbound")],
                        max_length=10,
                    ),
                ),
                ("wa_message_id", models.CharField(blank=True, max_length=128, null=True, unique=True)),
                ("body", models.TextField(blank=True, default="")),
                ("tipo", models.CharField(default="text", max_length=20)),
                ("estado", models.CharField(blank=True, max_length=20, null=True)),
                ("timestamp", models.DateTimeField()),
                ("raw", models.JSONField(blank=True, null=True)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                (
                    "conversation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="mensajes",
                        to="crm.conversation",
                    ),
                ),
            ],
            options={
                "db_table": "crm_message",
                "ordering": ["timestamp", "id"],
            },
        ),
        migrations.AddConstraint(
            model_name="conversation",
            constraint=models.UniqueConstraint(fields=("empresa", "wa_phone"), name="uniq_crm_empresa_wa_phone"),
        ),
    ]
