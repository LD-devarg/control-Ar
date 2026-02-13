from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def empresa_group_name(empresa_id: int) -> str:
    return f"empresa_{empresa_id}"


def publish_empresa_event(empresa_id: int, event_type: str, payload: dict) -> None:
    channel_layer = get_channel_layer()
    if not channel_layer or not empresa_id:
        return
    async_to_sync(channel_layer.group_send)(
        empresa_group_name(empresa_id),
        {
            "type": "realtime.event",
            "event_type": event_type,
            "payload": payload,
        },
    )
