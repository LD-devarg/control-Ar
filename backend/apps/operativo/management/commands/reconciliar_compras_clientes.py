from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.operativo.models import Cliente
from apps.operativo.servicios.compras import reconciliar_cliente_compras


class Command(BaseCommand):
    help = "Recalcula cant_compras y totales denormalizados de Cliente desde Compra."

    def add_arguments(self, parser):
        parser.add_argument("--empresa-id", type=int, dest="empresa_id")

    def handle(self, *args, **options):
        qs = Cliente.objects.all().order_by("id")
        if options.get("empresa_id"):
            qs = qs.filter(empresa_id=options["empresa_id"])

        scanned = changed = 0
        for cliente in qs.iterator():
            scanned += 1
            result = reconciliar_cliente_compras(cliente)
            if result["changed"]:
                changed += 1

        self.stdout.write(self.style.SUCCESS(f"Clientes revisados: {scanned}; corregidos: {changed}"))
