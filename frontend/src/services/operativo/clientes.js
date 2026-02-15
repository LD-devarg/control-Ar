import { apiClient } from "../auth";
import { getEffectiveTenantId } from "../tenant";

const CACHE_KEY = "clientes_cache";
const DIRTY_KEY = "clientes_dirty";
const CACHE_TS_KEY = "clientes_cache_ts";

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
  localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  localStorage.setItem(DIRTY_KEY, "0");
}

function isDirty() {
  return localStorage.getItem(DIRTY_KEY) === "1";
}

export function markClientesDirty() {
  localStorage.setItem(DIRTY_KEY, "1");
}

export function clearClientesCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TS_KEY);
  localStorage.removeItem(DIRTY_KEY);
}

export async function fetchClientes() {
  const tenantId = getEffectiveTenantId();
  if (!tenantId) {
    throw new Error("Empresa no disponible para el contexto actual.");
  }

  const cached = readCache();
  if (cached && !isDirty()) {
    return cached;
  }

  const { data } = await apiClient.get(`/clientes/`, {
    params: { empresa__id: tenantId },
  });
  writeCache(data);
  return data;
}
