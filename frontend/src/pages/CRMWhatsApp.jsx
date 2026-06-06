import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import SettingsIcon from "@mui/icons-material/Settings";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ChatIcon from "@mui/icons-material/Chat";
import PeopleIcon from "@mui/icons-material/People";
import AndroidIcon from "@mui/icons-material/Android";
import BarChartIcon from "@mui/icons-material/BarChart";
import SearchIcon from "@mui/icons-material/Search";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PhoneIcon from "@mui/icons-material/Phone";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";

import { useTenant } from "../context/TenantContext.jsx";
import { getCurrentUser } from "../services/auth.js";
import { resolveUserRole } from "../services/access.js";
import { subscribeRealtimeEvents } from "../services/realtime.js";
import {
  createWhatsappConfig,
  fetchConversations,
  fetchMessages,
  fetchWhatsappConfigs,
  replyConversation,
  updateConversation,
  updateWhatsappConfig,
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  testPushNotification,
} from "../services/crm/whatsapp.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const ESTADOS = [
  { value: "", label: "Todas" },
  { value: "nuevo", label: "Nuevas" },
  { value: "en_conversacion", label: "En progreso" },
  { value: "calificado", label: "Calificadas" },
  { value: "convertido", label: "Convertidas" },
  { value: "perdido", label: "Perdidas" },
];

const fieldSx = {
  "& .MuiInputBase-input": { color: "white" },
  "& .MuiInputLabel-root": { color: "rgba(148,163,184,0.7)" },
  "& .MuiOutlinedInput-root fieldset": { borderColor: "rgba(148,163,184,0.25)" },
  "& .MuiOutlinedInput-root:hover fieldset": { borderColor: "rgba(148,163,184,0.5)" },
  "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#a3e635" },
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

const AVATAR_GRADIENTS = [
  "from-pink-500 to-rose-500",
  "from-purple-500 to-indigo-500",
  "from-blue-500 to-sky-500",
  "from-teal-500 to-emerald-500",
  "from-amber-500 to-orange-500",
];

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

function getInitials(name, wa_phone) {
  if (!name) return wa_phone ? wa_phone.slice(-4) : "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function getAvatarGradient(phone) {
  const cleanPhone = String(phone || "").replace(/\D/g, "");
  const sum = cleanPhone.split("").reduce((acc, char) => acc + parseInt(char, 10), 0);
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
}

function renderMessageStatusIcon(estado) {
  switch (estado) {
    case "read":
      return <DoneAllIcon sx={{ fontSize: 13, color: "#a3e635" }} id="msg-status-read" />;
    case "delivered":
      return <DoneAllIcon sx={{ fontSize: 13, color: "inherit" }} id="msg-status-delivered" />;
    case "sent":
      return <DoneIcon sx={{ fontSize: 13, color: "inherit" }} id="msg-status-sent" />;
    case "failed":
      return <ErrorOutlineIcon sx={{ fontSize: 13, color: "#ef4444" }} id="msg-status-failed" />;
    default:
      return <DoneIcon sx={{ fontSize: 13, color: "inherit" }} />;
  }
}

export default function CRMWhatsApp() {
  const { tenantId, tenantOptions, canSelectTenant, setTenantId } = useTenant();
  const canManageConfig = CONFIG_ROLES.has(resolveUserRole(getCurrentUser()));
  
  // Responsive / View management states
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 1024 : false);
  const [activeMobileView, setActiveMobileView] = useState("list"); // "list" or "chat"

  // Web Push Notification States
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error("Error checking push subscription status:", err);
    }
  };

  const toggleNotifications = async () => {
    if (!window.isSecureContext) {
      alert("Para usar notificaciones push, debes acceder al sitio usando un origen seguro (HTTPS o localhost).\n\nSi estás accediendo por IP local en tu red (ej. http://192.168.x.x:5173/), los navegadores bloquean el uso de Service Workers y Push. Prueba ingresando a http://localhost:5173/ desde tu computadora.");
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Las notificaciones push no son compatibles con este navegador o dispositivo.\n\nNota: Si estás en un iPhone/iPad (iOS), debes primero agregar esta aplicación a tu Pantalla de Inicio (botón Compartir -> 'Agregar a pantalla de inicio') y abrirla desde ahí para habilitar las notificaciones push.");
      return;
    }

    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered with scope:", registration.scope);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Permiso de notificaciones denegado. Habilítalo en la configuración de tu navegador.");
        setPushLoading(false);
        return;
      }

      const activeSubscription = await registration.pushManager.getSubscription();
      if (activeSubscription) {
        // Unsubscribe from service worker
        await activeSubscription.unsubscribe();
        // Notify backend
        await unsubscribeFromPush(activeSubscription.endpoint);
        setIsSubscribed(false);
        console.log("Unsubscribed from push notifications.");
      } else {
        // Subscribe
        const vapidKey = await getVapidPublicKey();
        if (!vapidKey) {
          throw new Error("No se pudo obtener la clave pública VAPID del servidor.");
        }
        
        const convertedKey = urlBase64ToUint8Array(vapidKey);
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });

        const subJson = newSubscription.toJSON();
        await subscribeToPush({
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth
        });

        setIsSubscribed(true);
        console.log("Subscribed to push notifications successfully.");
        
        // Trigger local test push
        try {
          await testPushNotification();
        } catch (testErr) {
          console.warn("Failed to trigger test push:", testErr);
        }
      }
    } catch (err) {
      console.error("Error toggling push notifications:", err);
      alert("Ocurrió un error al configurar las notificaciones: " + (err.message || err));
    } finally {
      setPushLoading(false);
    }
  };
  
  // Local Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  const [estado, setEstado] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageTrigger, setMessageTrigger] = useState(0);
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

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const selected = useMemo(
    () => conversations.find((item) => Number(item.id) === Number(selectedId)) || null,
    [conversations, selectedId],
  );

  // Filter conversations based on search query local input
  const filteredConversations = useMemo(() => {
    return conversations.filter((item) => {
      const name = (item.contact_name || item.cliente_nombre || "").toLowerCase();
      const phone = (item.wa_phone || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  }, [conversations, searchQuery]);

  const activeConfig = configs[0] || null;
  const canReply = Boolean(selected?.id) && in24hWindow(selected) && !sending;

  // Auto scroll to bottom when messages load or change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages]);

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
    if (configOpen) loadConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, canManageConfig, configOpen]);

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
  }, [selectedId, messageTrigger]);

  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Subscribe to real-time events via WebSockets
  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvents((message) => {
      if (message?.type === "crm_message_received") {
        const payload = message.payload;
        const currentSelectedId = selectedIdRef.current;
        // If the message is for the active conversation, reload active messages
        if (currentSelectedId && Number(payload.conversation_id) === Number(currentSelectedId)) {
          setMessageTrigger((prev) => prev + 1);
        }
        // Always refresh conversations list to show newest snippet and order
        loadConversations();
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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
    <div className="flex h-screen w-screen bg-[#090a0c] text-white overflow-hidden font-sans" id="waba-crm-root">
      
      {/* 1. Far-Left Navigation Icon Bar (Hidden on Mobile) */}
      {!isMobile && (
        <aside className="w-16 shrink-0 bg-[#090a0c] border-r border-[#1f2128] flex flex-col items-center py-4 justify-between" id="waba-aside-nav">
          <div className="flex flex-col items-center gap-6 w-full">
            {/* Hexagonal brand logo with CA */}
            <div className="p-0.5 cursor-pointer" title="Control-Ar Messenger">
              <svg className="h-9 w-9 text-[#a3e635] hover:scale-105 transition-transform" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6">
                <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" />
                <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="currentColor" fontSize="24" fontWeight="bold">CA</text>
              </svg>
            </div>

            {/* Navigation Icons list */}
            <div className="flex flex-col gap-3 w-full items-center">
              <button type="button" className="p-3 rounded-xl bg-zinc-800/60 text-[#a3e635] transition-all" title="Chats">
                <ChatIcon fontSize="small" />
              </button>
              <button type="button" onClick={() => window.location.href = "/contacts"} className="p-3 rounded-xl text-zinc-500 hover:text-zinc-300 transition-all hover:bg-zinc-800/20" title="Contactos">
                <PeopleIcon fontSize="small" />
              </button>
              <button type="button" className="p-3 rounded-xl text-zinc-500 hover:text-zinc-300 transition-all hover:bg-zinc-800/20" title="Bots">
                <AndroidIcon fontSize="small" />
              </button>
              <button type="button" onClick={() => window.location.href = "/stats"} className="p-3 rounded-xl text-zinc-500 hover:text-zinc-300 transition-all hover:bg-zinc-800/20" title="Estadísticas">
                <BarChartIcon fontSize="small" />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            {/* Toggle Config */}
            {canManageConfig && (
              <IconButton
                color={configOpen ? "primary" : "inherit"}
                onClick={() => setConfigOpen((open) => !open)}
                size="small"
                id="btn-settings-aside"
                sx={{ 
                  color: configOpen ? "#a3e635" : "rgba(255,255,255,0.4)",
                  "&:hover": { color: "white", backgroundColor: "rgba(255,255,255,0.05)" }
                }}
                title="Configuración de Credenciales WABA"
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            )}

            {/* Refresh */}
            <IconButton
              color="inherit"
              onClick={loadConversations}
              disabled={loadingConversations}
              size="small"
              sx={{ 
                color: "rgba(255,255,255,0.4)",
                "&:hover": { color: "white", backgroundColor: "rgba(255,255,255,0.05)" }
              }}
              title="Actualizar chats"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>

            {/* User Initials Circle */}
            <div 
              onClick={() => window.location.href = "/home"}
              className="h-8 w-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white cursor-pointer hover:ring-2 hover:ring-[#a3e635] transition" 
              title="Volver a Control-Ar Dashboard"
            >
              LD
            </div>
          </div>
        </aside>
      )}

      {/* Main Container Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" id="waba-main-viewport">
        
        {/* Collapsible config */}
        {canManageConfig && (
          <Collapse className="w-full shrink-0" in={configOpen} timeout="auto" unmountOnExit>
            <section className="w-full border-b border-[#1f2128] bg-[#111216] px-6 py-4 text-zinc-100">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">WhatsApp Cloud API</div>
                  <div className="truncate text-sm text-zinc-300">
                    {activeConfig?.id ? `Configuración activa #${activeConfig.id}` : "Completa las credenciales para habilitar el canal"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {configLoading ? <CircularProgress size={18} /> : null}
                  <Chip
                    size="small"
                    label={activeConfig?.has_access_token ? "Token OK" : "Token falta"}
                    color={activeConfig?.has_access_token ? "success" : "default"}
                    variant="outlined"
                    sx={{ color: "white", borderColor: "rgba(255,255,255,0.15)" }}
                  />
                  <Chip
                    size="small"
                    label={activeConfig?.has_verify_token ? "Verify OK" : "Verify falta"}
                    color={activeConfig?.has_verify_token ? "success" : "default"}
                    variant="outlined"
                    sx={{ color: "white", borderColor: "rgba(255,255,255,0.15)" }}
                  />
                  <Chip
                    size="small"
                    label={activeConfig?.has_app_secret ? "Secret OK" : "Secret falta"}
                    color={activeConfig?.has_app_secret ? "success" : "default"}
                    variant="outlined"
                    sx={{ color: "white", borderColor: "rgba(255,255,255,0.15)" }}
                  />
                </div>
              </div>
              {configError ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {configError}
                </Alert>
              ) : null}
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1.5fr_1.2fr_1.2fr_auto_auto]">
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
                    sx={{ m: 0, whiteSpace: "nowrap", color: "rgba(255,255,255,0.7)" }}
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
                    sx={{ 
                      minWidth: 120, 
                      backgroundColor: "#a3e635", 
                      color: "black",
                      fontWeight: "bold",
                      "&:hover": { backgroundColor: "#84cc16" },
                      "&.Mui-disabled": { backgroundColor: "rgba(163,230,53,0.3)", color: "rgba(0,0,0,0.4)" }
                    }}
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            </section>
          </Collapse>
        )}

        {/* 3-Pane Responsive Layout Body */}
        <div className="flex flex-1 min-h-0 w-full overflow-hidden" id="waba-split-panels">
          
          {/* A. Conversations Column (Panel 1) */}
          {(!isMobile || activeMobileView === "list") && (
            <section className="flex h-full w-full flex-col overflow-hidden bg-[#111216] border-r border-[#1f2128] lg:w-[320px] lg:shrink-0" id="waba-list-panel">
              <div className="p-4 flex flex-col shrink-0">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight text-white">Conversaciones</h2>
                    <IconButton 
                      size="small" 
                      onClick={toggleNotifications} 
                      disabled={pushLoading}
                      title={isSubscribed ? "Desactivar notificaciones" : "Activar notificaciones"}
                      sx={{ 
                        color: isSubscribed ? "#a3e635" : "rgba(255,255,255,0.3)",
                        "&:hover": { color: isSubscribed ? "#bef264" : "white" },
                        padding: 0.5
                      }}
                      id="btn-toggle-notifications"
                    >
                      {pushLoading ? (
                        <CircularProgress size={16} sx={{ color: isSubscribed ? "#a3e635" : "white" }} />
                      ) : isSubscribed ? (
                        <NotificationsActiveIcon sx={{ fontSize: 18 }} />
                      ) : (
                        <NotificationsOffIcon sx={{ fontSize: 18 }} />
                      )}
                    </IconButton>
                  </div>
                  
                  {/* Small mobile logo or tenant dropdown */}
                  {isMobile && canSelectTenant && tenantOptions.length > 0 && (
                    <TextField
                      select
                      size="small"
                      value={tenantId || ""}
                      onChange={(e) => setTenantId(e.target.value)}
                      sx={{
                        minWidth: 110,
                        "& .MuiInputBase-root": { height: 26, fontSize: "10px", color: "white" },
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                        "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.7)" },
                      }}
                    >
                      {tenantOptions.map((item) => (
                        <MenuItem key={item.id} value={item.id} sx={{ fontSize: "11px" }}>
                          {item.nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  {/* Desktop Organization info status */}
                  {!isMobile && canSelectTenant && tenantOptions.length > 0 && (
                    <div className="text-[10px] text-zinc-500 font-medium font-mono uppercase bg-zinc-900/60 px-2 py-0.5 rounded">
                      {tenantOptions.find(o => Number(o.id) === Number(tenantId))?.nombre || "CA"}
                    </div>
                  )}
                </div>

                {/* Local search bar */}
                <div className="relative mb-3">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                    <SearchIcon fontSize="small" />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar conversaciones..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1b1c21] border border-[#2d3039] rounded-full py-1.5 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#a3e635] transition-colors"
                  />
                </div>

                {/* Horizontal scrollable status filter tabs */}
                <div className="flex gap-4 overflow-x-auto whitespace-nowrap pb-2 mb-1 scrollbar-none border-b border-[#1f2128]">
                  {ESTADOS.map((tab) => {
                    const active = estado === tab.value;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setEstado(tab.value)}
                        className={[
                          "text-[10px] pb-1 transition-all duration-200 uppercase tracking-wider font-semibold",
                          active 
                            ? "text-[#a3e635] border-b-2 border-[#a3e635]" 
                            : "text-zinc-500 hover:text-zinc-300"
                        ].join(" ")}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chat list items */}
              <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-zinc-800/30 px-2">
                {filteredConversations.map((conversation) => {
                  const active = Number(conversation.id) === Number(selectedId);
                  const openWindow = in24hWindow(conversation);
                  const isAdLead = Boolean(conversation.ctwa_clid || conversation.source_ad_id);
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(conversation.id);
                        if (isMobile) {
                          setActiveMobileView("chat");
                        }
                      }}
                      id={`chat-item-${conversation.id}`}
                      className={[
                        "flex w-full items-start gap-3 px-3 py-3.5 rounded-xl transition-all duration-150 mb-1 border-l-2",
                        active 
                          ? "bg-zinc-800/30 border-[#a3e635]" 
                          : "hover:bg-zinc-800/10 border-transparent",
                      ].join(" ")}
                    >
                      {/* Avatar with online dot */}
                      <div className="relative shrink-0">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(conversation.wa_phone)} text-sm font-bold text-white shadow-sm`}>
                          {getInitials(conversation.contact_name || conversation.cliente_nombre, conversation.wa_phone)}
                        </div>
                        {/* online dot indicator */}
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#111216]" />
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="truncate text-xs font-semibold text-zinc-100">
                            {conversation.contact_name || conversation.cliente_nombre || conversation.wa_phone}
                          </span>
                          <span className="shrink-0 text-[9px] text-zinc-500 font-mono">
                            {formatDateTime(conversation.actualizado_en)}
                          </span>
                        </div>

                        {/* snippet text */}
                        <p className="mt-1 truncate text-[11px] text-zinc-400">
                          {(() => {
                            const lastMsg = conversation.ultimo_mensaje;
                            if (!lastMsg) return "Sin mensajes";
                            if (lastMsg.tipo === "image") return `📷 Foto${lastMsg.body ? `: ${lastMsg.body}` : ""}`;
                            if (lastMsg.tipo === "audio" || lastMsg.tipo === "voice") return `🎵 Audio`;
                            if (lastMsg.tipo === "video") return `🎥 Video${lastMsg.body ? `: ${lastMsg.body}` : ""}`;
                            if (lastMsg.tipo === "document") return `📄 Archivo: ${lastMsg.file_name || lastMsg.body || "Documento.pdf"}`;
                            return lastMsg.body || `[Mensaje: ${lastMsg.tipo}]`;
                          })()}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          {isAdLead && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#a3e635]/15 px-2 py-0.2 text-[8px] font-bold tracking-wider text-[#a3e635] uppercase">
                              📣 pauta
                            </span>
                          )}
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[8px] font-bold ${
                            openWindow 
                              ? "bg-emerald-950/40 text-emerald-400" 
                              : "bg-zinc-800 text-zinc-400"
                          }`}>
                            {openWindow ? "24h ok" : "24h off"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {!loadingConversations && filteredConversations.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-zinc-500">
                    Sin conversaciones.
                  </div>
                ) : null}
              </div>

              {/* Bottom Nueva conversación button */}
              <div className="p-3 border-t border-[#1f2128] shrink-0">
                <button 
                  type="button" 
                  onClick={loadConversations}
                  className="w-full border border-dashed border-zinc-800 hover:border-[#a3e635] hover:text-[#a3e635] rounded-xl py-2.5 text-xs flex justify-center items-center font-bold text-zinc-400 gap-2 transition"
                >
                  <span>+ Nueva conversación</span>
                </button>
              </div>
            </section>
          )}

          {/* B. Active Chat Column (Panel 2) */}
          {(!isMobile || activeMobileView === "chat") && (
            <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#0d0e12]" id="waba-chat-panel">
              {selected ? (
                <>
                  {/* Chat Header */}
                  <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#1f2128] px-4 bg-[#0d0e12]" id="crm-chat-header">
                    <div className="flex items-center gap-3 min-w-0">
                      {isMobile && (
                        <IconButton
                          onClick={() => setActiveMobileView("list")}
                          size="small"
                          sx={{ color: "rgba(255,255,255,0.5)", mr: 0.5 }}
                          id="btn-back-to-list"
                        >
                          <ArrowBackIcon fontSize="small" />
                        </IconButton>
                      )}

                      <div className="relative shrink-0">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(selected.wa_phone)} text-xs font-bold text-white shadow-sm`}>
                          {getInitials(selected.contact_name || selected.cliente_nombre, selected.wa_phone)}
                        </div>
                        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[#0d0e12]" />
                      </div>
                      
                      <div className="min-w-0 leading-tight">
                        <span className="truncate text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                          {selected.contact_name || selected.cliente_nombre || selected.wa_phone}
                          {Boolean(selected.ctwa_clid || selected.source_ad_id) && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#a3e635]/15 px-1.5 py-0.2 text-[7px] font-bold tracking-wider text-[#a3e635] uppercase">
                              📣 pauta
                            </span>
                          )}
                        </span>
                        <p className="text-[10px] text-zinc-400 font-medium truncate flex items-center gap-1 mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#a3e635]" />
                          En línea
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* State selector dropdown */}
                      <TextField
                        select
                        size="small"
                        label="Estado Lead"
                        value={selected.estado || "nuevo"}
                        onChange={(event) => handleEstadoChange(event.target.value)}
                        id="select-estado-chat"
                        sx={{ 
                          ...fieldSx, 
                          minWidth: 120,
                          "& .MuiInputBase-root": { height: 32, fontSize: "11px" },
                          "& .MuiInputLabel-root": { fontSize: "11px", transform: "translate(14px, 8px) scale(1)" },
                          "& .MuiInputLabel-shrink": { transform: "translate(14px, -6px) scale(0.75)" },
                        }}
                      >
                        {ESTADOS.filter((item) => item.value).map((item) => (
                          <MenuItem key={item.value} value={item.value} sx={{ fontSize: "11px" }}>
                            {item.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <IconButton size="small" sx={{ color: "rgba(255,255,255,0.4)" }}>
                        <SearchIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" sx={{ color: "rgba(255,255,255,0.4)" }}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </div>
                  </div>

                  {/* Bubbles Scroll Box */}
                  <div className="min-h-0 flex-1 overflow-y-auto bg-[#0d0e12] px-6 py-5">
                    {loadingMessages ? (
                      <div className="flex h-full items-center justify-center">
                        <CircularProgress size={24} sx={{ color: "#a3e635" }} />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3.5">
                        {messages.map((message) => {
                          const outbound = message.direction === "outbound";
                          return (
                            <div key={message.id} className={["flex w-full", outbound ? "justify-end" : "justify-start"].join(" ")}>
                              <div
                                className={[
                                  "max-w-[85%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl shadow-sm text-[12px] leading-relaxed",
                                  outbound
                                    ? "rounded-tr-none bg-[#a3e635] text-zinc-950 font-medium"
                                    : "rounded-tl-none bg-[#1b1c21] text-zinc-100 border border-[#23252d]",
                                ].join(" ")}
                              >
                                {message.tipo === "document" ? (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 bg-zinc-900/30 p-2 rounded-xl">
                                      <InsertDriveFileIcon fontSize="medium" className={outbound ? "text-zinc-950" : "text-[#a3e635]"} />
                                      <div className="min-w-0">
                                        <p className="truncate font-bold text-xs">{message.file_name || message.body || "Documento.pdf"}</p>
                                        <p className="text-[9px] opacity-70">
                                          {message.file_size ? `${(message.file_size / (1024 * 1024)).toFixed(2)} MB` : "Archivo"} • {message.mime_type ? message.mime_type.split("/")[1].toUpperCase() : "Documento"}
                                        </p>
                                      </div>
                                    </div>
                                    {message.file_url && (
                                      <button 
                                        onClick={() => window.open(message.file_url, "_blank")}
                                        className={`w-full py-1 text-[10px] font-bold rounded-lg border text-center transition ${
                                          outbound 
                                            ? "border-zinc-950 text-zinc-950 hover:bg-zinc-950 hover:text-[#a3e635]" 
                                            : "border-[#a3e635]/30 text-[#a3e635] hover:bg-[#a3e635] hover:text-black"
                                        }`}
                                      >
                                        Abrir archivo
                                      </button>
                                    )}
                                  </div>
                                ) : message.tipo === "image" ? (
                                  <div className="flex flex-col gap-1.5">
                                    {message.file_url ? (
                                      <img 
                                        src={message.file_url} 
                                        alt={message.file_name || "Imagen"} 
                                        onClick={() => window.open(message.file_url, "_blank")}
                                        className="rounded-xl max-w-full max-h-72 object-contain cursor-pointer hover:opacity-90 transition duration-200" 
                                      />
                                    ) : (
                                      <div className="text-xs italic opacity-70">[Imagen no disponible]</div>
                                    )}
                                    {message.body && (
                                      <div className="whitespace-pre-wrap break-words mt-1 text-xs">
                                        {message.body}
                                      </div>
                                    )}
                                  </div>
                                ) : (message.tipo === "audio" || message.tipo === "voice") ? (
                                  <div className="flex flex-col gap-1">
                                    {message.file_url ? (
                                      <audio 
                                        controls 
                                        src={message.file_url} 
                                        className="mt-1 min-w-[200px] max-w-full h-8 text-black" 
                                      />
                                    ) : (
                                      <div className="text-xs italic opacity-70">[Audio no disponible]</div>
                                    )}
                                  </div>
                                ) : message.tipo === "video" ? (
                                  <div className="flex flex-col gap-1.5">
                                    {message.file_url ? (
                                      <video 
                                        controls 
                                        src={message.file_url} 
                                        className="max-w-full max-h-72 rounded-xl mt-1 object-contain" 
                                      />
                                    ) : (
                                      <div className="text-xs italic opacity-70">[Video no disponible]</div>
                                    )}
                                    {message.body && (
                                      <div className="whitespace-pre-wrap break-words mt-1 text-xs">
                                        {message.body}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="whitespace-pre-wrap break-words">
                                    {message.body || `[Mensaje: ${message.tipo}]`}
                                  </div>
                                )}
                                
                                <div className={["mt-1.5 flex items-center justify-end gap-1 text-[9px]", outbound ? "text-zinc-900/80" : "text-zinc-500 font-mono"].join(" ")}>
                                  <span>{formatDateTime(message.timestamp)}</span>
                                  {outbound && renderMessageStatusIcon(message.estado)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {messages.length === 0 ? (
                          <div className="text-center text-xs text-zinc-500 py-12">
                            Sin mensajes en esta conversación.
                          </div>
                        ) : null}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Input controls footer */}
                  <div className="shrink-0 border-t border-[#1f2128] bg-[#0d0e12] p-4">
                    {error ? <div className="mb-2 text-xs font-semibold text-red-500">{error}</div> : null}
                    
                    {!in24hWindow(selected) ? (
                      <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-300">
                        <div className="flex items-start gap-2">
                          <span className="text-sm shrink-0">⚠️</span>
                          <div>
                            <p className="font-bold text-amber-200">Ventana de 24 horas vencida</p>
                            <p className="mt-0.5">La ventana de conversación libre de WhatsApp está cerrada. Envía una plantilla aprobada por Meta para contactar al cliente.</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Chat field styling matching image */}
                    <div className="flex items-center gap-2.5 bg-[#1b1c21] border border-[#23252d] rounded-full px-4 py-2">
                      <IconButton size="small" sx={{ color: "rgba(255,255,255,0.4)", p: 0.5 }}>
                        <EmojiEmotionsIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" sx={{ color: "rgba(255,255,255,0.4)", p: 0.5 }}>
                        <AttachFileIcon fontSize="small" className="-rotate-45" />
                      </IconButton>
                      
                      <input
                        type="text"
                        placeholder="Escribe un mensaje..."
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            handleSend();
                          }
                        }}
                        disabled={!canReply}
                        className="flex-1 bg-transparent border-none focus:outline-none text-xs text-white placeholder-zinc-500 disabled:cursor-not-allowed"
                      />

                      <IconButton
                        onClick={handleSend}
                        disabled={!canReply || !body.trim()}
                        id="btn-send-waba"
                        sx={{ 
                          height: 30, 
                          width: 30, 
                          backgroundColor: canReply && body.trim() ? "#a3e635" : "rgba(255,255,255,0.05)",
                          color: canReply && body.trim() ? "black" : "rgba(255,255,255,0.2)",
                          "&:hover": {
                            backgroundColor: canReply && body.trim() ? "#84cc16" : "rgba(255,255,255,0.05)",
                          }
                        }}
                      >
                        <SendIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center p-6 text-zinc-500 bg-[#0d0e12]">
                  <span className="text-4xl mb-2">💬</span>
                  <p className="text-xs font-semibold">Selecciona una conversación para chatear</p>
                </div>
              )}
            </section>
          )}

          {/* C. Client Profile Details Column (Panel 3 - Desktop Only) */}
          {!isMobile && selected && (
            <section className="hidden xl:flex h-full w-[280px] shrink-0 flex-col overflow-hidden bg-[#111216] border-l border-[#1f2128]" id="waba-profile-panel">
              <div className="p-5 flex flex-col gap-5 overflow-y-auto h-full text-zinc-100">
                <div className="text-center pt-2">
                  {/* Large avatar with dynamic gradient */}
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(selected.wa_phone)} text-2xl font-bold text-white shadow-md mx-auto relative`}>
                    {getInitials(selected.contact_name || selected.cliente_nombre, selected.wa_phone)}
                    <span className="absolute bottom-0 right-1 h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-[#111216] flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-white mt-3.5 truncate">{selected.contact_name || selected.cliente_nombre || selected.wa_phone}</h2>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">{selected.wa_phone}</p>
                </div>

                <div className="border-t border-[#1f2128] pt-4">
                  <h3 className="text-[10px] font-bold text-[#a3e635] uppercase tracking-wider mb-2.5">Información de contacto</h3>
                  <div className="flex flex-col gap-2.5 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <PhoneIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }} />
                      <span className="font-mono">{selected.wa_phone}</span>
                    </div>
                    {selected.cliente_codigo && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-500 text-[10px]">COD:</span>
                        <span>{selected.cliente_codigo}</span>
                      </div>
                    )}
                    <div className="mt-1">
                      {Boolean(selected.ctwa_clid || selected.source_ad_id) ? (
                        <span className="inline-flex items-center rounded-full bg-[#a3e635]/10 px-2 py-0.5 text-[9px] font-bold text-[#a3e635] uppercase tracking-wide">
                          Cliente VIP Pauta
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400 uppercase tracking-wide">
                          Contacto Orgánico
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ads campaign properties */}
                {(selected.ctwa_clid || selected.source_ad_id) && (
                  <div className="border-t border-[#1f2128] pt-4">
                    <h3 className="text-[10px] font-bold text-[#a3e635] uppercase tracking-wider mb-2.5">Detalles de Campaña Meta</h3>
                    <div className="flex flex-col gap-2 text-xs text-zinc-300 font-mono">
                      {selected.source_ad_id && (
                        <div>
                          <p className="text-[9px] text-zinc-500 uppercase tracking-wider">ID de Anuncio</p>
                          <p className="break-all mt-1 text-[10px] bg-zinc-900/60 p-2 rounded border border-zinc-800/40 text-zinc-400">{selected.source_ad_id}</p>
                        </div>
                      )}
                      {selected.ctwa_clid && (
                        <div className="mt-2.5">
                          <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Click clid</p>
                          <p className="break-all mt-1 text-[10px] bg-zinc-900/60 p-2 rounded border border-zinc-800/40 text-zinc-400">{selected.ctwa_clid}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* WABA verify properties */}
                <div className="border-t border-[#1f2128] pt-4 mt-auto">
                  <h3 className="text-[10px] font-bold text-[#a3e635] uppercase tracking-wider mb-2.5">Información WABA</h3>
                  <div className="flex flex-col gap-2.5 text-xs text-zinc-400">
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase">Número asignado</p>
                      <p className="text-zinc-200 font-semibold mt-0.5 font-mono">{selected.wa_phone}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-900 pt-2">
                      <span className="text-[9px] text-zinc-500">Estado</span>
                      <span className="inline-flex items-center gap-1 font-bold text-[10px] text-[#a3e635]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#a3e635]" />
                        CONECTADO
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-500">Calificación</span>
                      <span className="text-zinc-200 text-[10px] font-bold">ALTA</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      </div>

    </div>
  );
}
