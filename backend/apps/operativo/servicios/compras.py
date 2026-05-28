from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Sum

from apps.operativo.models import Cliente, Compra
from apps.operativo.servicios.calculos import calcular_compra


@dataclass(frozen=True)
class CompraCreada:
    compra: Compra
    cliente: Cliente
    was_first_purchase: bool


def crear_compra_con_agregados(
    *,
    cliente: Cliente,
    operador,
    monto_ars,
    bono_ars,
    comprobante=None,
    comprobante_archivo=None,
    ocurrido_en=None,
) -> CompraCreada:
    with transaction.atomic():
        cliente = Cliente.objects.select_for_update().get(pk=cliente.pk)
        was_first_purchase = cliente.cant_compras == 0
        tc_obj, tc_valor, monto_usd = calcular_compra(monto_ars)
        _, _, bono_usd = calcular_compra(bono_ars) if bono_ars else (None, None, 0)
        compra = Compra.objects.create(
            cliente=cliente,
            empresa=cliente.empresa,
            operador=operador,
            monto_ars=monto_ars,
            bono_ars=bono_ars,
            bono_usd=bono_usd,
            comprobante=comprobante,
            comprobante_archivo=comprobante_archivo,
            tc=tc_valor,
            monto_usd=monto_usd,
            tipo_cambio=tc_obj,
            ocurrido_en=ocurrido_en,
        )

        cliente.cant_compras += 1
        cliente.total_compras_ars = (cliente.total_compras_ars or 0) + monto_ars
        cliente.total_compras_usd = (cliente.total_compras_usd or 0) + monto_usd
        cliente.save(update_fields=["cant_compras", "total_compras_ars", "total_compras_usd"])

    return CompraCreada(compra=compra, cliente=cliente, was_first_purchase=was_first_purchase)


def reconciliar_cliente_compras(cliente: Cliente) -> dict:
    agregados = cliente.compras.aggregate(
        cant=Count("id"),
        total_ars=Sum("monto_ars"),
        total_usd=Sum("monto_usd"),
    )
    expected = {
        "cant_compras": int(agregados["cant"] or 0),
        "total_compras_ars": agregados["total_ars"] or Decimal("0"),
        "total_compras_usd": agregados["total_usd"] or Decimal("0"),
    }
    before = {
        "cant_compras": cliente.cant_compras,
        "total_compras_ars": cliente.total_compras_ars,
        "total_compras_usd": cliente.total_compras_usd,
    }
    changed = before != expected
    if changed:
        cliente.cant_compras = expected["cant_compras"]
        cliente.total_compras_ars = expected["total_compras_ars"]
        cliente.total_compras_usd = expected["total_compras_usd"]
        cliente.save(update_fields=["cant_compras", "total_compras_ars", "total_compras_usd"])
    return {"cliente_id": cliente.id, "changed": changed, "before": before, "after": expected}
