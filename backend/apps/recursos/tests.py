from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient

from apps.empresas.models import Empresa
from apps.recursos.models import WhatsApp


class WhatsAppViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_model = get_user_model()
        self.operador_group, _ = Group.objects.get_or_create(name="Operador")
        self.empresa = Empresa.objects.create(nombre="Empresa Test")
        self.otra_empresa = Empresa.objects.create(nombre="Otra Empresa")
        self.user = self.user_model.objects.create_user(
            username="operador",
            password="test1234",
            empresa=self.empresa,
        )
        self.user.groups.add(self.operador_group)
        self.client.force_authenticate(self.user)

    @patch("apps.recursos.views.crear_notificacion_estructural")
    def test_create_whatsapp_uses_user_empresa_when_request_omits_it(self, mock_notificacion):
        response = self.client.post(
            "/whatsapps/",
            {
                "numero": "1168597657",
                "activo": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(WhatsApp.objects.count(), 1)
        whatsapp = WhatsApp.objects.get()
        self.assertEqual(whatsapp.empresa_id, self.empresa.id)
        self.assertEqual(whatsapp.numero, "5491168597657")
        mock_notificacion.assert_called_once()

    def test_create_whatsapp_rejects_empresa_without_access(self):
        response = self.client.post(
            "/whatsapps/",
            {
                "numero": "1168597657",
                "activo": True,
                "empresa": self.otra_empresa.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["empresa"][0], "No tenes acceso a la empresa seleccionada.")
        self.assertEqual(WhatsApp.objects.count(), 0)
