import { apiClient } from "../auth";
import { getEffectiveTenantId } from "../tenant";

const META_STATUS_OPTIONS = [
  { label: "Activa", value: "ACTIVE" },
  { label: "Pausada", value: "PAUSED" },
  { label: "Archivada", value: "ARCHIVED" },
  { label: "Eliminada", value: "DELETED" },
];

const CAMPAIGN_BUYING_TYPE_OPTIONS = [
  { label: "Subasta", value: "AUCTION" },
  { label: "Reserva", value: "RESERVED" },
];

const CAMPAIGN_OBJECTIVE_OPTIONS = [
  { label: "Reconocimiento", value: "OUTCOME_AWARENESS" },
  { label: "Trafico", value: "OUTCOME_TRAFFIC" },
  { label: "Interaccion", value: "OUTCOME_ENGAGEMENT" },
  { label: "Clientes potenciales", value: "OUTCOME_LEADS" },
  { label: "Promocion de la app", value: "OUTCOME_APP_PROMOTION" },
  { label: "Ventas", value: "OUTCOME_SALES" },
];

const CAMPAIGN_BID_STRATEGY_OPTIONS = [
  { label: "Volumen o valor mas alto", value: "LOWEST_COST_WITHOUT_CAP" },
  { label: "Objetivo de costo por resultado", value: "COST_CAP" },
  { label: "Limite de puja", value: "BID_CAP" },
];

const ADSET_CONVERSION_LOCATION_SCOPE_OPTIONS = [
  { label: "Varias", value: "MULTI" },
  { label: "Unica", value: "SINGLE" },
];

const ADSET_CONVERSION_LOCATION_OPTIONS = [
  { label: "Sitio web y app", value: "MULTI_WEBSITE_APP" },
  { label: "Sitio web y negocio", value: "MULTI_WEBSITE_STORE" },
  { label: "Sitio web, app y negocio", value: "MULTI_WEBSITE_APP_STORE" },
  { label: "Sitio web y llamadas", value: "MULTI_WEBSITE_CALL" },
  { label: "Sitio web", value: "SINGLE_WEBSITE" },
  { label: "App", value: "SINGLE_APP" },
  { label: "Destino de mensajes", value: "SINGLE_MESSAGES" },
  { label: "Llamadas", value: "SINGLE_CALLS" },
];

const OPTIMIZATION_GOAL_OPTIONS = [
  { label: "Maximizar el numero de conversiones", value: "MAX_CONVERSIONS" },
  { label: "Maximizar el valor de las conversiones", value: "MAX_CONVERSION_VALUE" },
  { label: "Maximizar el numero de visitas a la pagina de destino", value: "MAX_LANDING_PAGE_VIEWS" },
  { label: "Maximizar el numero de clics en el enlace", value: "MAX_LINK_CLICKS" },
  { label: "Maximizar el alcance diario unico", value: "MAX_DAILY_UNIQUE_REACH" },
  { label: "Maximizar el numero de impresiones", value: "MAX_IMPRESSIONS" },
];

const CONVERSION_EVENT_OPTIONS = [
  { label: "Comprar", value: "PURCHASE" },
];

const AD_DESTINATION_OPTIONS = [
  { label: "Sitio web", value: "WEBSITE" },
  { label: "Experiencia instantanea", value: "INSTANT_EXPERIENCE" },
  { label: "Evento de Facebook", value: "FACEBOOK_EVENT" },
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
  { label: "Peru", value: "PE" },
  { label: "Colombia", value: "CO" },
  { label: "Mexico", value: "MX" },
  { label: "Espana", value: "ES" },
];

export const CREATE_FORM_CONFIG = {
  Bms: {
    endpoint: "/bms/",
    fields: [
      {
        name: "empresas",
        label: "Empresas vinculadas",
        type: "multiselect-remote",
        source: "/empresas/",
        labelField: "nombre",
        default: [],
        required: true,
      },
      { name: "meta_id", label: "Meta ID", type: "text", required: true },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "estado", label: "Estado", type: "select-static", options: META_STATUS_OPTIONS, required: true },
    ],
  },
  "Ad Accounts": {
    endpoint: "/cuentas-publicitarias/",
    fields: [
      { name: "bm", label: "BM", type: "select-remote", source: "/bms/", required: true },
      { name: "meta_id", label: "Meta ID", type: "text", required: true },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "estado", label: "Estado", type: "select-static", options: META_STATUS_OPTIONS, required: true },
    ],
  },
  FanPage: {
    endpoint: "/fanpages/",
    fields: [
      { name: "bm", label: "BM", type: "select-remote", source: "/bms/", required: true },
      { name: "meta_id", label: "Meta ID", type: "text", required: true },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "estado", label: "Estado", type: "select-static", options: META_STATUS_OPTIONS, required: true },
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
        name: "tipo_compra",
        label: "Tipo de compra",
        type: "select-static",
        options: CAMPAIGN_BUYING_TYPE_OPTIONS,
        default: "AUCTION",
        required: true,
      },
      {
        name: "objetivo",
        label: "Objetivo de campana",
        type: "select-static",
        options: CAMPAIGN_OBJECTIVE_OPTIONS,
        required: true,
      },
      {
        name: "estrategia_presupuesto",
        label: "Estrategia de puja",
        type: "select-static",
        options: CAMPAIGN_BID_STRATEGY_OPTIONS,
        required: true,
      },
      { name: "objetivo_roas", label: "Objetivo de ROAS (solo ventas)", type: "number", required: false },
      { name: "estado", label: "Estado", type: "select-static", options: META_STATUS_OPTIONS, required: true },
      { name: "meta_id", label: "Meta ID (opcional)", type: "text", required: false },
    ],
  },
  Adsets: {
    endpoint: "/conjuntos-anuncios/",
    fields: [
      {
        name: "campaña",
        label: "Campana",
        type: "select-remote",
        source: "/campanas/",
        required: true,
      },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "presupuesto_diario", label: "Presupuesto diario (USD)", type: "number", required: true },
      {
        name: "conversion_scope",
        label: "Ubicacion de la conversion",
        type: "select-static",
        options: ADSET_CONVERSION_LOCATION_SCOPE_OPTIONS,
        required: true,
      },
      {
        name: "conversion_location",
        label: "Destino de conversion",
        type: "select-static",
        options: ADSET_CONVERSION_LOCATION_OPTIONS,
        required: true,
      },
      {
        name: "optimization_goal",
        label: "Objetivo de conversion",
        type: "select-static",
        options: OPTIMIZATION_GOAL_OPTIONS,
        required: true,
      },
      {
        name: "conversion_event",
        label: "Evento de conversion",
        type: "select-static",
        options: CONVERSION_EVENT_OPTIONS,
        required: true,
      },
      { name: "pixel_id", label: "Conjunto de datos (Pixel ID)", type: "text", required: true },
      {
        name: "country",
        label: "Pais",
        type: "select-static",
        options: COUNTRY_OPTIONS,
        required: true,
      },
      { name: "age_min", label: "Edad minima", type: "number", required: true },
      { name: "age_max", label: "Edad maxima", type: "number", required: true },
      {
        name: "gender",
        label: "Sexo",
        type: "select-static",
        options: GENDER_OPTIONS,
        required: true,
      },
      { name: "estado", label: "Estado", type: "select-static", options: META_STATUS_OPTIONS, required: true },
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
      { name: "descripcion", label: "Descripcion", type: "text", required: false },
      { name: "url_destino", label: "URL destino", type: "url", required: true },
      { name: "cta", label: "CTA", type: "text", required: true },
      { name: "asset", label: "Asset", type: "select-remote", source: "/pauta-assets/", required: true },
      { name: "meta_id", label: "Meta ID", type: "text", required: false },
      { name: "estado", label: "Estado", type: "select-static", options: META_STATUS_OPTIONS, required: true },
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
      { name: "destino", label: "Destino", type: "select-static", options: AD_DESTINATION_OPTIONS, required: true },
      { name: "estado", label: "Estado", type: "select-static", options: META_STATUS_OPTIONS, required: true },
      { name: "meta_id", label: "Meta ID (opcional)", type: "text", required: false },
    ],
  },
  "Credenciales Meta": {
    endpoint: "/credenciales-meta/",
    fields: [
      { name: "bm", label: "BM", type: "select-remote", source: "/bms/", required: true },
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "pixel_id", label: "Pixel ID", type: "text", required: true },
      { name: "app_id", label: "App ID (opcional)", type: "text", required: false },
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

  const destinationMap = {
    MULTI_WEBSITE_APP: "WEBSITE_AND_APP",
    MULTI_WEBSITE_STORE: "WEBSITE_AND_SHOPS",
    MULTI_WEBSITE_APP_STORE: "WEBSITE_AND_APP_AND_SHOPS",
    MULTI_WEBSITE_CALL: "WEBSITE_AND_CALL",
    SINGLE_WEBSITE: "WEBSITE",
    SINGLE_APP: "APP",
    SINGLE_MESSAGES: "MESSAGING_DESTINATION",
    SINGLE_CALLS: "PHONE_CALL",
  };

  const optimizationMap = {
    MAX_CONVERSIONS: "OFFSITE_CONVERSIONS",
    MAX_CONVERSION_VALUE: "VALUE",
    MAX_LANDING_PAGE_VIEWS: "LANDING_PAGE_VIEWS",
    MAX_LINK_CLICKS: "LINK_CLICKS",
    MAX_DAILY_UNIQUE_REACH: "REACH",
    MAX_IMPRESSIONS: "IMPRESSIONS",
  };

  const destinationType = destinationMap[next.conversion_location] || "WEBSITE";
  const optimizationGoal = optimizationMap[next.optimization_goal] || "OFFSITE_CONVERSIONS";

  next.segmentacion = {
    optimization_goal: optimizationGoal,
    destination_type: destinationType,
    targeting,
    promoted_object: {
      pixel_id: String(next.pixel_id || ""),
      custom_event_type: next.conversion_event,
    },
  };

  if (!next.fecha_inicio) {
    throw new Error("Fecha de inicio requerida en adset.");
  }

  delete next.conversion_scope;
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

function applyMetaDraftToProvisioning(payload, createMetaDraft) {
  const flag = Boolean(createMetaDraft);
  const next = { ...payload };

  if (next.campana && typeof next.campana === "object") {
    next.campana = { ...next.campana, create_meta_draft: flag };
  }

  if (Array.isArray(next.adsets)) {
    next.adsets = next.adsets.map((adset) => {
      const adsetNext = { ...adset, create_meta_draft: flag };
      if (Array.isArray(adsetNext.ads)) {
        adsetNext.ads = adsetNext.ads.map((ad) => ({ ...ad, create_meta_draft: flag }));
      }
      return adsetNext;
    });
  }

  if (Array.isArray(next.ads)) {
    next.ads = next.ads.map((ad) => ({ ...ad, create_meta_draft: flag }));
  }

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

export async function createByType(typeKey, payload, options = {}) {
  const config = getCreateConfig(typeKey);
  if (!config?.endpoint) {
    throw new Error("Tipo no soportado para creacion directa.");
  }

  const shouldAttachMetaDraftFlag = ["Campaigns", "Adsets", "Ads"].includes(typeKey);
  const createMetaDraft = options.createMetaDraft ?? true;

  let normalizedPayload = { ...payload };
  if (typeKey === "Adsets") {
    normalizedPayload = normalizeAdsetPayload(normalizedPayload);
  }

  if (shouldAttachMetaDraftFlag) {
    normalizedPayload.create_meta_draft = Boolean(createMetaDraft);
  }

  const tenantId = getEffectiveTenantId();
  const finalPayload =
    typeKey !== "Bms" && tenantId && normalizedPayload?.empresa === undefined
      ? { ...normalizedPayload, empresa: tenantId }
      : normalizedPayload;

  const { data } = await apiClient.post(config.endpoint, finalPayload);
  return data;
}

export function normalizeAdsetForCreate(payload) {
  return normalizeAdsetPayload(payload);
}

export async function createProvisioningStructure(payload, options = {}) {
  const createMetaDraft = options.createMetaDraft ?? true;
  const tenantId = getEffectiveTenantId();

  const withTenant =
    tenantId && payload?.empresa === undefined
      ? { ...payload, empresa: tenantId }
      : { ...payload };

  const finalPayload = applyMetaDraftToProvisioning(withTenant, createMetaDraft);
  const { data } = await apiClient.post("/pauta-provisioning/", finalPayload);
  return data;
}
