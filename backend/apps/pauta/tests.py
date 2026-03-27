from django.test import TestCase

from apps.empresas.models import Empresa, Organizacion
from apps.pauta.models import BM, CredencialesMeta, CuentaPublicitaria
from apps.pauta.servicios.credenciales import credencial_principal_para_empresa
from apps.pauta.servicios.crypto import encrypt_token


class CredencialesCompartidasTests(TestCase):
    def setUp(self):
        self.org = Organizacion.objects.create(nombre="Org Test")
        self.empresa_a = Empresa.objects.create(nombre="Empresa A", organizacion=self.org)
        self.empresa_b = Empresa.objects.create(nombre="Empresa B", organizacion=self.org)
        self.bm_a = BM.objects.create(
            organizacion=self.org,
            meta_id="bm-a",
            nombre="BM A",
            estado="ACTIVE",
        )
        self.bm_a.empresas.set([self.empresa_a, self.empresa_b])
        self.bm_b = BM.objects.create(
            organizacion=self.org,
            meta_id="bm-b",
            nombre="BM B",
            estado="ACTIVE",
        )
        self.bm_b.empresas.set([self.empresa_b])

    def test_shared_credential_is_available_for_secondary_empresa(self):
        cred = CredencialesMeta.objects.create(
            empresa=self.empresa_a,
            bm=self.bm_a,
            nombre="Compartida",
            pixel_id="123",
            token_acceso_encrypted=encrypt_token("token-a"),
        )
        cred.empresas.set([self.empresa_a, self.empresa_b])

        resolved = credencial_principal_para_empresa(empresa_id=self.empresa_b.id)

        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.id, cred.id)

    def test_same_bm_credential_has_priority_for_account_selection(self):
        cred_general = CredencialesMeta.objects.create(
            empresa=self.empresa_b,
            bm=self.bm_a,
            nombre="General",
            pixel_id="111",
            token_acceso_encrypted=encrypt_token("token-general"),
        )
        cred_general.empresas.set([self.empresa_b])

        cred_same_bm = CredencialesMeta.objects.create(
            empresa=self.empresa_b,
            bm=self.bm_b,
            nombre="BM especifico",
            pixel_id="222",
            token_acceso_encrypted=encrypt_token("token-bm"),
        )
        cred_same_bm.empresas.set([self.empresa_b])

        cuenta = CuentaPublicitaria.objects.create(
            empresa=self.empresa_b,
            bm=self.bm_b,
            meta_id="act_1",
            nombre="Cuenta B",
            estado="ACTIVE",
        )

        resolved = credencial_principal_para_empresa(
            empresa_id=self.empresa_b.id,
            cuenta=cuenta,
        )

        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.id, cred_same_bm.id)
