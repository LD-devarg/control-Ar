from datetime import datetime

from django.db import transaction
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.recursos.models import WhatsApp
from apps.recursos.serializers import normalizar_numero_whatsapp


def seleccionar_numero_whatsapp(empresa_id, *, consume=True):
    epoch = timezone.make_aware(datetime(1970, 1, 1))
    with transaction.atomic():
        numero = (
            WhatsApp.objects.select_for_update()
            .filter(empresa_id=empresa_id, activo=True)
            .order_by(Coalesce("ultimo_uso", epoch), "id")
            .first()
        )
        if not numero:
            raise ValueError("No hay lineas de WhatsApp activas para la empresa.")

        if consume:
            numero.ultimo_uso = timezone.now()
            numero.save(update_fields=["ultimo_uso"])
        return normalizar_numero_whatsapp(numero.numero)
