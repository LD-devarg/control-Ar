from __future__ import annotations

from django.db.models import Q

from apps.pauta.models import CredencialesMeta, CuentaPublicitaria
from apps.pauta.servicios.crypto import decrypt_token


def credenciales_queryset_for_empresa(*, empresa_id: int):
    return (
        CredencialesMeta.objects.filter(Q(empresa_id=empresa_id) | Q(empresas__id=empresa_id))
        .distinct()
        .order_by("id")
    )


def credencial_aplica_a_empresa(credencial: CredencialesMeta, empresa_id: int) -> bool:
    if not credencial or not empresa_id:
        return False
    if credencial.empresa_id == empresa_id:
        return True

    prefetched = getattr(credencial, "_prefetched_objects_cache", {})
    empresas = prefetched.get("empresas")
    if empresas is not None:
        return any(getattr(item, "id", None) == empresa_id for item in empresas)
    return credencial.empresas.filter(id=empresa_id).exists()


def credenciales_ordenadas_para_empresa(
    *,
    empresa_id: int,
    cuenta: CuentaPublicitaria | None = None,
) -> list[CredencialesMeta]:
    creds = list(credenciales_queryset_for_empresa(empresa_id=empresa_id).only("id", "bm_id", "empresa_id", "token_acceso_encrypted"))
    if not cuenta:
        return creds

    same_bm = [cred for cred in creds if cred.bm_id == cuenta.bm_id]
    other = [cred for cred in creds if cred.bm_id != cuenta.bm_id]
    return same_bm + other


def credencial_principal_para_empresa(
    *,
    empresa_id: int,
    cuenta: CuentaPublicitaria | None = None,
) -> CredencialesMeta | None:
    ordered = credenciales_ordenadas_para_empresa(empresa_id=empresa_id, cuenta=cuenta)
    return ordered[0] if ordered else None


def tokens_para_empresa(
    *,
    empresa_id: int,
    cuenta: CuentaPublicitaria | None = None,
) -> list[str]:
    tokens: list[str] = []
    seen: set[str] = set()
    for cred in credenciales_ordenadas_para_empresa(empresa_id=empresa_id, cuenta=cuenta):
        try:
            token = decrypt_token(cred.token_acceso_encrypted)
        except Exception:
            continue
        token = str(token or "").strip()
        if not token or token in seen:
            continue
        seen.add(token)
        tokens.append(token)
    return tokens
