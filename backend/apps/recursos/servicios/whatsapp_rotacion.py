from datetime import datetime

from django.db import transaction
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.recursos.models import WhatsApp


def seleccionar_numero_whatsapp(empresa_id):
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

        numero.ultimo_uso = timezone.now()
        numero.save(update_fields=["ultimo_uso"])
        return numero.numero
