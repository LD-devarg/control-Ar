import uuid
from unittest.mock import patch

from django.test import TestCase
from django.test.utils import override_settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from datetime import timedelta

from apps.empresas.models import Empresa
from apps.operativo.models import Cliente, EventosMeta, Landing


class ClienteCreateTests(TestCase):
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
        self.user = get_user_model().objects.create_user(username="operadortest", password="secret123")

    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.views.enviar_evento_meta")
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
    @patch("apps.operativo.views.enviar_evento_meta")
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
    @patch("apps.operativo.views.enviar_evento_meta")
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

    @override_settings(
        LANDING_LEAD_DEDUP_MINUTES=0,
        LANDING_CLIENT_FINGERPRINT_DEDUP_DAYS=7,
    )
    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.views.enviar_evento_meta")
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

    @override_settings(
        LANDING_LEAD_DEDUP_MINUTES=0,
        LANDING_CLIENT_FINGERPRINT_DEDUP_DAYS=7,
    )
    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.views.enviar_evento_meta")
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

    @override_settings(
        LANDING_LEAD_DEDUP_MINUTES=0,
        LANDING_CLIENT_FINGERPRINT_DEDUP_DAYS=7,
    )
    @patch("apps.operativo.views.publish_empresa_event")
    @patch("apps.operativo.views.enviar_evento_meta")
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
    @patch("apps.operativo.views.enviar_evento_meta")
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
    @patch("apps.operativo.views.enviar_evento_meta")
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
    @patch("apps.operativo.views.enviar_evento_meta")
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
    @patch("apps.operativo.views.enviar_evento_meta")
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
