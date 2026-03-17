import uuid
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

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
        self.assertEqual(EventosMeta.objects.filter(tipo="lead").count(), 1)
        self.assertEqual(response_1.data["id"], response_2.data["id"])

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
        self.assertEqual(EventosMeta.objects.filter(tipo="lead").count(), 1)
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
        self.assertEqual(EventosMeta.objects.filter(tipo="lead").count(), 1)
        self.assertEqual(response_1.data["id"], response_2.data["id"])
