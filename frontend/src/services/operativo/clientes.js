import { apiClient } from "../auth";
import { getEffectiveTenantId } from "../tenant";

function normalizeScope(scope = {}) {
  return scope.onlyWithContact ? "only_with_contact" : "all";
}

function buildScopedKey(baseKey, tenantId, scope = {}) {
  return `${baseKey}_${tenantId}_${normalizeScope(scope)}`;
}

function buildDirtyKey(tenantId, scope = {}) {
  return buildScopedKey("clientes_dirty", tenantId, scope);
}

function buildCacheTsKey(tenantId, scope = {}) {
  return buildScopedKey("clientes_cache_ts", tenantId, scope);
}

function readCache(tenantId, scope = {}) {
  try {
    const raw = localStorage.getItem(buildScopedKey("clientes_cache", tenantId, scope));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(tenantId, data, scope = {}) {
  localStorage.setItem(buildScopedKey("clientes_cache", tenantId, scope), JSON.stringify(data || []));
  localStorage.setItem(buildCacheTsKey(tenantId, scope), String(Date.now()));
  localStorage.setItem(buildDirtyKey(tenantId, scope), "0");
}

function isDirty(tenantId, scope = {}) {
  return localStorage.getItem(buildDirtyKey(tenantId, scope)) === "1";
}

export function markClientesDirty() {
  const tenantId = getEffectiveTenantId();
  if (!tenantId) return;
  const scopes = [{ onlyWithContact: false }, { onlyWithContact: true }];
  scopes.forEach((scope) => {
    localStorage.setItem(buildDirtyKey(tenantId, scope), "1");
    localStorage.setItem(buildCacheTsKey(tenantId, scope), String(Date.now()));
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clientes:refresh"));
  }
}

export function clearClientesCache() {
  const tenantId = getEffectiveTenantId();
  if (!tenantId) return;
  const scopes = [{ onlyWithContact: false }, { onlyWithContact: true }];
  scopes.forEach((scope) => {
    localStorage.removeItem(buildScopedKey("clientes_cache", tenantId, scope));
    localStorage.removeItem(buildCacheTsKey(tenantId, scope));
    localStorage.removeItem(buildDirtyKey(tenantId, scope));
  });
}

export async function fetchClientes(options = {}) {
  const scope = { onlyWithContact: Boolean(options.onlyWithContact) };
  const tenantId = getEffectiveTenantId();
  if (tenantId) {
    const cached = readCache(tenantId, scope);
    if (cached && !isDirty(tenantId, scope)) {
      return cached;
    }
  }

  const params = {};
  if (tenantId) {
    params.empresa = tenantId;
  }
  if (scope.onlyWithContact) {
    params.solo_contactados = 1;
  }

  const { data } = await apiClient.get(`/clientes/`, { params });
  const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  if (tenantId) {
    writeCache(tenantId, rows, scope);
  }
  return rows;
}

export async function updateCliente(clienteId, payload) {
  const { data } = await apiClient.patch(`/clientes/${clienteId}/`, payload);
  markClientesDirty();
  return data;
}
