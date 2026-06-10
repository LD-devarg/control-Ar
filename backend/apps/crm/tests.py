import hashlib
import hmac
import json

from django.test import Client, SimpleTestCase, TestCase
from django.test.utils import override_settings
from django.utils import timezone
from unittest.mock import patch

from apps.crm.models import Conversation, Message, WhatsAppConfig
from apps.crm.servicios.parser import parse_inbound, parse_statuses
from apps.crm.servicios.wa_client import build_text_message_request, conversacion_en_ventana_24h
from apps.crm.tasks import procesar_evento_whatsapp
from apps.empresas.models import Empresa, Organizacion
from apps.operativo.models import Cliente, EventosMeta


def whatsapp_payload(*, phone_number_id="phone-1", wa_phone="5491122334455", message_id="wamid.1"):
    return {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {"phone_number_id": phone_number_id},
                            "contacts": [{"wa_id": wa_phone, "profile": {"name": "Juan Perez"}}],
                            "messages": [
                                {
                                    "from": wa_phone,
                                    "id": message_id,
                                    "timestamp": "1760000000",
                                    "type": "text",
                                    "text": {"body": "Hola, quiero informacion"},
                                    "referral": {
                                        "ctwa_clid": "ctwa-123",
                                        "source_id": "ad-123",
                                    },
                                }
                            ],
                        }
                    }
                ]
            }
        ]
    }


def crear_empresa(nombre="Empresa CRM"):
    organizacion = Organizacion.objects.create(nombre=f"Org {nombre}")
    return Empresa.objects.create(nombre=nombre, organizacion=organizacion, codigo_prefijo="CR")


class WhatsAppParserTests(SimpleTestCase):
    def test_parse_inbound_extrae_ctwa_clid_y_phone_number_id(self):
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "metadata": {"phone_number_id": "phone-1"},
                                "contacts": [{"wa_id": "5491122334455", "profile": {"name": "Juan"}}],
                                "messages": [
                                    {
                                        "from": "5491122334455",
                                        "id": "wamid.1",
                                        "timestamp": "1760000000",
                                        "type": "text",
                                        "text": {"body": "Hola"},
                                        "referral": {
                                            "ctwa_clid": "ctwa-123",
                                            "source_id": "ad-123",
                                        },
                                    }
                                ],
                            }
                        }
                    ]
                }
            ]
        }

        mensajes = parse_inbound(payload)

        self.assertEqual(len(mensajes), 1)
        self.assertEqual(mensajes[0]["phone_number_id"], "phone-1")
        self.assertEqual(mensajes[0]["wa_phone"], "5491122334455")
        self.assertEqual(mensajes[0]["contact_name"], "Juan")
        self.assertEqual(mensajes[0]["body"], "Hola")
        self.assertEqual(mensajes[0]["ctwa_clid"], "ctwa-123")
        self.assertEqual(mensajes[0]["source_ad_id"], "ad-123")

    def test_parse_statuses_extrae_estado(self):
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "statuses": [
                                    {"id": "wamid.1", "status": "delivered", "timestamp": "1760000001"}
                                ]
                            }
                        }
                    ]
                }
            ]
        }

        statuses = parse_statuses(payload)

        self.assertEqual(len(statuses), 1)
        self.assertEqual(statuses[0]["wa_message_id"], "wamid.1")
        self.assertEqual(statuses[0]["estado"], "delivered")
        self.assertEqual(statuses[0]["raw"]["status"], "delivered")


class WhatsAppClientTests(SimpleTestCase):
    @override_settings(WHATSAPP={"API_VERSION": "v99.0"})
    def test_build_text_message_request(self):
        class Config:
            phone_number_id = "phone-1"
            access_token_encrypted = ""

        with patch("apps.crm.servicios.wa_client.decrypt_token", return_value="token-123"):
            url, headers, data = build_text_message_request(
                config=Config(),
                to_phone="5491122334455",
                body="Hola",
            )

        self.assertEqual(url, "https://graph.facebook.com/v99.0/phone-1/messages")
        self.assertEqual(headers["Authorization"], "Bearer token-123")
        self.assertEqual(data["messaging_product"], "whatsapp")
        self.assertEqual(data["to"], "5491122334455")
        self.assertEqual(data["text"]["body"], "Hola")

    def test_conversacion_en_ventana_24h(self):
        class Conversation:
            last_inbound_at = timezone.now()

        self.assertTrue(conversacion_en_ventana_24h(Conversation()))


class WhatsAppWebhookTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.empresa = crear_empresa()
        WhatsAppConfig.objects.create(
            empresa=self.empresa,
            phone_number_id="phone-1",
            waba_id="waba-1",
            verify_token="verify-db",
            app_secret="secret-db",
            activo=True,
        )

    def test_get_verifica_webhook_con_token_guardado(self):
        response = self.client.get(
            "/webhook/whatsapp/",
            {
                "hub.mode": "subscribe",
                "hub.verify_token": "verify-db",
                "hub.challenge": "challenge-123",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"challenge-123")

    def test_get_rechaza_token_incorrecto(self):
        response = self.client.get(
            "/webhook/whatsapp/",
            {
                "hub.mode": "subscribe",
                "hub.verify_token": "otro-token",
                "hub.challenge": "challenge-123",
            },
        )

        self.assertEqual(response.status_code, 403)

    def test_post_encola_payload(self):
        WhatsAppConfig.objects.update(app_secret="")
        with patch("apps.crm.webhooks.procesar_evento_whatsapp.delay") as delay:
            response = self.client.post(
                "/webhook/whatsapp/",
                data=whatsapp_payload(),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        delay.assert_called_once()

    def test_post_valida_firma_con_app_secret_guardado(self):
        body = json.dumps(whatsapp_payload()).encode("utf-8")
        signature = "sha256=" + hmac.new(b"secret-db", body, hashlib.sha256).hexdigest()

        with patch("apps.crm.webhooks.procesar_evento_whatsapp.delay") as delay:
            response = self.client.post(
                "/webhook/whatsapp/",
                data=body,
                content_type="application/json",
                HTTP_X_HUB_SIGNATURE_256=signature,
            )

        self.assertEqual(response.status_code, 200)
        delay.assert_called_once()

    def test_post_rechaza_firma_incorrecta(self):
        body = json.dumps(whatsapp_payload()).encode("utf-8")

        response = self.client.post(
            "/webhook/whatsapp/",
            data=body,
            content_type="application/json",
            HTTP_X_HUB_SIGNATURE_256="sha256=bad",
        )

        self.assertEqual(response.status_code, 403)


class WhatsAppInboundFlowTests(TestCase):
    def setUp(self):
        self.empresa = crear_empresa("Inbound CRM")
        WhatsAppConfig.objects.create(
            empresa=self.empresa,
            phone_number_id="phone-1",
            waba_id="waba-1",
            verify_token="verify-db",
            activo=True,
        )

    def test_procesa_inbound_crea_cliente_conversacion_mensaje_y_evento_capi(self):
        with patch("apps.operativo.servicios.eventos.enviar_evento_meta", return_value={"ok": True}):
            procesar_evento_whatsapp.run(whatsapp_payload())

        cliente = Cliente.objects.get(empresa=self.empresa, wa_phone="5491122334455")
        self.assertEqual(cliente.nombre, "Juan Perez")
        self.assertEqual(cliente.origen, "whatsapp")
        self.assertEqual(cliente.ctwa_clid, "ctwa-123")
        self.assertEqual(cliente.source_ad_id, "ad-123")

        conversation = Conversation.objects.get(empresa=self.empresa, wa_phone="5491122334455")
        self.assertEqual(conversation.cliente, cliente)
        self.assertEqual(conversation.ctwa_clid, "ctwa-123")

        message = Message.objects.get(conversation=conversation, wa_message_id="wamid.1")
        self.assertEqual(message.direction, Message.DIRECTION_IN)
        self.assertEqual(message.body, "Hola, quiero informacion")

        evento = EventosMeta.objects.get(cliente=cliente, tipo="lead")
        self.assertEqual(evento.fuente, "whatsapp")
        self.assertEqual(evento.ctwa_clid, "ctwa-123")
        self.assertEqual(evento.data["ctwa_clid"], "ctwa-123")
        self.assertEqual(evento.data["waba_id"], "waba-1")
        self.assertEqual(evento.data["action_source"], "business_messaging")
        self.assertEqual(evento.data["messaging_channel"], "whatsapp")

    def test_procesa_inbound_de_forma_idempotente_por_wa_message_id(self):
        payload = whatsapp_payload()
        with patch("apps.operativo.servicios.eventos.enviar_evento_meta", return_value={"ok": True}):
            procesar_evento_whatsapp.run(payload)
            procesar_evento_whatsapp.run(payload)

        self.assertEqual(Cliente.objects.filter(empresa=self.empresa, wa_phone="5491122334455").count(), 1)
        self.assertEqual(Conversation.objects.filter(empresa=self.empresa, wa_phone="5491122334455").count(), 1)
        self.assertEqual(Message.objects.filter(wa_message_id="wamid.1").count(), 1)
        self.assertEqual(EventosMeta.objects.filter(tipo="lead", fuente="whatsapp").count(), 1)

    def test_procesa_status_actualiza_mensaje_y_publica_realtime(self):
        conversation = Conversation.objects.create(
            empresa=self.empresa,
            wa_phone="5491122334455",
            contact_name="Juan Perez",
        )
        message = Message.objects.create(
            conversation=conversation,
            direction=Message.DIRECTION_OUT,
            wa_message_id="wamid.status1",
            body="Hola",
            tipo="text",
            estado="sent",
            timestamp=timezone.now(),
        )
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "statuses": [
                                    {
                                        "id": "wamid.status1",
                                        "status": "delivered",
                                        "timestamp": "1760000001",
                                        "recipient_id": "5491122334455",
                                        "conversation": {"id": "conv-meta-1"},
                                        "pricing": {"pricing_model": "CBP"},
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }

        with patch("apps.crm.servicios.statuses.publish_empresa_event") as publish:
            procesar_evento_whatsapp.run(payload)

        message.refresh_from_db()
        self.assertEqual(message.estado, "delivered")
        self.assertIsNotNone(message.status_timestamp)
        self.assertEqual(message.status_raw["conversation"]["id"], "conv-meta-1")
        publish.assert_called_once()
        self.assertEqual(publish.call_args.kwargs["event_type"], "crm_message_status_updated")
        self.assertEqual(publish.call_args.kwargs["payload"]["message_id"], message.id)

    def test_procesa_status_no_regresa_read_a_delivered(self):
        conversation = Conversation.objects.create(
            empresa=self.empresa,
            wa_phone="5491122334455",
            contact_name="Juan Perez",
        )
        message = Message.objects.create(
            conversation=conversation,
            direction=Message.DIRECTION_OUT,
            wa_message_id="wamid.status2",
            body="Hola",
            tipo="text",
            estado="read",
            timestamp=timezone.now(),
        )
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "statuses": [
                                    {"id": "wamid.status2", "status": "delivered", "timestamp": "1760000001"}
                                ]
                            }
                        }
                    ]
                }
            ]
        }

        with patch("apps.crm.servicios.statuses.publish_empresa_event") as publish:
            procesar_evento_whatsapp.run(payload)

        message.refresh_from_db()
        self.assertEqual(message.estado, "read")
        self.assertIsNone(message.status_raw)
        publish.assert_not_called()


from rest_framework.test import APITestCase
from apps.empresas.models import Usuario

class ConversationApiTests(APITestCase):
    def setUp(self):
        self.empresa = crear_empresa("Test Company")
        self.user = Usuario.objects.create_user(
            username="test_user",
            password="test_password123",
            empresa=self.empresa,
        )
        self.user.is_superuser = True
        self.user.save()
        self.client.force_authenticate(user=self.user)
        self.conversation = Conversation.objects.create(
            empresa=self.empresa,
            wa_phone="5491122334455",
            contact_name="Juan Perez",
            last_inbound_at=timezone.now(),
        )

    def test_responder_post_endpoint_is_allowed(self):
        config = WhatsAppConfig.objects.create(
            empresa=self.empresa,
            phone_number_id="phone-1",
            waba_id="waba-1",
            access_token_encrypted="fake_encrypted_token",
            activo=True,
        )
        with patch("apps.crm.views.enviar_mensaje_texto", return_value={"messages": [{"id": "wamid.outbound1"}], "fake": True}) as mock_send:
            url = f"/crm/conversations/{self.conversation.id}/responder/"
            response = self.client.post(url, {"body": "Test message reply"})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["body"], "Test message reply")
        mock_send.assert_called_once()

    def test_create_post_endpoint_is_not_allowed(self):
        url = "/crm/conversations/"
        response = self.client.post(url, {
            "empresa": self.empresa.id,
            "wa_phone": "5491122334466",
        })
        self.assertEqual(response.status_code, 405)


class WhatsAppMediaTests(TestCase):
    def test_parse_inbound_extracts_media_info(self):
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "metadata": {"phone_number_id": "phone-1"},
                                "contacts": [{"wa_id": "5491122334455", "profile": {"name": "Juan"}}],
                                "messages": [
                                    {
                                        "from": "5491122334455",
                                        "id": "wamid.media1",
                                        "timestamp": "1760000000",
                                        "type": "image",
                                        "image": {
                                            "id": "media-id-123",
                                            "mime_type": "image/jpeg",
                                            "caption": "Foto de prueba"
                                        }
                                    }
                                ],
                            }
                        }
                    ]
                }
            ]
        }
        mensajes = parse_inbound(payload)
        self.assertEqual(len(mensajes), 1)
        self.assertEqual(mensajes[0]["tipo"], "image")
        self.assertEqual(mensajes[0]["body"], "Foto de prueba")
        self.assertEqual(mensajes[0]["media_id"], "media-id-123")

    @patch("apps.crm.servicios.media.descargar_y_guardar_media_whatsapp")
    def test_procesar_inbound_saves_media_fields(self, mock_download):
        mock_download.return_value = (
            "https://test-s3-bucket.s3.amazonaws.com/whatsapp_media/test-file.jpg",
            "test-file.jpg",
            2048,
            "image/jpeg"
        )
        empresa = crear_empresa("Media Company")
        WhatsAppConfig.objects.create(
            empresa=empresa,
            phone_number_id="phone-1",
            waba_id="waba-1",
            activo=True,
        )
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "metadata": {"phone_number_id": "phone-1"},
                                "contacts": [{"wa_id": "5491122334455", "profile": {"name": "Juan"}}],
                                "messages": [
                                    {
                                        "from": "5491122334455",
                                        "id": "wamid.media2",
                                        "timestamp": "1760000000",
                                        "type": "image",
                                        "image": {
                                            "id": "media-id-123",
                                            "mime_type": "image/jpeg",
                                            "caption": "Foto de prueba"
                                        }
                                    }
                                ],
                            }
                        }
                    ]
                }
            ]
        }
        
        with patch("apps.operativo.servicios.eventos.enviar_evento_meta", return_value={"ok": True}):
            procesar_evento_whatsapp.run(payload)

        message = Message.objects.get(wa_message_id="wamid.media2")
        self.assertEqual(message.tipo, "image")
        self.assertEqual(message.body, "Foto de prueba")
        self.assertEqual(message.file_url, "https://test-s3-bucket.s3.amazonaws.com/whatsapp_media/test-file.jpg")
        self.assertEqual(message.file_name, "test-file.jpg")
        self.assertEqual(message.file_size, 2048)
        self.assertEqual(message.mime_type, "image/jpeg")
