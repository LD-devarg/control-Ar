from __future__ import annotations

import base64
import os

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Genera una clave Fernet y la imprime en stdout."

    def handle(self, *args, **options):
        key = base64.urlsafe_b64encode(os.urandom(32)).decode("utf-8")
        self.stdout.write(key)
