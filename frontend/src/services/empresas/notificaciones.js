import { apiClient } from "../auth";
import { getEffectiveTenantId } from "../tenant";

export async function fetchNotificacionesEstructura(limit = 20) {
  const tenantId = getEffectiveTenantId();
  const params = { limit };
  if (tenantId) params.empresa = tenantId;
  const { data } = await apiClient.get("/notificaciones-estructura/", { params });
  return data || [];
}

export async function markAllNotificacionesRead() {
  const tenantId = getEffectiveTenantId();
  const params = tenantId ? { empresa: tenantId } : undefined;
  const { data } = await apiClient.post("/notificaciones-estructura/mark-all-read/", null, { params });
  return data;
}
