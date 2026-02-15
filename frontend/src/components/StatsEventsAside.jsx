import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { apiClient } from "../services/auth";
import { subscribeRealtimeEvents } from "../services/realtime";
import ModalBase from "./ModalBase.jsx";
import { useTenant } from "../context/TenantContext";
import "../assets/css/RecentPurchasesTable.css";

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
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedEvent(item)}
              className={`w-full rounded-[18px] cursor-pointer px-4 py-2 text-left transition-all duration-200 ${
                highlightedIds.includes(item.id)
                  ? "border-cyan-400/70 bg-green-200/90"
                  : "border-white/10 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:border-white/30"
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-white/65">
                <span>{item.evento_label}</span>
                <span>{formatDateTime(item.fecha_hora)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm xl:text-lg font-semibold text-white">
                  {item.username || "Sin username"}
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
              <strong>Username:</strong> {selectedEvent.username || "-"}
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
                      className="inline-block text-blue-500 underline"
                    >
                      Abrir comprobante
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
