import { apiClient } from "../auth";
import { getEffectiveTenantId } from "../tenant";

export async function fetchUsuarios() {
  const tenantId = getEffectiveTenantId();
  const { data } = await apiClient.get("/usuarios/", {
    params: tenantId ? { empresa: tenantId } : undefined,
  });
  return data || [];
}

export async function fetchGrupos() {
  const { data } = await apiClient.get("/grupos/");
  return data || [];
}

export async function createUsuario(payload) {
  const tenantId = getEffectiveTenantId();
  const nextPayload =
    tenantId && payload?.empresa === undefined
      ? { ...payload, empresa: tenantId }
      : payload;
  const { data } = await apiClient.post("/usuarios/", nextPayload);
  return data;
}

export async function updateUsuario(id, payload) {
  const { data } = await apiClient.patch(`/usuarios/${id}/`, payload);
  return data;
}
