const STORAGE_KEY = "ui_settings_v1";
const SETTINGS_EVENT = "ui:settings-changed";

const DEFAULTS = {
  currency: "USD",
  theme: "dark",
  statsMockMode: false,
};

function sanitize(next = {}) {
  const currency = next.currency === "ARS" ? "ARS" : "USD";
  const theme = next.theme === "light" ? "light" : "dark";
  return {
    ...DEFAULTS,
    ...next,
    currency,
    theme,
    statsMockMode: Boolean(next.statsMockMode),
  };
}

export function getUISettings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULTS };
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...DEFAULTS };
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

