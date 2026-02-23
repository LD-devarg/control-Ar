const BULK_ENABLED_TYPES = new Set(["Ads", "Adsets"]);

export function buildOptionLabel(item = {}, field = null) {
  if (field?.labelField && item?.[field.labelField]) return String(item[field.labelField]);
  return item.nombre || item.username || item.meta_id || item.pixel_id || item.id?.toString() || "Sin etiqueta";
}

export function buildInitialValues(fields = []) {
  return fields.reduce((acc, field) => {
    const initialValue = field.default;
    if (Array.isArray(initialValue)) {
      acc[field.name] = [...initialValue];
    } else if (initialValue && typeof initialValue === "object") {
      acc[field.name] = { ...initialValue };
    } else {
      acc[field.name] = initialValue ?? "";
    }
    return acc;
  }, {});
}

function flattenErrorEntries(payload, parentKey = "") {
  if (payload === null || payload === undefined) return [];

  if (typeof payload === "string") {
    return [parentKey ? `${parentKey}: ${payload}` : payload];
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => flattenErrorEntries(item, parentKey));
  }

  if (typeof payload === "object") {
    return Object.entries(payload).flatMap(([key, value]) => {
      const nextKey = parentKey ? `${parentKey}.${key}` : key;
      return flattenErrorEntries(value, nextKey);
    });
  }

  return parentKey ? [`${parentKey}: ${String(payload)}`] : [String(payload)];
}

export function resolveErrorMessage(errorPayload) {
  if (!errorPayload) return null;
  if (typeof errorPayload === "string") return errorPayload;
  if (errorPayload.detail && typeof errorPayload.detail === "string") return errorPayload.detail;

  const messages = flattenErrorEntries(errorPayload).filter(Boolean);
  if (messages.length === 0) return null;
  return messages.join(" | ");
}

export function isEmptyValue(value, field) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim() === "";
  if (
    (field.type === "select-static" || field.type === "select-remote" || field.type === "multiselect-remote") &&
    (value === "" || value === null)
  ) {
    return true;
  }
  return false;
}

export function validateRequiredFields(fields, values) {
  for (const field of fields) {
    if (!field.required) continue;
    const value = values[field.name];
    if (isEmptyValue(value, field)) {
      return `Completa el campo obligatorio: ${field.label}.`;
    }
  }
  return null;
}

export function buildPayloadFromValues(fields, values) {
  const payload = {};

  for (const field of fields) {
    const raw = values[field.name];
    if (raw === "" || raw === null || raw === undefined) continue;

    if (field.type === "number") {
      const parsed = Number(raw);
      if (Number.isNaN(parsed)) {
        throw new Error(`El campo ${field.label} debe ser numérico.`);
      }
      payload[field.name] = parsed;
      continue;
    }

    if (field.type === "json") {
      if (typeof raw !== "string") {
        payload[field.name] = raw;
        continue;
      }
      try {
        payload[field.name] = JSON.parse(raw);
      } catch {
        throw new Error(`El campo ${field.label} no contiene un JSON válido.`);
      }
      continue;
    }

    payload[field.name] = raw;
  }

  return payload;
}

export function createRowId() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function shouldUseBulk(typeKey) {
  return BULK_ENABLED_TYPES.has(typeKey);
}

export function resolveBulkContextField(config, typeKey) {
  if (!config?.fields?.length) return null;
  if (typeKey === "Ads") {
    return config.fields.find((field) => field.name === "conjunto_anuncios") || null;
  }
  if (typeKey === "Adsets") {
    return (
      config.fields.find((field) => field.name === "campaña") ||
      config.fields.find((field) => field.name === "campaÃ±a") ||
      config.fields.find((field) => field.type === "select-remote") ||
      null
    );
  }
  return null;
}

export function isCommonBulkField(field) {
  return field.name !== "nombre" && field.name !== "meta_id";
}
