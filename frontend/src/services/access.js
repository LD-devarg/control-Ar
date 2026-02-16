import { getCurrentUser } from "./auth";

const ROLE_SUPERUSER = "superuser";
const ROLE_ADMIN = "admin";
const ROLE_ADMIN_ORGANIZACIONAL = "admin_organizacional";
const ROLE_OPERADOR = "operador";
const ROLE_PAUTA = "pauta";

const ROLE_ALLOWED_PATHS = {
  [ROLE_SUPERUSER]: "all",
  [ROLE_ADMIN_ORGANIZACIONAL]: [
    "/home",
    "/stats",
    "/contacts",
    "/whatsapp",
    "/tipo-cambio",
    "/landing-config",
    "/pauta-database",
    "/pauta-kpi",
    "/empresas",
    "/usuarios",
  ],
  [ROLE_ADMIN]: ["/home", "/stats", "/contacts", "/whatsapp", "/tipo-cambio", "/usuarios"],
  [ROLE_OPERADOR]: ["/home", "/whatsapp"],
  [ROLE_PAUTA]: ["/landing-config", "/pauta-database", "/pauta-kpi"],
};

const ROLE_DEFAULT_PATH = {
  [ROLE_SUPERUSER]: "/home",
  [ROLE_ADMIN_ORGANIZACIONAL]: "/home",
  [ROLE_ADMIN]: "/home",
  [ROLE_OPERADOR]: "/home",
  [ROLE_PAUTA]: "/landing-config",
};

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function readGroupNames(user) {
  if (Array.isArray(user?.group_names)) {
    return user.group_names.map(normalize).filter(Boolean);
  }
  if (Array.isArray(user?.groups) && user.groups.every((group) => typeof group === "string")) {
    return user.groups.map(normalize).filter(Boolean);
  }
  if (typeof user?.group === "string") {
    return [normalize(user.group)].filter(Boolean);
  }
  if (typeof user?.rol === "string") {
    return [normalize(user.rol)].filter(Boolean);
  }
  if (typeof user?.role === "string") {
    return [normalize(user.role)].filter(Boolean);
  }
  return [];
}

export function resolveUserRole(user = getCurrentUser()) {
  if (!user) return null;
  if (Boolean(user.is_superuser)) return ROLE_SUPERUSER;

  const groupNames = readGroupNames(user);
  if (groupNames.includes("admin organizacional")) return ROLE_ADMIN_ORGANIZACIONAL;
  if (groupNames.includes("admin")) return ROLE_ADMIN;
  if (groupNames.includes("operador")) return ROLE_OPERADOR;
  if (groupNames.includes("pauta")) return ROLE_PAUTA;

  return null;
}

export function getAllowedPaths(user = getCurrentUser()) {
  const role = resolveUserRole(user);
  if (!role) return null;
  const allowed = ROLE_ALLOWED_PATHS[role];
  if (allowed === "all") return null;
  return allowed || [];
}

export function canAccessPath(path, user = getCurrentUser()) {
  const allowedPaths = getAllowedPaths(user);
  if (allowedPaths === null) return true;
  return allowedPaths.includes(path);
}

export function getDefaultPath(user = getCurrentUser()) {
  const role = resolveUserRole(user);
  return ROLE_DEFAULT_PATH[role] || "/home";
}
