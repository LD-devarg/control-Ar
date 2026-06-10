import uuid
from decimal import Decimal
from unittest.mock import patch

from django.test import SimpleTestCase, TestCase
from django.test.utils import override_settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from datetime import timedelta

from apps.empresas.models import Empresa
from apps.operativo.models import (
    CLIENTE_CODIGO_BODY_LENGTH,
    CLIENTE_CODIGO_LENGTH,
    Cliente,
    Compra,
    EventosMeta,
    Landing,
)
from apps.recursos.models import WhatsApp
from apps.recursos.models import TipoCambio
from apps.crm.models import WhatsAppConfig
from apps.operativo.servicios.compras import reconciliar_cliente_compras
from apps.operativo.servicios.enviador import _build_capi_headers, _build_capi_url
from apps.operativo.servicios.constructor import MetaEventBuilder


class MetaEventBuilderTests(SimpleTestCase):
    def test_whatsapp_payload_usa_business_messaging_y_ctwa(self):
        data, _ = MetaEventBuilder.build(
            tipo="lead",
            payload={
                "phone": "5491122334455",
                "external_id": "cliente-1",
                "ctwa_clid": "ctwa-123",
                "action_source": "business_messaging",
                "messaging_channel": "whatsapp",
                "event_source_url": "https://example.com/landing",
            },
        )

        self.assertEqual(data["action_source"], "business_messaging")
        self.assertEqual(data["messaging_channel"], "whatsapp")
        self.assertEqual(data["user_data"]["ctwa_clid"], "ctwa-123")
        self.assertNotIn("event_source_url", data)

class ClienteCreateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.empresa = Empresa.objects.create(nombre="Empresa Test", codigo_prefijo="ET")
        self.landing = Landing.objects.create(
            empresa=self.empresa,
            nombre="Landing Test",
            url="https://example.com/landing",
            activo=True,
            mostrar_formulario=True,
        )
        self.user = get_user_model().objects.create_superuser(
            username="operadortest",
            password="secret123",
            email="operadortest@example.com",
        )

    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.servicios.eventos.enviar_evento_meta")
    def test_codigo_automatico_nuevo_sale_con_longitud_extendida(self, mock_enviar_evento_meta, mock_publish_empresa_event):
        response = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "idempotency_key": str(uuid.uuid4()),
                "nombre": "Cliente Auto",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["codigo"]), CLIENTE_CODIGO_LENGTH)
        self.assertTrue(response.data["codigo"].startswith("ET"))
        self.assertEqual(len(response.data["codigo"][2:]), CLIENTE_CODIGO_BODY_LENGTH)
        self.assertEqual(sum(1 for ch in response.data["codigo"][2:] if ch.isdigit()), 6)
        self.assertEqual(sum(1 for ch in response.data["codigo"][2:] if ch.isalpha()), 2)

    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.servicios.eventos.enviar_evento_meta")
    def test_alta_manual_avisa_si_codigo_ya_existe(self, mock_enviar_evento_meta, mock_publish_empresa_event):
        Cliente.objects.create(
            empresa=self.empresa,
            nombre="Cliente Existente",
            username="clienteexistente",
            contacto="5491111111111",
            codigo="123456",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "manual_create": True,
                "codigo": "123456",
                "nombre": "Cliente Nuevo",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["detail"], "Cliente existente, desea crear igualmente?")
        self.assertTrue(response.data["code_conflict"])
        self.assertEqual(response.data["existing_cliente"]["codigo"], "123456")
        self.assertEqual(Cliente.objects.count(), 1)

    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.servicios.eventos.enviar_evento_meta")
    def test_alta_manual_confirmada_crea_con_codigo_reasignado(self, mock_enviar_evento_meta, mock_publish_empresa_event):
        Cliente.objects.create(
            empresa=self.empresa,
            nombre="Cliente Existente",
            username="clienteexistente",
            contacto="5491111111111",
            codigo="123456",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "manual_create": True,
                "confirm_existing_code": True,
                "codigo": "123456",
                "nombre": "Cliente Nuevo",
                "username": "clientenuevo",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Cliente.objects.count(), 2)
        self.assertNotEqual(response.data["codigo"], "123456")

    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.servicios.eventos.enviar_evento_meta")
    def test_deduplica_leads_por_mismo_fbp_fbc(self, mock_enviar_evento_meta, mock_publish_empresa_event):
        payload_base = {
            "landing_token": str(self.landing.token),
            "contacto": "",
            "fbp": "fb.1.123456789.shared",
            "fbc": "fb.1.123456789.sharedclick",
        }

        response_1 = self.client.post(
            "/clientes/",
            {
                **payload_base,
                "idempotency_key": str(uuid.uuid4()),
                "nombre": "Juan Uno",
                "username": "juanuno",
                "codigo": "123456",
            },
            format="json",
        )
        response_2 = self.client.post(
            "/clientes/",
            {
                **payload_base,
                "idempotency_key": str(uuid.uuid4()),
                "nombre": "Juan Dos",
                "username": "juandos",
                "codigo": "654321",
            },
            format="json",
        )

        self.assertEqual(response_1.status_code, 201)
        self.assertEqual(response_2.status_code, 200)
        self.assertEqual(Cliente.objects.count(), 1)
        self.assertEqual(EventosMeta.objects.filter(tipo="lead").count(), 2)
        self.assertEqual(response_1.data["id"], response_2.data["id"])
        evento_dedup = EventosMeta.objects.filter(tipo="lead").order_by("-id").first()
        self.assertEqual(evento_dedup.data.get("resultado"), "deduplicado_lead")
        self.assertEqual(evento_dedup.data.get("codigo_solicitado"), "654321")
        self.assertEqual(evento_dedup.data.get("codigo_final"), "123456")
        self.assertEqual(evento_dedup.data.get("request_fbp"), "fb.1.123456789.shared")
        self.assertEqual(evento_dedup.data.get("request_fbc"), "fb.1.123456789.sharedclick")
        self.assertEqual(evento_dedup.data.get("dedup_matched_by"), "lead_fbp")
        self.assertEqual(evento_dedup.data.get("dedup_matched_value"), "fb.1.123456789.shared")

    @override_settings(
        LANDING_LEAD_DEDUP_MINUTES=0,
        LANDING_CLIENT_FINGERPRINT_DEDUP_DAYS=7,
    )
    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.servicios.eventos.enviar_evento_meta")
    def test_deduplica_cliente_por_fingerprint_meta_en_7_dias_y_completa_datos(
        self,
        mock_enviar_evento_meta,
        mock_publish_empresa_event,
    ):
        response_1 = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "idempotency_key": str(uuid.uuid4()),
                "fbp": "fb.1.meta.shared",
                "event_source_url": "https://app.control-ar.com/landing",
                "nombre": "",
                "contacto": "",
                "username": "",
                "codigo": "345678",
            },
            format="json",
            HTTP_USER_AGENT="Instagram-UA-1",
        )
        response_2 = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "idempotency_key": str(uuid.uuid4()),
                "fbp": "fb.1.meta.shared",
                "fbc": "fb.1.meta.click",
                "fbclid": "fbclid-1",
                "event_source_url": "https://app.control-ar.com/landing",
                "utm_source": "ig",
                "utm_medium": "paid",
                "nombre": "Luis Norberto Dechat",
                "contacto": "5493772454143",
                "username": "norberto",
                "codigo": "876543",
            },
            format="json",
            HTTP_USER_AGENT="Instagram-UA-1",
            REMOTE_ADDR="181.9.213.220",
        )

        self.assertEqual(response_1.status_code, 201)
        self.assertEqual(response_2.status_code, 200)
        self.assertEqual(Cliente.objects.count(), 1)
        self.assertEqual(EventosMeta.objects.filter(tipo="lead").count(), 2)
        self.assertEqual(response_1.data["id"], response_2.data["id"])

        cliente = Cliente.objects.get(id=response_1.data["id"])
        self.assertEqual(cliente.nombre, "Luis Norberto Dechat")
        self.assertEqual(cliente.contacto, "5493772454143")
        self.assertEqual(cliente.username, "norberto")
        self.assertEqual(cliente.fbc, "fb.1.meta.click")
        self.assertEqual(cliente.fbclid, "fbclid-1")
        self.assertEqual(cliente.utm_source, "ig")
        self.assertEqual(cliente.utm_medium, "paid")
        self.assertEqual(cliente.ip_address, "181.9.213.220")
        evento_dedup = EventosMeta.objects.filter(tipo="lead").order_by("-id").first()
        self.assertEqual(evento_dedup.data.get("resultado"), "deduplicado_fingerprint")
        self.assertEqual(evento_dedup.data.get("codigo_solicitado"), "876543")
        self.assertEqual(evento_dedup.data.get("codigo_final"), "345678")
        self.assertEqual(evento_dedup.data.get("request_fbp"), "fb.1.meta.shared")
        self.assertEqual(evento_dedup.data.get("request_fbc"), "fb.1.meta.click")
        self.assertEqual(evento_dedup.data.get("request_event_source_url"), "https://app.control-ar.com/landing")
        self.assertEqual(evento_dedup.data.get("request_ip"), "181.9.213.220")
        self.assertEqual(evento_dedup.data.get("request_user_agent"), "Instagram-UA-1")
        self.assertEqual(evento_dedup.data.get("dedup_matched_by"), "fingerprint_fbp")
        self.assertEqual(evento_dedup.data.get("dedup_matched_value"), "fb.1.meta.shared")


class LandingWhatsappRotationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.empresa = Empresa.objects.create(nombre="Empresa WA", codigo_prefijo="EW")
        self.landing = Landing.objects.create(
            empresa=self.empresa,
            nombre="Landing WA",
            url="https://example.com/landing-wa",
            activo=True,
            mostrar_formulario=True,
        )

    def test_rotacion_con_una_sola_linea_devuelve_la_misma_en_peek_y_consume(self):
        linea = WhatsApp.objects.create(
            empresa=self.empresa,
            numero="5491122334455",
            activo=True,
        )

        peek_response = self.client.get(
            "/landings/whatsapp-rotacion/",
            {"landing_token": str(self.landing.token)},
        )
        self.assertEqual(peek_response.status_code, 200)
        self.assertEqual(peek_response.data["numero"], "5491122334455")

        linea.refresh_from_db()
        self.assertIsNone(linea.ultimo_uso)

        consume_response = self.client.post(
            "/landings/whatsapp-rotacion/consume/",
            {"landing_token": str(self.landing.token)},
            format="json",
        )
        self.assertEqual(consume_response.status_code, 200)
        self.assertEqual(consume_response.data["numero"], "5491122334455")
        self.assertEqual(consume_response.data["siguiente_numero"], "5491122334455")

        linea.refresh_from_db()
        self.assertIsNotNone(linea.ultimo_uso)

    @override_settings(
        LANDING_LEAD_DEDUP_MINUTES=0,
        LANDING_CLIENT_FINGERPRINT_DEDUP_DAYS=7,
    )
    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.servicios.eventos.enviar_evento_meta")
    def test_no_deduplica_fingerprint_meta_fuera_de_ventana(
        self,
        mock_enviar_evento_meta,
        mock_publish_empresa_event,
    ):
        cliente = Cliente.objects.create(
            empresa=self.empresa,
            nombre="Cliente Viejo",
            contacto="5491111111111",
            username="clienteviejo",
            codigo="112233",
            fbp="fb.1.meta.shared",
            event_source_url="https://app.control-ar.com/landing",
            user_agent="Instagram-UA-2",
        )
        Cliente.objects.filter(id=cliente.id).update(
            creado_en=timezone.now() - timedelta(days=8),
            first_touch_at=timezone.now() - timedelta(days=8),
        )

        response = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "idempotency_key": str(uuid.uuid4()),
                "fbp": "fb.1.meta.shared",
                "event_source_url": "https://app.control-ar.com/landing",
                "nombre": "Cliente Nuevo",
                "contacto": "5492222222222",
                "username": "clientenuevo",
                "codigo": "445566",
            },
            format="json",
            HTTP_USER_AGENT="Instagram-UA-2",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Cliente.objects.count(), 2)
        self.assertEqual(EventosMeta.objects.filter(tipo="lead").count(), 1)


class EventosMetaDiscardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.empresa = Empresa.objects.create(nombre="Empresa Test")
        self.landing = Landing.objects.create(
            empresa=self.empresa,
            nombre="Landing Test",
            url="https://example.com/landing",
            activo=True,
            mostrar_formulario=True,
        )
        self.user = get_user_model().objects.create_superuser(
            username="operadortest2",
            password="secret123",
            email="operadortest2@example.com",
        )
        self.cliente = Cliente.objects.create(
            empresa=self.empresa,
            nombre="Lead Test",
            username="leadtest",
            codigo="112244",
        )
        self.evento = EventosMeta.objects.create(
            cliente=self.cliente,
            empresa=self.empresa,
            landing=self.landing,
            operador=None,
            tipo="lead",
            data={"resultado": "creado"},
        )

    @patch("apps.operativo.views.publish_empresa_event")
    def test_descartar_lead_guarda_motivo_y_auditoria(self, mock_publish_empresa_event):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/eventos-meta/{self.evento.id}/discard-lead/",
            {"reason": "duplicado", "detail": "Detectado manualmente"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.evento.refresh_from_db()
        self.assertTrue(self.evento.data.get("lead_discarded"))
        self.assertEqual(self.evento.data.get("lead_discard_reason"), "duplicado")
        self.assertEqual(self.evento.data.get("lead_discard_detail"), "Detectado manualmente")
        self.assertEqual(self.evento.data.get("lead_discarded_by_username"), "operadortest")

    def test_descartar_duplicado_exige_cliente_destino(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/eventos-meta/{self.evento.id}/discard-lead/",
            {"reason": "duplicado"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("duplicate_of_cliente_id", response.data)

    @patch("apps.operativo.views.publish_empresa_event")
    def test_descartar_duplicado_guarda_cliente_relacionado(self, mock_publish_empresa_event):
        duplicate_cliente = Cliente.objects.create(
            empresa=self.empresa,
            nombre="Cliente Real",
            username="clientereal",
            codigo="665544",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/eventos-meta/{self.evento.id}/discard-lead/",
            {"reason": "duplicado", "duplicate_of_cliente_id": duplicate_cliente.id},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.evento.refresh_from_db()
        self.assertEqual(self.evento.data.get("lead_duplicate_of_cliente_id"), duplicate_cliente.id)
        self.assertEqual(self.evento.data.get("lead_duplicate_of_codigo"), "665544")

    def test_sin_contacto_excluye_leads_descartados(self):
        self.evento.data = {
            "resultado": "creado",
            "lead_discarded": True,
            "lead_discard_reason": "duplicado",
        }
        self.evento.save(update_fields=["data"])
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/eventos-meta/?tipo=lead&sin_contacto=1")

        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.data]
        self.assertNotIn(self.evento.id, ids)

    def test_sin_contacto_incluye_leads_no_descartados_sin_flag(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/eventos-meta/?tipo=lead&sin_contacto=1")

        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.data]
        self.assertIn(self.evento.id, ids)

    @override_settings(
        LANDING_LEAD_DEDUP_MINUTES=0,
        LANDING_CLIENT_FINGERPRINT_DEDUP_DAYS=7,
    )
    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.servicios.eventos.enviar_evento_meta")
    def test_deduplica_por_mismo_dispositivo_ip_y_origen_aunque_cambie_fbp(
        self,
        mock_enviar_evento_meta,
        mock_publish_empresa_event,
    ):
        response_1 = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "idempotency_key": str(uuid.uuid4()),
                "fbp": "fb.1.meta.old",
                "event_source_url": "https://app.control-ar.com/landing",
                "contacto": "5493754527821",
                "username": "915",
                "codigo": "267915",
            },
            format="json",
            HTTP_USER_AGENT="Mozilla/5.0 Test Device",
            REMOTE_ADDR="179.63.35.162",
        )
        response_2 = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "idempotency_key": str(uuid.uuid4()),
                "fbp": "fb.1.meta.new",
                "event_source_url": "https://app.control-ar.com/landing",
                "username": "lead122",
                "codigo": "144122",
            },
            format="json",
            HTTP_USER_AGENT="Mozilla/5.0 Test Device",
            REMOTE_ADDR="179.63.35.162",
        )

        self.assertEqual(response_1.status_code, 201)
        self.assertEqual(response_2.status_code, 200)
        self.assertEqual(Cliente.objects.count(), 1)
        self.assertEqual(EventosMeta.objects.filter(tipo="lead").count(), 2)
        self.assertEqual(response_1.data["id"], response_2.data["id"])

    @patch("apps.operativo.views.publish_empresa_event", side_effect=RuntimeError("redis caido"))
    @patch("apps.operativo.servicios.eventos.enviar_evento_meta")
    def test_create_no_falla_si_realtime_explota(self, mock_enviar_evento_meta, mock_publish_empresa_event):
        response = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "idempotency_key": str(uuid.uuid4()),
                "nombre": "Lead Realtime",
                "username": "leadrealtime",
                "codigo": "555555",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Cliente.objects.count(), 1)
        self.assertEqual(EventosMeta.objects.filter(tipo="lead").count(), 1)
        self.assertEqual(response.data["cant_retiros"], 0)
        self.assertEqual(response.data["total_bonos_ars"], "0.00")
        self.assertEqual(response.data["total_retiros_usd"], "0.00")

    @override_settings(
        CORS_ALLOWED_ORIGINS=["https://app.control-ar.com"],
        CORS_ALLOW_CREDENTIALS=True,
    )
    def test_options_clientes_devuelve_cors_credentials(self):
        response = self.client.options(
            "/clientes/",
            HTTP_ORIGIN="https://app.control-ar.com",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Access-Control-Allow-Origin"], "https://app.control-ar.com")
        self.assertEqual(response["Access-Control-Allow-Credentials"], "true")

    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.servicios.eventos.enviar_evento_meta")
    def test_deduplica_leads_por_misma_ip_y_user_agent(self, mock_enviar_evento_meta, mock_publish_empresa_event):
        response_1 = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "idempotency_key": str(uuid.uuid4()),
                "nombre": "Maria Uno",
                "username": "mariauno",
                "codigo": "111111",
            },
            format="json",
            REMOTE_ADDR="10.0.0.1",
            HTTP_USER_AGENT="UA-Test-1",
        )
        response_2 = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "idempotency_key": str(uuid.uuid4()),
                "nombre": "Maria Dos",
                "username": "mariados",
                "codigo": "222222",
            },
            format="json",
            REMOTE_ADDR="10.0.0.1",
            HTTP_USER_AGENT="UA-Test-1",
        )

        self.assertEqual(response_1.status_code, 201)
        self.assertEqual(response_2.status_code, 200)
        self.assertEqual(Cliente.objects.count(), 1)
        self.assertEqual(EventosMeta.objects.filter(tipo="lead").count(), 2)
        self.assertEqual(response_1.data["id"], response_2.data["id"])

    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.servicios.eventos.enviar_evento_meta")
    def test_deduplica_leads_por_mismo_telefono(self, mock_enviar_evento_meta, mock_publish_empresa_event):
        response_1 = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "idempotency_key": str(uuid.uuid4()),
                "contacto": "5491122334455",
                "username": "telefono1",
                "codigo": "333333",
            },
            format="json",
        )
        response_2 = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "idempotency_key": str(uuid.uuid4()),
                "contacto": "54 9 11 2233-4455",
                "username": "telefono2",
                "codigo": "444444",
            },
            format="json",
        )

        self.assertEqual(response_1.status_code, 201)
        self.assertEqual(response_2.status_code, 200)
        self.assertEqual(Cliente.objects.count(), 1)
        self.assertEqual(EventosMeta.objects.filter(tipo="lead").count(), 2)
        self.assertEqual(response_1.data["id"], response_2.data["id"])

    @override_settings(
        LANDING_LEAD_DEDUP_MINUTES=0,
        LANDING_CLIENT_FINGERPRINT_DEDUP_DAYS=7,
    )
    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.servicios.eventos.enviar_evento_meta")
    def test_no_duplica_eventos_deduplicados_identicos_en_ventana_corta(
        self,
        mock_enviar_evento_meta,
        mock_publish_empresa_event,
    ):
        response_1 = self.client.post(
            "/clientes/",
            {
                "landing_token": str(self.landing.token),
                "idempotency_key": str(uuid.uuid4()),
                "fbp": "fb.1.meta.shared",
                "event_source_url": "https://app.control-ar.com/landing",
                "codigo": "345678",
            },
            format="json",
            HTTP_USER_AGENT="Instagram-UA-1",
            REMOTE_ADDR="181.9.213.220",
        )
        duplicate_payload = {
            "landing_token": str(self.landing.token),
            "fbp": "fb.1.meta.shared",
            "event_source_url": "https://app.control-ar.com/landing",
            "codigo": "876543",
        }
        response_2 = self.client.post(
            "/clientes/",
            {
                **duplicate_payload,
                "idempotency_key": str(uuid.uuid4()),
            },
            format="json",
            HTTP_USER_AGENT="Instagram-UA-1",
            REMOTE_ADDR="181.9.213.220",
        )
        response_3 = self.client.post(
            "/clientes/",
            {
                **duplicate_payload,
                "idempotency_key": str(uuid.uuid4()),
            },
            format="json",
            HTTP_USER_AGENT="Instagram-UA-1",
            REMOTE_ADDR="181.9.213.220",
        )

        self.assertEqual(response_1.status_code, 201)
        self.assertEqual(response_2.status_code, 200)
        self.assertEqual(response_3.status_code, 200)
        self.assertEqual(Cliente.objects.count(), 1)
        self.assertEqual(EventosMeta.objects.filter(tipo="lead").count(), 2)


class MetaCapiUrlTests(TestCase):
    def test_capi_url_no_expone_access_token(self):
        url = _build_capi_url("123456", test_event_code="TEST123")
        headers = _build_capi_headers("secret-token")

        self.assertEqual(url, "https://graph.facebook.com/v18.0/123456/events?test_event_code=TEST123")
        self.assertNotIn("secret-token", url)
        self.assertEqual(headers["Authorization"], "Bearer secret-token")


class EventosMetaTestEventWhatsAppTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.empresa = Empresa.objects.create(nombre="Empresa WA Test", codigo_prefijo="WT")
        self.user = get_user_model().objects.create_superuser(
            username="admin-wa-test",
            password="test123",
            email="admin-wa-test@example.com",
        )
        self.client.force_authenticate(user=self.user)
        WhatsAppConfig.objects.create(
            empresa=self.empresa,
            phone_number_id="phone-test",
            waba_id="waba-test-1",
            activo=True,
        )

    @override_settings(SECURE_SSL_REDIRECT=False)
    @patch("apps.operativo.servicios.eventos.enviar_evento_meta", return_value={"ok": True})
    def test_test_event_whatsapp_crea_lead_business_messaging(self, mock_enviar_evento_meta):
        response = self.client.post(
            "/eventos-meta/test-event/",
            {
                "tipo": "lead",
                "fuente": "whatsapp",
                "empresa_id": self.empresa.id,
                "test_event_code": "TEST123",
                "phone": "5491122334455",
                "nombre": "Lead WhatsApp Test",
                "ctwa_clid": "ctwa-test-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        evento = EventosMeta.objects.get(tipo="lead", fuente="whatsapp")
        self.assertEqual(evento.empresa, self.empresa)
        self.assertIsNone(evento.landing)
        self.assertEqual(evento.ctwa_clid, "ctwa-test-123")
        self.assertEqual(evento.data["ctwa_clid"], "ctwa-test-123")
        self.assertEqual(evento.data["waba_id"], "waba-test-1")
        self.assertEqual(evento.data["action_source"], "business_messaging")
        self.assertEqual(evento.data["messaging_channel"], "whatsapp")
        self.assertEqual(evento.cliente.origen, "whatsapp")
        self.assertEqual(evento.cliente.wa_phone, "5491122334455")
        mock_enviar_evento_meta.assert_called_once()
        self.assertEqual(mock_enviar_evento_meta.call_args.kwargs["test_event_code"], "TEST123")


class CompraReconciliacionTests(TestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Empresa Test", codigo_prefijo="ET")
        self.user = get_user_model().objects.create_superuser(
            username="operadortest2",
            password="secret123",
            email="operadortest2@example.com",
        )
        self.cliente = Cliente.objects.create(
            empresa=self.empresa,
            nombre="Cliente Compra",
            codigo="ET12AB34",
            cant_compras=99,
            total_compras_ars=Decimal("999.00"),
            total_compras_usd=Decimal("9.99"),
        )
        self.tc = TipoCambio.objects.create(
            moneda_origen="ARS",
            moneda_destino="USD",
            valor=Decimal("1000.0000"),
        )

    def test_reconcilia_agregados_desde_compras(self):
        Compra.objects.create(
            cliente=self.cliente,
            empresa=self.empresa,
            operador=self.user,
            monto_ars=Decimal("1000.00"),
            monto_usd=Decimal("1.00"),
            tc=self.tc.valor,
            tipo_cambio=self.tc,
        )
        Compra.objects.create(
            cliente=self.cliente,
            empresa=self.empresa,
            operador=self.user,
            monto_ars=Decimal("2500.00"),
            monto_usd=Decimal("2.50"),
            tc=self.tc.valor,
            tipo_cambio=self.tc,
        )

        result = reconciliar_cliente_compras(self.cliente)
        self.cliente.refresh_from_db()

        self.assertTrue(result["changed"])
        self.assertEqual(self.cliente.cant_compras, 2)
        self.assertEqual(self.cliente.total_compras_ars, Decimal("3500.00"))
        self.assertEqual(self.cliente.total_compras_usd, Decimal("3.50"))
