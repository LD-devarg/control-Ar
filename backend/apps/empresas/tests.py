from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.empresas.models import Empresa, Usuario


class LoggedTokenObtainPairViewTests(APITestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Empresa Test")
        self.user = Usuario.objects.create_user(
            username="operador",
            password="Secreto123!",
            empresa=self.empresa,
        )

    @patch("apps.empresas.auth_views.create_login_notification.delay")
    def test_login_still_succeeds_when_notification_enqueue_fails(self, mock_delay):
        mock_delay.side_effect = RuntimeError("broker down")

        response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "operador", "password": "Secreto123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        mock_delay.assert_called_once_with(self.user.id)
