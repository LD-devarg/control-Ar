import { apiClient } from "../auth";
import { getEffectiveTenantId } from "../tenant";

export async function fetchWhatsapps() {
  const tenantId = getEffectiveTenantId();
  const { data } = await apiClient.get(`/whatsapps/`, {
    params: tenantId ? { empresa: tenantId } : undefined,
  });
  return data;
}

export async function createWhatsapp(numero) {
  const tenantId = getEffectiveTenantId();
  if (!tenantId) {
    throw new Error("Empresa no disponible para el contexto actual.");
  }
  const payload = {
    numero,
    activo: true,
    empresa: tenantId,
  };
  const { data } = await apiClient.post(`/whatsapps/`, payload);
  return data;
}

export async function deactivateWhatsapp(line) {
  const payload = {
    id: line.id,
    numero: line.numero,
    empresa: line.empresa,
    activo: false,
    ultimo_uso: line.ultimo_uso ?? null,
  };
  const { data } = await apiClient.put(`/whatsapps/${line.id}/`, payload);
  return data;
}
