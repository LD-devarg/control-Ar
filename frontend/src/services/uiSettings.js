const STORAGE_KEY = "ui_settings_v1";
const SETTINGS_EVENT = "ui:settings-changed";

function resolveSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getDefaults() {
  return {
    currency: "USD",
    theme: resolveSystemTheme(),
    statsMockMode: false,
  };
}

function sanitize(next = {}) {
  const defaults = getDefaults();
  const currency = next.currency === "ARS" ? "ARS" : "USD";
  const theme = next.theme === "light" || next.theme === "dark" ? next.theme : defaults.theme;
  return {
    ...defaults,
    ...next,
    currency,
    theme,
    statsMockMode: Boolean(next.statsMockMode),
  };
}

export function getUISettings() {
  const defaults = getDefaults();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...defaults };
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...defaults };
  }
}

export function saveUISettings(nextPartial = {}) {
  const current = getUISettings();
  const next = sanitize({ ...current, ...nextPartial });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: next }));
  return next;
}

export function subscribeUISettings(handler) {
  const wrapped = (event) => handler(event?.detail || getUISettings());
  window.addEventListener(SETTINGS_EVENT, wrapped);
  return () => window.removeEventListener(SETTINGS_EVENT, wrapped);
}
