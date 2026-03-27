import logging

from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.empresas.models import Usuario
from apps.empresas.tasks import create_login_notification

logger = logging.getLogger(__name__)


class LoggedTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code != 200:
            return response

        username = request.data.get("username")
        if not username:
            return response

        user = Usuario.objects.select_related("empresa").filter(username=username).first()
        if not user:
            return response

        try:
            create_login_notification.delay(user.id)
        except Exception:
            logger.exception(
                "No se pudo encolar la notificacion de login para user_id=%s",
                user.id,
            )
        return response
