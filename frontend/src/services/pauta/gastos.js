import { apiClient } from "../auth";
import { getEffectiveTenantId } from "../tenant";

export async function fetchCuentasPublicitarias() {
  const tenantId = getEffectiveTenantId();
  const { data } = await apiClient.get("/cuentas-publicitarias/", {
    params: tenantId ? { empresa: tenantId } : undefined,
  });
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export async function createGastoDiario(payload) {
  const tenantId = getEffectiveTenantId();
  const nextPayload =
    tenantId && payload?.empresa === undefined
      ? { ...payload, empresa: tenantId }
      : payload;
  const { data } = await apiClient.post("/gastos-diarios/", nextPayload);
  return data;
}
