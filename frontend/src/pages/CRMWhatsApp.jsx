import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import SettingsIcon from "@mui/icons-material/Settings";
import Page from "../layouts/Page.jsx";
import { useTenant } from "../context/TenantContext.jsx";
import { getCurrentUser } from "../services/auth.js";
import { resolveUserRole } from "../services/access.js";
import {
  createWhatsappConfig,
  fetchConversations,
  fetchMessages,
  fetchWhatsappConfigs,
  replyConversation,
  updateConversation,
  updateWhatsappConfig,
} from "../services/crm/whatsapp.js";

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "nuevo", label: "Nuevo" },
  { value: "en_conversacion", label: "En conversacion" },
  { value: "calificado", label: "Calificado" },
  { value: "convertido", label: "Convertido" },
  { value: "perdido", label: "Perdido" },
];

const fieldSx = {
  "& .MuiInputBase-input": { color: "inherit" },
  "& .MuiInputLabel-root": { color: "rgba(148,163,184,0.95)" },
  "& .MuiOutlinedInput-root fieldset": { borderColor: "rgba(148,163,184,0.45)" },
  "& .MuiOutlinedInput-root:hover fieldset": { borderColor: "rgba(148,163,184,0.8)" },
  "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#38bdf8" },
  "& .MuiSvgIcon-root": { color: "inherit" },
};

const emptyConfigForm = {
  phone_number_id: "",
  waba_id: "",
  access_token: "",
  verify_token: "",
  app_secret: "",
  activo: true,
};

const CONFIG_ROLES = new Set(["superuser", "admin", "admin_organizacional"]);

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function in24hWindow(conversation) {
  if (!conversation?.last_inbound_at) return false;
  const lastInbound = new Date(conversation.last_inbound_at).getTime();
  return Number.isFinite(lastInbound) && lastInbound >= Date.now() - 24 * 60 * 60 * 1000;
}

function extractApiErrorMessage(err, fallback) {
  const data = err?.response?.data;
  if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    const value = data[firstKey];
    if (Array.isArray(value) && value[0]) return String(value[0]);
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

export default function CRMWhatsApp() {
  const { tenantId } = useTenant();
  const canManageConfig = CONFIG_ROLES.has(resolveUserRole(getCurrentUser()));
  const [estado, setEstado] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [configForm, setConfigForm] = useState(emptyConfigForm);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const selected = useMemo(
    () => conversations.find((item) => Number(item.id) === Number(selectedId)) || null,
    [conversations, selectedId],
  );

  const activeConfig = configs[0] || null;
  const canReply = Boolean(selected?.id) && in24hWindow(selected) && !sending;

  const syncConfigForm = (config) => {
    if (!config) {
      setConfigForm(emptyConfigForm);
      return;
    }
    setConfigForm({
      phone_number_id: config.phone_number_id || "",
      waba_id: config.waba_id || "",
      access_token: "",
      verify_token: "",
      app_secret: "",
      activo: Boolean(config.activo),
    });
  };

  const loadConfigs = async () => {
    if (!canManageConfig) return;
    setConfigLoading(true);
    setConfigError("");
    try {
      const data = await fetchWhatsappConfigs();
      setConfigs(data);
      syncConfigForm(data[0] || null);
    } catch (err) {
      setConfigError(extractApiErrorMessage(err, "No se pudo cargar la configuracion de WhatsApp."));
    } finally {
      setConfigLoading(false);
    }
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    setError("");
    try {
      const data = await fetchConversations(estado ? { estado } : {});
      setConversations(data);
      setSelectedId((current) => {
        if (current && data.some((item) => Number(item.id) === Number(current))) return current;
        return data[0]?.id || null;
      });
    } catch (err) {
      setError(extractApiErrorMessage(err, "No se pudieron cargar conversaciones."));
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, estado]);

  useEffect(() => {
    loadConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, canManageConfig]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedId) {
        setMessages([]);
        return;
      }
      setLoadingMessages(true);
      setError("");
      try {
        const data = await fetchMessages(selectedId);
        if (mounted) setMessages(data);
      } catch (err) {
        if (mounted) setError(extractApiErrorMessage(err, "No se pudieron cargar mensajes."));
      } finally {
        if (mounted) setLoadingMessages(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || !selected?.id) return;
    setSending(true);
    setError("");
    try {
      const sent = await replyConversation(selected.id, trimmed);
      setMessages((prev) => [...prev, sent]);
      setBody("");
      setConversations((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(selected.id)
            ? {
                ...item,
                estado: item.estado === "nuevo" ? "en_conversacion" : item.estado,
                last_outbound_at: sent.timestamp,
                ultimo_mensaje: sent,
              }
            : item,
        ),
      );
    } catch (err) {
      setError(extractApiErrorMessage(err, "No se pudo enviar el mensaje."));
    } finally {
      setSending(false);
    }
  };

  const handleEstadoChange = async (nextEstado) => {
    if (!selected?.id || !nextEstado) return;
    setError("");
    try {
      const updated = await updateConversation(selected.id, { estado: nextEstado });
      setConversations((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
    } catch (err) {
      setError(extractApiErrorMessage(err, "No se pudo actualizar el estado."));
    }
  };

  const handleConfigChange = (field, value) => {
    setConfigForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = async () => {
    if (!tenantId) {
      setConfigError("Selecciona una empresa antes de guardar.");
      return;
    }
    setConfigSaving(true);
    setConfigError("");
    try {
      const payload = {
        empresa: Number(tenantId),
        phone_number_id: configForm.phone_number_id.trim(),
        waba_id: configForm.waba_id.trim(),
        activo: Boolean(configForm.activo),
      };
      ["access_token", "verify_token", "app_secret"].forEach((field) => {
        const value = configForm[field].trim();
        if (value) payload[field] = value;
      });

      const saved = activeConfig?.id
        ? await updateWhatsappConfig(activeConfig.id, payload)
        : await createWhatsappConfig(payload);
      setConfigs([saved]);
      syncConfigForm(saved);
    } catch (err) {
      setConfigError(extractApiErrorMessage(err, "No se pudo guardar la configuracion de WhatsApp."));
    } finally {
      setConfigSaving(false);
    }
  };

  return (
    <Page
      title="CRM WhatsApp"
      actions={
        <div className="flex w-full items-center justify-end gap-2 text-zinc-900 dark:text-zinc-100">
          <TextField
            select
            size="small"
            label="Estado"
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
            sx={{ ...fieldSx, minWidth: 190 }}
          >
            {ESTADOS.map((item) => (
              <MenuItem key={item.value || "all"} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
          {canManageConfig ? (
            <Button
              variant={configOpen ? "contained" : "outlined"}
              startIcon={<SettingsIcon />}
              onClick={() => setConfigOpen((open) => !open)}
            >
              Configurar
            </Button>
          ) : null}
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadConversations} disabled={loadingConversations}>
            Actualizar
          </Button>
        </div>
      }
    >
      {canManageConfig ? (
        <Collapse className="w-full shrink-0" in={configOpen} timeout="auto" unmountOnExit>
          <section className="mb-3 w-full border border-zinc-200 bg-zinc-50/80 px-3 py-3 text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-50">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">WhatsApp Cloud API</div>
                <div className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                  {activeConfig?.id ? `Configuracion activa #${activeConfig.id}` : "Completa las credenciales para habilitar el canal"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {configLoading ? <CircularProgress size={18} /> : null}
                <Chip
                  size="small"
                  label={activeConfig?.has_access_token ? "Token OK" : "Token falta"}
                  color={activeConfig?.has_access_token ? "success" : "default"}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={activeConfig?.has_verify_token ? "Verify OK" : "Verify falta"}
                  color={activeConfig?.has_verify_token ? "success" : "default"}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={activeConfig?.has_app_secret ? "Secret OK" : "Secret falta"}
                  color={activeConfig?.has_app_secret ? "success" : "default"}
                  variant="outlined"
                />
              </div>
            </div>
            {configError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {configError}
              </Alert>
            ) : null}
            <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-2 xl:grid-cols-[minmax(160px,1fr)_minmax(140px,0.8fr)_minmax(180px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_auto_auto]">
              <TextField
                size="small"
                label="Phone number ID"
                value={configForm.phone_number_id}
                onChange={(event) => handleConfigChange("phone_number_id", event.target.value)}
                sx={fieldSx}
              />
              <TextField
                size="small"
                label="WABA ID"
                value={configForm.waba_id}
                onChange={(event) => handleConfigChange("waba_id", event.target.value)}
                sx={fieldSx}
              />
              <TextField
                size="small"
                label={activeConfig?.has_access_token ? "Access token nuevo" : "Access token"}
                type="password"
                value={configForm.access_token}
                onChange={(event) => handleConfigChange("access_token", event.target.value)}
                sx={fieldSx}
              />
              <TextField
                size="small"
                label={activeConfig?.has_verify_token ? "Verify token nuevo" : "Verify token"}
                type="password"
                value={configForm.verify_token}
                onChange={(event) => handleConfigChange("verify_token", event.target.value)}
                sx={fieldSx}
              />
              <TextField
                size="small"
                label={activeConfig?.has_app_secret ? "App secret nuevo" : "App secret"}
                type="password"
                value={configForm.app_secret}
                onChange={(event) => handleConfigChange("app_secret", event.target.value)}
                sx={fieldSx}
              />
              <div className="flex h-10 items-center">
                <FormControlLabel
                  sx={{ m: 0, whiteSpace: "nowrap" }}
                  control={
                    <Switch
                      size="small"
                      checked={configForm.activo}
                      onChange={(event) => handleConfigChange("activo", event.target.checked)}
                    />
                  }
                  label="Activa"
                />
              </div>
              <div className="flex h-10 justify-end">
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveConfig}
                  disabled={configSaving || !configForm.phone_number_id.trim() || !configForm.waba_id.trim()}
                  sx={{ minWidth: 132 }}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </section>
        </Collapse>
      ) : null}

      <div className="grid h-full min-h-0 w-full grid-cols-1 gap-3 text-zinc-950 dark:text-zinc-50 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col overflow-hidden border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-200 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
            <span>Conversaciones</span>
            {loadingConversations ? <CircularProgress size={16} /> : <span>{conversations.length}</span>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations.map((conversation) => {
              const active = Number(conversation.id) === Number(selectedId);
              const openWindow = in24hWindow(conversation);
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={[
                    "w-full border-b border-zinc-200 px-3 py-3 text-left transition dark:border-zinc-800",
                    active ? "bg-sky-100 dark:bg-sky-950/70" : "hover:bg-zinc-100 dark:hover:bg-zinc-900",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {conversation.contact_name || conversation.cliente_nombre || conversation.wa_phone}
                      </div>
                      <div className="truncate text-xs text-zinc-500">{conversation.wa_phone}</div>
                    </div>
                    <Chip
                      size="small"
                      label={openWindow ? "24h" : "cerrada"}
                      color={openWindow ? "success" : "default"}
                      variant={openWindow ? "filled" : "outlined"}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-500">
                    <span className="truncate">{conversation.ultimo_mensaje?.body || conversation.estado}</span>
                    <span className="shrink-0">{formatDateTime(conversation.actualizado_en)}</span>
                  </div>
                </button>
              );
            })}
            {!loadingConversations && conversations.length === 0 ? (
              <div className="px-3 py-6 text-sm text-zinc-500">Sin conversaciones.</div>
            ) : null}
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {selected ? (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">
                    {selected.contact_name || selected.cliente_nombre || selected.wa_phone}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {selected.cliente_codigo ? `${selected.cliente_codigo} - ` : ""}
                    Ultimo inbound: {formatDateTime(selected.last_inbound_at)}
                  </div>
                </div>
                <TextField
                  select
                  size="small"
                  label="Estado"
                  value={selected.estado || "nuevo"}
                  onChange={(event) => handleEstadoChange(event.target.value)}
                  sx={{ ...fieldSx, minWidth: 190 }}
                >
                  {ESTADOS.filter((item) => item.value).map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </TextField>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 px-4 py-4 dark:bg-zinc-950">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <CircularProgress size={24} />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {messages.map((message) => {
                      const outbound = message.direction === "outbound";
                      return (
                        <div key={message.id} className={["flex", outbound ? "justify-end" : "justify-start"].join(" ")}>
                          <div
                            className={[
                              "max-w-[78%] rounded-md px-3 py-2 text-sm shadow-sm",
                              outbound
                                ? "bg-sky-600 text-white"
                                : "bg-white text-zinc-950 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-800",
                            ].join(" ")}
                          >
                            <div className="whitespace-pre-wrap break-words">{message.body || `[${message.tipo}]`}</div>
                            <div className={["mt-1 text-[11px]", outbound ? "text-sky-100" : "text-zinc-500"].join(" ")}>
                              {formatDateTime(message.timestamp)}
                              {message.estado ? ` - ${message.estado}` : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {messages.length === 0 ? <div className="text-sm text-zinc-500">Sin mensajes.</div> : null}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-zinc-200 p-3 dark:border-zinc-800">
                {error ? <div className="mb-2 text-sm text-red-500">{error}</div> : null}
                {!in24hWindow(selected) ? (
                  <div className="mb-2 text-xs text-amber-600 dark:text-amber-300">
                    Ventana de 24h cerrada. Todavia no se envian plantillas desde esta bandeja.
                  </div>
                ) : null}
                <div className="flex items-end gap-2">
                  <TextField
                    multiline
                    minRows={1}
                    maxRows={4}
                    fullWidth
                    size="small"
                    label="Mensaje"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={!canReply}
                    sx={fieldSx}
                  />
                  <Button
                    variant="contained"
                    endIcon={<SendIcon />}
                    onClick={handleSend}
                    disabled={!canReply || !body.trim()}
                    sx={{ minHeight: 40 }}
                  >
                    Enviar
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Selecciona una conversacion.
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}
