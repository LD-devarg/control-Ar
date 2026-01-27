from decimal import Decimal, InvalidOperation

from apps.recursos.models import TipoCambio


def obtener_tc_vigente():
    return (
        TipoCambio.objects.filter(vigente_hasta__isnull=True)
        .order_by("-vigente_desde", "-creado_en")
        .first()
    )


def calcular_compra(monto_ars):
    try:
        monto = Decimal(str(monto_ars))
    except (InvalidOperation, TypeError):
        raise ValueError("monto_ars invalido")

    tc = obtener_tc_vigente()
    if not tc or tc.valor is None:
        raise ValueError("No hay tipo de cambio vigente")

    monto_usd = (monto / tc.valor).quantize(Decimal("0.01"))
    return tc, tc.valor, monto_usd
