import { apiClient } from "../auth";
import { getEffectiveTenantId } from "../tenant";

function buildCacheKey(tenantId) {
  return `clientes_cache_${tenantId}`;
}

function buildDirtyKey(tenantId) {
  return `clientes_dirty_${tenantId}`;
}

function buildCacheTsKey(tenantId) {
  return `clientes_cache_ts_${tenantId}`;
}

function readCache(tenantId) {
  try {
    const raw = localStorage.getItem(buildCacheKey(tenantId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(tenantId, data) {
  localStorage.setItem(buildCacheKey(tenantId), JSON.stringify(data || []));
  localStorage.setItem(buildCacheTsKey(tenantId), String(Date.now()));
  localStorage.setItem(buildDirtyKey(tenantId), "0");
}

function isDirty(tenantId) {
  return localStorage.getItem(buildDirtyKey(tenantId)) === "1";
}

export function markClientesDirty() {
  const tenantId = getEffectiveTenantId();
  if (!tenantId) return;
  localStorage.setItem(buildDirtyKey(tenantId), "1");
}

export function clearClientesCache() {
  const tenantId = getEffectiveTenantId();
  if (!tenantId) return;
  localStorage.removeItem(buildCacheKey(tenantId));
  localStorage.removeItem(buildCacheTsKey(tenantId));
  localStorage.removeItem(buildDirtyKey(tenantId));
}

export async function fetchClientes() {
  const tenantId = getEffectiveTenantId();
  if (!tenantId) {
    throw new Error("Empresa no disponible para el contexto actual.");
  }

  const cached = readCache(tenantId);
  if (cached && !isDirty(tenantId)) {
    return cached;
  }

  const { data } = await apiClient.get(`/clientes/`, {
    params: { empresa__id: tenantId },
  });
  writeCache(tenantId, data);
  return data;
}
