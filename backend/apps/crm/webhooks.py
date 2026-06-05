import hashlib
import hmac

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from .models import WhatsAppConfig
from .tasks import procesar_evento_whatsapp


def _settings_whatsapp(name: str, default: str = "") -> str:
    return str(getattr(settings, "WHATSAPP", {}).get(name) or default).strip()


def _secretos_app_activos() -> set[str]:
    secrets = set(
        WhatsAppConfig.objects.filter(activo=True)
        .exclude(app_secret="")
        .values_list("app_secret", flat=True)
    )
    fallback = _settings_whatsapp("APP_SECRET")
    if fallback:
        secrets.add(fallback)
    return {str(secret).strip() for secret in secrets if str(secret).strip()}


class WhatsAppWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        mode = request.GET.get("hub.mode")
        token = request.GET.get("hub.verify_token")
        challenge = request.GET.get("hub.challenge")
        valid_tokens = set(
            WhatsAppConfig.objects.filter(activo=True)
            .exclude(verify_token="")
            .values_list("verify_token", flat=True)
        )
        fallback = _settings_whatsapp("VERIFY_TOKEN")
        if fallback:
            valid_tokens.add(fallback)
        if mode == "subscribe" and token in valid_tokens:
            return HttpResponse(challenge, content_type="text/plain")
        return HttpResponse("forbidden", status=403)

    def _validate_signature(self, request):
        app_secrets = _secretos_app_activos()
        if not app_secrets:
            return True
        header = request.headers.get("X-Hub-Signature-256", "")
        for app_secret in app_secrets:
            expected = "sha256=" + hmac.new(app_secret.encode("utf-8"), request.body, hashlib.sha256).hexdigest()
            if hmac.compare_digest(header, expected):
                return True
        return False

    def post(self, request):
        if not self._validate_signature(request):
            return JsonResponse({"detail": "invalid signature"}, status=403)
        procesar_evento_whatsapp.delay(request.data)
        return JsonResponse({"status": "received"}, status=200)
