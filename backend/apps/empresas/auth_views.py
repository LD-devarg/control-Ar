from rest_framework_simplejwt.views import TokenObtainPairView

from apps.empresas.models import Usuario
from apps.empresas.notificaciones import crear_notificacion_estructural


class LoggedTokenObtainPairView(TokenObtainPairView):
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

        crear_notificacion_estructural(
            tipo="login",
            actor=user,
            empresa=user.empresa,
            mensaje=f"El operador {user.username} se logueo.",
            payload={},
        )
        return response
