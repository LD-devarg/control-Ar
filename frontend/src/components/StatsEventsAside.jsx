import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { apiClient } from "../services/auth";
import { subscribeRealtimeEvents } from "../services/realtime";
import ModalBase from "./ModalBase.jsx";
import { useTenant } from "../context/TenantContext";
import "../assets/css/RecentPurchasesTable.css";
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined';
import WhatshotOutlinedIcon from '@mui/icons-material/WhatshotOutlined';

const REFRESH_DEBOUNCE_MS = 500;
const REFRESH_COOLDOWN_MS = 5000;
const POLL_INTERVAL_MS = 60000;

function normalizeEventType(rawType) {
  return String(rawType || "").toLowerCase();
}

function getEventBadgeTheme(rawType) {
  const type = normalizeEventType(rawType);
  if (type === "compra" || type === "purchase") {
    return {
      text: "text-emerald-300",
      border: "border-emerald-400/60",
      bg: "bg-emerald-500/10",
    };
  }
  if (type === "contacto" || type === "contact") {
    return {
      text: "text-yellow-300",
      border: "border-yellow-400/60",
      bg: "bg-yellow-500/10",
    };
  }
  return {
    text: "text-sky-300",
    border: "border-sky-400/60",
    bg: "bg-sky-500/10",
  };
}

function getEventAccent(rawType) {
  const type = normalizeEventType(rawType);
  if (type === "compra" || type === "purchase") return "text-emerald-300";
  if (type === "contacto" || type === "contact") return "text-yellow-300";
  return "text-sky-300";
}

function getEventLabel(rawType) {
  const type = normalizeEventType(rawType);
  if (type === "compra" || type === "purchase") return "Compra";
  if (type === "contacto" || type === "contact") return "Contacto";
  return "Lead";
}

function getEventFilter(rawType) {
  const type = normalizeEventType(rawType);
  if (type === "compra" || type === "purchase") return "compra";
  if (type === "contacto" || type === "contact") return "contacto";
  return "lead";
}

function getEventIcon(rawType) {
  const type = normalizeEventType(rawType);
  if (type === "compra" || type === "purchase") return ShoppingCartOutlinedIcon;
  if (type === "contacto" || type === "contact") return ChatBubbleOutlineOutlinedIcon;
  return PendingActionsOutlinedIcon;
}

function buildEventDisplayName(item) {
  const codigo = String(item?.cliente_codigo || "").trim();
  const nombre = String(item?.nombre || "").trim();
  const username = String(item?.username || "").trim();
  const clienteId = String(item?.cliente || item?.cliente_id || "").trim();

  if (nombre) return nombre;
  if (username && !/^lead\d+$/i.test(username)) return username;
  if (codigo) return `Lead #${codigo}`;
  if (username) return username.replace(/^lead/i, "Lead #");
  if (clienteId) return `Cliente #${clienteId}`;
  return "Evento";
}

function resolveEventCodes(item) {
  const requestedCodigo = String(item?.codigo_solicitado || "").trim();
  const finalCodigo = String(item?.codigo_final || item?.cliente_codigo || "").trim();
  const hasCodigoMismatch = Boolean(
    item?.codigo_provisorio_distinto && requestedCodigo && finalCodigo && requestedCodigo !== finalCodigo
  );
  return { requestedCodigo, finalCodigo, hasCodigoMismatch };
}

function formatEventResult(item) {
  switch (item?.resultado) {
    case "creado":
      return "Cliente nuevo";
    case "creado_reasignado":
      return "Cliente nuevo con codigo reasignado";
    case "deduplicado_fingerprint":
      return "Intento deduplicado por fingerprint";
    case "deduplicado_lead":
      return "Intento deduplicado por lead reciente";
    case "deduplicado_evento_reciente":
      return "Intento deduplicado por evento reciente";
    default:
      return "";
  }
}

function buildCacheKey({ tenantId, usePeriod, period, desde, hasta }) {
  const rangeKey = usePeriod
    ? `period:${period || ""}`
    : `from:${desde?.format("YYYY-MM-DD") || ""}:to:${hasta?.format("YYYY-MM-DD") || ""}`;
  return `stats_events_aside:${tenantId || "all"}:${rangeKey}`;
}

function readCachedEvents(cacheKey) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(cacheKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildDayGroups(items) {
  const now = dayjs();
  const grouped = new Map();

  items.forEach((item) => {
    const date = dayjs(item?.fecha_hora);
    let label = date.format("DD/MM/YYYY");
    if (date.isSame(now, "day")) label = "Hoy";
    else if (date.isSame(now.subtract(1, "day"), "day")) label = "Ayer";

    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label).push(item);
  });

  return Array.from(grouped.entries()).map(([label, rows]) => ({ label, rows }));
}

function StatsEventsAsideComponent({ usePeriod, period, desde, hasta, fullHeight = false }) {
  const { tenantId } = useTenant();
  const [searchParams] = useSearchParams();
  const fallbackPeriod = useMemo(() => {
    const rawPeriod = searchParams.get("period");
    return ["day", "week", "month"].includes(rawPeriod) ? rawPeriod : "week";
  }, [searchParams]);
  const fallbackDesde = useMemo(() => {
    const rawFrom = searchParams.get("from");
    const parsed = rawFrom ? dayjs(rawFrom) : null;
    return parsed?.isValid?.() ? parsed : dayjs();
  }, [searchParams]);
  const fallbackHasta = useMemo(() => {
    const rawTo = searchParams.get("to");
    const parsed = rawTo ? dayjs(rawTo) : null;
    return parsed?.isValid?.() ? parsed : dayjs();
  }, [searchParams]);
  const effectiveUsePeriod = typeof usePeriod === "boolean"
    ? usePeriod
    : !(searchParams.get("from") && searchParams.get("to"));
  const effectivePeriod = period || fallbackPeriod;
  const effectiveDesde = desde || fallbackDesde;
  const effectiveHasta = hasta || fallbackHasta;
  const cacheKey = useMemo(
    () => buildCacheKey({
      tenantId,
      usePeriod: effectiveUsePeriod,
      period: effectivePeriod,
      desde: effectiveDesde,
      hasta: effectiveHasta,
    }),
    [tenantId, effectiveUsePeriod, effectivePeriod, effectiveDesde, effectiveHasta]
  );
  const [events, setEvents] = useState(() => readCachedEvents(cacheKey));
  const [loading, setLoading] = useState(() => readCachedEvents(cacheKey).length === 0);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [highlightedIds, setHighlightedIds] = useState([]);
  const [activeFilter, setActiveFilter] = useState("todos");
  const removeHighlightTimersRef = useRef([]);
  const activeRequestRef = useRef(null);
  const abortTimerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const lastRefreshAtRef = useRef(0);

  const queryParams = useMemo(
    () =>
      effectiveUsePeriod
        ? { period: effectivePeriod, limit: 50 }
        : {
            from: effectiveDesde?.format("YYYY-MM-DD"),
            to: effectiveHasta?.format("YYYY-MM-DD"),
            limit: 50,
          },
    [effectiveUsePeriod, effectivePeriod, effectiveDesde, effectiveHasta, tenantId]
  );

  const formatDateTime = (value) => (value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-");
  const formatClock = (value) => (value ? dayjs(value).format("HH:mm") : "--:--");
  const formatUsd = (value) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(Number(value || 0));
  const formatArs = (value) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(Number(value || 0));

  const loadEvents = useCallback(
    async (signal) => {
      setLoading(true);
      try {
        const { data } = await apiClient.get("/stats/eventos-recientes/", {
          params: queryParams,
          signal,
        });
        const nextRows = Array.isArray(data) ? data : [];
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(cacheKey, JSON.stringify(nextRows));
        }
        setEvents((prevRows) => {
          const prevIds = new Set(prevRows.map((item) => item.id));
          const newIds = nextRows
            .filter((item) => item?.id && !prevIds.has(item.id))
            .map((item) => item.id);

          if (newIds.length > 0) {
            setHighlightedIds((prev) => Array.from(new Set([...prev, ...newIds])));
            const timerId = setTimeout(() => {
              setHighlightedIds((prev) => prev.filter((id) => !newIds.includes(id)));
            }, 2500);
            removeHighlightTimersRef.current.push(timerId);
          }
          return nextRows;
        });
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
          return;
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [cacheKey, queryParams]
  );

  const triggerRefresh = useCallback((options = {}) => {
    const { force = false } = options;
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    if (abortTimerRef.current) {
      clearTimeout(abortTimerRef.current);
    }
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    const now = Date.now();
    const elapsed = now - lastRefreshAtRef.current;
    const delay = force || elapsed >= REFRESH_COOLDOWN_MS ? 0 : REFRESH_DEBOUNCE_MS;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    refreshTimerRef.current = setTimeout(() => {
      lastRefreshAtRef.current = Date.now();
      loadEvents(controller.signal);
      abortTimerRef.current = setTimeout(() => controller.abort(), 15000);
    }, delay);
  }, [loadEvents]);

  useEffect(() => {
    setEvents(readCachedEvents(cacheKey));
  }, [cacheKey]);

  useEffect(() => {
    triggerRefresh({ force: true });
    const pollId = setInterval(() => triggerRefresh(), POLL_INTERVAL_MS);
    return () => {
      clearInterval(pollId);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
      if (abortTimerRef.current) {
        clearTimeout(abortTimerRef.current);
      }
      removeHighlightTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      removeHighlightTimersRef.current = [];
    };
  }, [triggerRefresh]);

  useEffect(() => {
    const onLeadRefresh = () => triggerRefresh();
    const onCompraCreated = () => triggerRefresh();
    const onStorage = (event) => {
      if (event.key === "leads_refresh_ts" || event.key === "compra:last-created") {
        triggerRefresh();
      }
    };
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        triggerRefresh();
      }
    };
    window.addEventListener("leads:refresh", onLeadRefresh);
    window.addEventListener("compra:created", onCompraCreated);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("leads:refresh", onLeadRefresh);
      window.removeEventListener("compra:created", onCompraCreated);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [triggerRefresh]);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvents((message) => {
      if (message?.type === "lead_created" || message?.type === "compra_created") {
        triggerRefresh();
      }
    });
    return unsubscribe;
  }, [triggerRefresh]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === "todos") return events;
    return events.filter((item) => getEventFilter(item.evento) === activeFilter);
  }, [activeFilter, events]);

  const groupedEvents = useMemo(() => buildDayGroups(filteredEvents), [filteredEvents]);

  const todayMetrics = useMemo(() => {
    const today = dayjs();
    return events.reduce(
      (acc, item) => {
        const itemDate = dayjs(item?.fecha_hora);
        if (!itemDate.isSame(today, "day")) return acc;
        const type = getEventFilter(item?.evento);
        if (type === "compra") {
          acc.totalUsd += Number(item?.monto_usd || 0);
        } else if (type === "contacto") {
          acc.contactos += 1;
        } else if (type === "lead") {
          acc.leads += 1;
        }
        return acc;
      },
      { totalUsd: 0, contactos: 0, leads: 0 }
    );
  }, [events]);

  return (
    <aside
      className={`w-full rounded-2xl border border-[#1f2128] bg-[#111216] p-4 text-white ${
        fullHeight ? "h-full flex flex-col" : ""
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Eventos</h3>
        <span className="text-xs text-white/55">{loading ? "Actualizando..." : "Tiempo real"}</span>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {[
          { key: "todos", label: "Todos" },
          { key: "compra", label: "Compras" },
          { key: "contacto", label: "Contactos" },
          { key: "lead", label: "Leads" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveFilter(item.key)}
            className={`rounded-xl px-3 py-2 text-[10px] font-semibold transition-colors ${
              activeFilter === item.key
                ? "bg-[#a3e635]/10 text-[#a3e635] ring-1 ring-[#a3e635]/30"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-[#1f2128]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-5 rounded-2xl border border-[#1f2128] bg-[#1b1c21] px-2 py-3">
        <div className="mb-1 pl-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Hoy</div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
          <div className="inline-flex items-center gap-1 text-[#a3e635]">
            <PaidOutlinedIcon sx={{ fontSize: 14 }} />
            <span className="text-[14px] font-semibold">{formatUsd(todayMetrics.totalUsd)}</span>
          </div>
          <span className="text-white/20">|</span>
          <div className="inline-flex items-center gap-1 text-amber-400">
            <MailOutlineOutlinedIcon sx={{ fontSize: 14 }} />
            <span className="text-[14px] font-semibold">{todayMetrics.contactos} contactos</span>
          </div>
          <span className="text-white/20">|</span>
          <div className="inline-flex items-center gap-1 text-sky-400">
            <WhatshotOutlinedIcon sx={{ fontSize: 14 }} />
            <span className="text-[14px] font-semibold">{todayMetrics.leads} leads</span>
          </div>
        </div>
      </div>

      <div
        className={`recent-compras-scroll overflow-y-auto pr-1 ${
          fullHeight ? "flex-1 min-h-0" : "max-h-[46vh] sm:max-h-[52vh]"
        }`}
      >
        {!loading && filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-[#1f2128] bg-[#1b1c21] px-3 py-4 text-sm text-zinc-400">
            Sin eventos para este rango.
          </div>
        ) : null}

        <div className="space-y-5">
          {groupedEvents.map((group) => (
            <section key={group.label}>
              <div className="mb-2 flex items-center gap-3">
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <div>
                {group.rows.map((item) => {
                  const isCompra = getEventFilter(item.evento) === "compra";
                  const accentClass = getEventAccent(item.evento);
                  const Icon = getEventIcon(item.evento);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedEvent(item)}
                      className={`group grid w-full grid-cols-[44px_minmax(0,1fr)_96px] items-start gap-2 border-b border-[#1f2128]/50 py-3 text-left transition-colors ${
                        highlightedIds.includes(item.id)
                          ? "bg-[#a3e635]/10"
                          : "hover:bg-zinc-800/10"
                      }`}
                    >
                      <div className="pt-1 text-[13px] font-medium tabular-nums text-zinc-500">
                        {formatClock(item.fecha_hora)}
                      </div>

                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <Icon className={accentClass} sx={{ fontSize: 14 }} />
                          <span className="truncate text-[14px] font-semibold text-white">
                            {buildEventDisplayName(item)}
                          </span>
                        </div>
                        <div className="mt-1 pl-6 text-[12px] text-zinc-400">
                          {getEventLabel(item.evento)} {" • "} {formatClock(item.fecha_hora)}
                        </div>
                      </div>

                      <div className="pt-0.5 text-right">
                        {isCompra ? (
                          <span className="block whitespace-nowrap text-[16px] font-semibold tracking-[0.01em] text-[#a3e635]">
                            {formatUsd(item.monto_usd)}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <ModalBase
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={`Detalle de ${selectedEvent?.evento_label || "evento"}`}
        actions={null}
      >
        {selectedEvent ? (
          <div className="space-y-2 text-sm">
            {resolveEventCodes(selectedEvent).hasCodigoMismatch ? (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-amber-200">
                <strong>Codigo reasignado:</strong> se solicito {resolveEventCodes(selectedEvent).requestedCodigo || "-"} y se asigno {resolveEventCodes(selectedEvent).finalCodigo || "-"}.
              </div>
            ) : null}
            <p>
              <strong>Usuario:</strong> {buildEventDisplayName(selectedEvent)}
            </p>
            <p>
              <strong>Fecha y hora:</strong> {formatDateTime(selectedEvent.fecha_hora)}
            </p>
            {formatEventResult(selectedEvent) ? (
              <p>
                <strong>Resultado:</strong> {formatEventResult(selectedEvent)}
              </p>
            ) : null}
            {selectedEvent.motivo ? (
              <p>
                <strong>Motivo:</strong> {selectedEvent.motivo}
              </p>
            ) : null}
            {(selectedEvent.codigo_solicitado || selectedEvent.codigo_final || selectedEvent.cliente_codigo) ? (
              <>
                <p>
                  <strong>Codigo solicitado:</strong> {resolveEventCodes(selectedEvent).requestedCodigo || "-"}
                </p>
                <p>
                  <strong>Codigo final:</strong> {resolveEventCodes(selectedEvent).finalCodigo || "-"}
                </p>
              </>
            ) : null}
            {selectedEvent.nombre ? (
              <p>
                <strong>Nombre:</strong> {selectedEvent.nombre}
              </p>
            ) : null}
            {selectedEvent.contacto ? (
              <p>
                <strong>Contacto:</strong> {selectedEvent.contacto}
              </p>
            ) : null}
            {selectedEvent.evento === "compra" ? (
              <>
                <p>
                  <strong>Monto USD:</strong> {formatUsd(selectedEvent.monto_usd)}
                </p>
                <p>
                  <strong>Monto ARS:</strong> {formatArs(selectedEvent.monto_ars)}
                </p>
                <p>
                  <strong>Operador:</strong> {selectedEvent.operador || "-"}
                </p>
                {selectedEvent.comprobante_url ? (
                  <div className="space-y-2">
                    <p>
                      <strong>Comprobante:</strong>
                    </p>
                    <a
                      href={selectedEvent.comprobante_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-md border border-cyan-400/60 bg-cyan-500/10 px-3 py-1.5 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
                    >
                      Ver comprobante
                    </a>
                    {selectedEvent.comprobante_url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                      <img
                        src={selectedEvent.comprobante_url}
                        alt="Comprobante"
                        className="max-h-72 w-full rounded-lg border border-white/10 object-contain"
                      />
                    ) : null}
                  </div>
                ) : (
                  <p>
                    <strong>Comprobante:</strong> -
                  </p>
                )}
              </>
            ) : null}
          </div>
        ) : null}
      </ModalBase>
    </aside>
  );
}

const StatsEventsAside = memo(StatsEventsAsideComponent);

export default StatsEventsAside;
