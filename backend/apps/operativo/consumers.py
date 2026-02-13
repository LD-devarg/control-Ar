from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from apps.empresas.permissions import is_admin, is_operador, is_pauta
from .realtime import empresa_group_name


class EmpresaRealtimeConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        token = self._get_token_from_query_string()
        if not token:
            await self.close(code=4401)
            return

        user = await self._authenticate_user(token)
        if not user or not user.is_authenticated or not user.empresa_id:
            await self.close(code=4403)
            return
        if not (user.is_superuser or is_admin(user) or is_operador(user) or is_pauta(user)):
            await self.close(code=4403)
            return

        self.user = user
        self.group_name = empresa_group_name(user.empresa_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if getattr(self, "group_name", None):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def realtime_event(self, event):
        await self.send_json(
            {
                "type": event.get("event_type"),
                "payload": event.get("payload", {}),
            }
        )

    def _get_token_from_query_string(self):
        raw_query = self.scope.get("query_string", b"").decode()
        query = parse_qs(raw_query)
        return (query.get("token") or [None])[0]

    @database_sync_to_async
    def _authenticate_user(self, raw_token):
        try:
            auth = JWTAuthentication()
            validated_token = auth.get_validated_token(raw_token)
            return auth.get_user(validated_token)
        except (InvalidToken, TokenError):
            return None
