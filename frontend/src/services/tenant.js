const ACTIVE_TENANT_KEY = "active_tenant_id";

function getStoredUser() {
  const raw = localStorage.getItem("current_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isSuperuser(user = getStoredUser()) {
  return Boolean(user?.is_superuser);
}

export function isPauta(user = getStoredUser()) {
  const groups = Array.isArray(user?.group_names) ? user.group_names : [];
  return groups.some((name) => String(name).toLowerCase() === "pauta");
}

export function isAdminOrganizacional(user = getStoredUser()) {
  const groups = Array.isArray(user?.group_names) ? user.group_names : [];
  return groups.some((name) => String(name).toLowerCase() === "admin organizacional");
}

export function getUserEmpresa(user = getStoredUser()) {
  const value = user?.empresa;
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getActiveTenantId() {
  const raw = localStorage.getItem(ACTIVE_TENANT_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

export function setActiveTenantId(value) {
  if (value === null || value === undefined || value === "") {
    localStorage.removeItem(ACTIVE_TENANT_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_TENANT_KEY, String(value));
}

export function clearActiveTenant() {
  localStorage.removeItem(ACTIVE_TENANT_KEY);
}

export function getEffectiveTenantId() {
  const user = getStoredUser();
  if (!user) return null;
  if (isSuperuser(user) || isPauta(user) || isAdminOrganizacional(user)) {
    return getActiveTenantId();
  }
  return getUserEmpresa(user);
}

export function mergeEmpresaParam(params = {}, paramName = "empresa") {
  const tenantId = getEffectiveTenantId();
  if (!tenantId) return params || {};
  if (params && params[paramName] !== undefined) return params;
  return {
    ...(params || {}),
    [paramName]: tenantId,
  };
}
