import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { apiClient } from "../services/auth";
import { subscribeRealtimeEvents } from "../services/realtime";
import ModalBase from "./ModalBase.jsx";
import { useTenant } from "../context/TenantContext";
import "../assets/css/RecentPurchasesTable.css";
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';

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
      text: "text-amber-300",
      border: "border-amber-400/60",
      bg: "bg-amber-500/10",
    };
  }
  return {
    text: "text-sky-300",
    border: "border-sky-400/60",
    bg: "bg-sky-500/10",
  };
}

function buildEventDisplayName(item) {
  const username = String(item?.username || "").trim();
  const nombre = String(item?.nombre || "").trim();
  const codigo = String(item?.cliente_codigo || "").trim();
  const clienteId = String(item?.cliente || "").trim();

  if (username) return username;
  if (nombre) return nombre;
  if (codigo) return `ID ${codigo}`;
  if (clienteId) return `Cliente #${clienteId}`;
  return "Evento";
}

function StatsEventsAsideComponent({ usePeriod, period, desde, hasta, fullHeight = false }) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [highlightedIds, setHighlightedIds] = useState([]);
  const removeHighlightTimersRef = useRef([]);
  const activeRequestRef = useRef(null);
  const abortTimerRef = useRef(null);

  const queryParams = useMemo(
    () =>
      usePeriod
        ? { period, limit: 25 }
        : {
            from: desde?.format("YYYY-MM-DD"),
            to: hasta?.format("YYYY-MM-DD"),
            limit: 25,
          },
    [usePeriod, period, desde, hasta, tenantId]
  );

  const formatDateTime = (value) => (value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-");
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
    [queryParams]
  );

  const triggerRefresh = useCallback(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    if (abortTimerRef.current) {
      clearTimeout(abortTimerRef.current);
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;
    loadEvents(controller.signal);
    abortTimerRef.current = setTimeout(() => controller.abort(), 15000);
  }, [loadEvents]);

  useEffect(() => {
    triggerRefresh();
    const pollId = setInterval(() => triggerRefresh(), 30000);
    return () => {
      clearInterval(pollId);
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
    const onFocus = () => triggerRefresh();
    window.addEventListener("leads:refresh", onLeadRefresh);
    window.addEventListener("compra:created", onCompraCreated);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("leads:refresh", onLeadRefresh);
      window.removeEventListener("compra:created", onCompraCreated);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
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

  return (
    <aside
      className={`w-full rounded-2xl shadow-xl shadow-black bg-white dark:bg-neutral-900 p-4 text-white ${
        fullHeight ? "h-full flex flex-col" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base text-black dark:text-white font-semibold">Eventos</h3>
        <span className="text-xs text-black/80 dark:text-white/60">{loading ? "Actualizando..." : "Tiempo real"}</span>
      </div>

      <div
        className={`recent-compras-scroll space-y-2 overflow-y-auto pr-1 ${
          fullHeight ? "flex-1 min-h-0" : "max-h-[46vh] sm:max-h-[52vh]"
        }`}
      >
        {!loading && events.length === 0 ? (
          <div className="rounded-xl bg-white dark:bg-neutral-900 px-3 py-4 text-sm text-black/60 dark:text-white/60">
            Sin eventos para este rango.
          </div>
        ) : null}

        {events.map((item) => {
          const isCompra = item.evento === "compra";
          const badgeTheme = getEventBadgeTheme(item.evento);
          const eventType = normalizeEventType(item.evento);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedEvent(item)}
              className={`w-full rounded-[18px] cursor-pointer px-4 py-2 text-left transition-all duration-200 ${
                highlightedIds.includes(item.id)
                  ? "border-cyan-400/70 bg-green-200/20"
                  : "border-white/10 bg-gradient-to-r from-black to-black/80 hover:border-white/30 hover:bg-gradient-to-r hover:from-black/80 hover:to-black/60"
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-white/65">
                <div className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-none ${badgeTheme.bg} ${badgeTheme.text} ${badgeTheme.border}`}>
                  <div>
                    {eventType === "compra" || eventType === "purchase" ? (
                      <ShoppingCartOutlinedIcon sx={{ fontSize: 14 }} />
                    ) : eventType === "lead" || eventType === "lead_creado" ? (
                      <PendingActionsOutlinedIcon sx={{ fontSize: 14 }} />
                    ) : (
                      <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 14 }} />
                    )}
                  </div>
                  <span>{item.evento_label}</span>
                </div>
                <span>{formatDateTime(item.fecha_hora)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm xl:text-lg font-semibold text-white">
                  {buildEventDisplayName(item)}
                </span>
                {isCompra ? (
                  <span className="shrink-0 text-base font-semibold text-cyan-300">
                    {formatUsd(item.monto_usd)}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <ModalBase
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={`Detalle de ${selectedEvent?.evento_label || "evento"}`}
        actions={null}
      >
        {selectedEvent ? (
          <div className="space-y-2 text-sm">
            <p>
              <strong>Usuario:</strong> {buildEventDisplayName(selectedEvent)}
            </p>
            <p>
              <strong>Fecha y hora:</strong> {formatDateTime(selectedEvent.fecha_hora)}
            </p>
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
