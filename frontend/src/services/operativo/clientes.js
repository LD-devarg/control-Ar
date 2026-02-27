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
  if (tenantId) {
    const cached = readCache(tenantId);
    if (cached && !isDirty(tenantId)) {
      return cached;
    }
  }

  const params = {};
  if (tenantId) {
    params.empresa = tenantId;
  }

  const { data } = await apiClient.get(`/clientes/`, { params });
  const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  if (tenantId) {
    writeCache(tenantId, rows);
  }
  return rows;
}
