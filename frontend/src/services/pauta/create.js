import { apiClient } from "../auth";

export const CREATE_FORM_CONFIG = {
  Bms: {
    endpoint: "/bms/",
    fields: [
      { name: "meta_id", label: "Meta ID", type: "text", required: true },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "estado", label: "Estado", type: "text", required: true },
    ],
  },
  "Ad Accounts": {
    endpoint: "/cuentas-publicitarias/",
    fields: [
      { name: "bm", label: "BM", type: "select-remote", source: "/bms/", required: true },
      { name: "meta_id", label: "Meta ID", type: "text", required: true },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "estado", label: "Estado", type: "text", required: true },
    ],
  },
  FanPage: {
    endpoint: "/fanpages/",
    fields: [
      { name: "bm", label: "BM", type: "select-remote", source: "/bms/", required: true },
      { name: "meta_id", label: "Meta ID", type: "text", required: true },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "estado", label: "Estado", type: "text", required: true },
    ],
  },
  Campaigns: {
    endpoint: "/campañas/",
    fields: [
      {
        name: "cuenta_publicitaria",
        label: "Cuenta Publicitaria",
        type: "select-remote",
        source: "/cuentas-publicitarias/",
        required: true,
      },
      { name: "meta_id", label: "Meta ID", type: "text", required: true },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "estado", label: "Estado", type: "text", required: true },
      { name: "objetivo", label: "Objetivo", type: "text", required: true },
      { name: "fecha_inicio", label: "Fecha inicio", type: "date", required: false },
      { name: "fecha_fin", label: "Fecha fin", type: "date", required: false },
    ],
  },
  Adsets: {
    endpoint: "/conjuntos-anuncios/",
    fields: [
      {
        name: "campaña",
        label: "Campaña",
        type: "select-remote",
        source: "/campañas/",
        required: true,
      },
      { name: "meta_id", label: "Meta ID", type: "text", required: true },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "estado", label: "Estado", type: "text", required: true },
      { name: "presupuesto_diario", label: "Presupuesto diario", type: "number", required: false },
      { name: "segmentacion", label: "Segmentacion (JSON)", type: "json", required: false },
      { name: "fecha_inicio", label: "Fecha inicio", type: "date", required: false },
      { name: "fecha_fin", label: "Fecha fin", type: "date", required: false },
    ],
  },
  Creatives: {
    endpoint: "/creatives/",
    fields: [
      { name: "fanpage", label: "FanPage", type: "select-remote", source: "/fanpages/", required: true },
      {
        name: "instagram_account",
        label: "Instagram Account",
        type: "select-remote",
        source: "/instagram-accounts/",
        required: false,
      },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "primary_text", label: "Texto principal", type: "textarea", required: true },
      { name: "headline", label: "Headline", type: "text", required: true },
      { name: "descripcion", label: "Descripcion", type: "text", required: false },
      { name: "url_destino", label: "URL destino", type: "url", required: true },
      { name: "cta", label: "CTA", type: "text", required: true },
      { name: "asset", label: "Asset", type: "select-remote", source: "/pauta-assets/", required: true },
      { name: "meta_id", label: "Meta ID", type: "text", required: false },
    ],
  },
  Ads: {
    endpoint: "/anuncios/",
    fields: [
      {
        name: "conjunto_anuncios",
        label: "Adset",
        type: "select-remote",
        source: "/conjuntos-anuncios/",
        required: true,
      },
      { name: "creative", label: "Creative", type: "select-remote", source: "/creatives/", required: true },
      { name: "meta_id", label: "Meta ID", type: "text", required: false },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "estado", label: "Estado", type: "text", required: true },
    ],
  },
  Assets: {
    mode: "external-pipeline",
  },
};

export function getCreateConfig(typeKey) {
  return CREATE_FORM_CONFIG[typeKey] || null;
}

export async function fetchRemoteOptions(fields = []) {
  const remoteFields = fields.filter((field) => field.type === "select-remote");
  if (remoteFields.length === 0) return {};

  const responses = await Promise.all(remoteFields.map((field) => apiClient.get(field.source)));
  const next = {};

  remoteFields.forEach((field, index) => {
    const payload = responses[index]?.data;
    next[field.name] = Array.isArray(payload) ? payload : [];
  });

  return next;
}

export async function createByType(typeKey, payload) {
  const config = getCreateConfig(typeKey);
  if (!config?.endpoint) {
    throw new Error("Tipo no soportado para creacion directa.");
  }
  const { data } = await apiClient.post(config.endpoint, payload);
  return data;
}
