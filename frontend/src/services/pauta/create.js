import { apiClient } from "../auth";
import { getEffectiveTenantId } from "../tenant";

const CAMPAIGN_OBJECTIVE_OPTIONS = [
  { label: "Ventas", value: "OUTCOME_SALES" },
  { label: "Interacción", value: "OUTCOME_ENGAGEMENT" },
  { label: "Clientes potenciales", value: "OUTCOME_LEADS" },
  { label: "Tráfico", value: "OUTCOME_TRAFFIC" },
  { label: "Reconocimiento", value: "OUTCOME_AWARENESS" },
  { label: "Apps", value: "OUTCOME_APP_PROMOTION" },
];

const CAMPAIGN_BUDGET_STRATEGY_OPTIONS = [
  { label: "Costo más bajo", value: "LOWEST_COST_WITHOUT_CAP" },
  { label: "Cost Cap", value: "LOWEST_COST_WITH_BID_CAP" },
  { label: "Bid Cap", value: "COST_CAP" },
];

const CONVERSION_LOCATION_OPTIONS = [
  { label: "Sitio web", value: "WEBSITE" },
  { label: "Aplicación", value: "APP" },
  { label: "Messenger", value: "MESSENGER" },
  { label: "WhatsApp", value: "WHATSAPP" },
];

const OPTIMIZATION_GOAL_OPTIONS = [
  { label: "Conversiones", value: "OFFSITE_CONVERSIONS" },
  { label: "Clics en enlace", value: "LINK_CLICKS" },
  { label: "Alcance", value: "REACH" },
  { label: "Landing page views", value: "LANDING_PAGE_VIEWS" },
];

const CONVERSION_EVENT_OPTIONS = [
  { label: "Compra", value: "PURCHASE" },
  { label: "Lead", value: "LEAD" },
  { label: "Contacto", value: "CONTACT" },
  { label: "Registro completo", value: "COMPLETE_REGISTRATION" },
  { label: "Ver contenido", value: "VIEW_CONTENT" },
];

const GENDER_OPTIONS = [
  { label: "Ambos", value: "all" },
  { label: "Hombre", value: "male" },
  { label: "Mujer", value: "female" },
];

const COUNTRY_OPTIONS = [
  { label: "Argentina", value: "AR" },
  { label: "Chile", value: "CL" },
  { label: "Uruguay", value: "UY" },
  { label: "Paraguay", value: "PY" },
  { label: "Perú", value: "PE" },
  { label: "Colombia", value: "CO" },
  { label: "México", value: "MX" },
  { label: "España", value: "ES" },
];

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
    endpoint: "/campanas/",
    fields: [
      {
        name: "cuenta_publicitaria",
        label: "Cuenta publicitaria",
        type: "select-remote",
        source: "/cuentas-publicitarias/",
        required: true,
      },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      {
        name: "objetivo",
        label: "Objetivo",
        type: "select-static",
        options: CAMPAIGN_OBJECTIVE_OPTIONS,
        required: true,
      },
      {
        name: "estrategia_presupuesto",
        label: "Estrategia de presupuesto",
        type: "select-static",
        options: CAMPAIGN_BUDGET_STRATEGY_OPTIONS,
        required: true,
      },
      { name: "meta_id", label: "Meta ID (opcional)", type: "text", required: false },
    ],
  },
  Adsets: {
    endpoint: "/conjuntos-anuncios/",
    fields: [
      {
        name: "campaña",
        label: "Campaña",
        type: "select-remote",
        source: "/campanas/",
        required: true,
      },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "presupuesto_diario", label: "Presupuesto diario (USD)", type: "number", required: true },
      {
        name: "conversion_location",
        label: "Ubicación de la conversión",
        type: "select-static",
        options: CONVERSION_LOCATION_OPTIONS,
        required: true,
      },
      {
        name: "optimization_goal",
        label: "Objetivo de rendimiento",
        type: "select-static",
        options: OPTIMIZATION_GOAL_OPTIONS,
        required: true,
      },
      {
        name: "conversion_event",
        label: "Evento de conversión",
        type: "select-static",
        options: CONVERSION_EVENT_OPTIONS,
        required: true,
      },
      { name: "pixel_id", label: "Conjunto de datos (Pixel ID)", type: "text", required: true },
      {
        name: "country",
        label: "País",
        type: "select-static",
        options: COUNTRY_OPTIONS,
        required: true,
      },
      { name: "age_min", label: "Edad mínima", type: "number", required: true },
      { name: "age_max", label: "Edad máxima", type: "number", required: true },
      {
        name: "gender",
        label: "Sexo",
        type: "select-static",
        options: GENDER_OPTIONS,
        required: true,
      },
      { name: "fecha_inicio", label: "Fecha inicio", type: "date", required: true },
      { name: "meta_id", label: "Meta ID (opcional)", type: "text", required: false },
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
      { name: "descripcion", label: "Descripción", type: "text", required: false },
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
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "meta_id", label: "Meta ID (opcional)", type: "text", required: false },
    ],
  },
  "Credenciales Meta": {
    endpoint: "/credenciales-meta/",
    fields: [
      { name: "bm", label: "BM", type: "select-remote", source: "/bms/", required: true },
      { name: "pixel_id", label: "Pixel ID", type: "text", required: true },
      { name: "app_id", label: "App ID", type: "text", required: true },
      { name: "token_acceso_encrypted", label: "Token de acceso", type: "password", required: true },
    ],
  },
  Assets: {
    mode: "external-pipeline",
  },
};

export function getCreateConfig(typeKey) {
  return CREATE_FORM_CONFIG[typeKey] || null;
}

function normalizeAdsetPayload(payload) {
  const next = { ...payload };

  const gender = next.gender;
  const ageMin = Number(next.age_min);
  const ageMax = Number(next.age_max);
  const country = String(next.country || "AR").toUpperCase();

  if (Number.isNaN(ageMin) || Number.isNaN(ageMax) || ageMin < 13 || ageMax > 65 || ageMin > ageMax) {
    throw new Error("Rango de edad invalido para segmentacion.");
  }

  const targeting = {
    geo_locations: { countries: [country] },
    age_min: ageMin,
    age_max: ageMax,
  };

  if (gender === "male") targeting.genders = [1];
  if (gender === "female") targeting.genders = [2];

  next.segmentacion = {
    optimization_goal: next.optimization_goal,
    destination_type: next.conversion_location || "WEBSITE",
    targeting,
    promoted_object: {
      pixel_id: String(next.pixel_id || ""),
      custom_event_type: next.conversion_event,
    },
  };

  if (!next.fecha_inicio) {
    throw new Error("Fecha de inicio requerida en adset.");
  }

  delete next.conversion_location;
  delete next.optimization_goal;
  delete next.conversion_event;
  delete next.pixel_id;
  delete next.country;
  delete next.age_min;
  delete next.age_max;
  delete next.gender;

  return next;
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

  let normalizedPayload = { ...payload };
  if (typeKey === "Adsets") {
    normalizedPayload = normalizeAdsetPayload(normalizedPayload);
  }

  const tenantId = getEffectiveTenantId();
  const finalPayload =
    tenantId && normalizedPayload?.empresa === undefined
      ? { ...normalizedPayload, empresa: tenantId }
      : normalizedPayload;

  const { data } = await apiClient.post(config.endpoint, finalPayload);
  return data;
}
