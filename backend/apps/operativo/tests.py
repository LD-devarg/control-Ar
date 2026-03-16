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
    def test_crea_dos_leads_distintos_aun_con_mismo_fbp_fbc(self, mock_enviar_evento_meta, mock_publish_empresa_event):
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
        self.assertEqual(response_2.status_code, 201)
        self.assertEqual(Cliente.objects.count(), 2)
        self.assertEqual(EventosMeta.objects.filter(tipo="lead").count(), 2)
        self.assertNotEqual(response_1.data["id"], response_2.data["id"])
