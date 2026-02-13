import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { apiClient } from "../services/auth";
import { subscribeRealtimeEvents } from "../services/realtime";
import "../assets/css/RecentPurchasesTable.css";

function RecentPurchasesTableComponent({ usePeriod, period, desde, hasta }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [highlightedIds, setHighlightedIds] = useState([]);
  const removeHighlightTimersRef = useRef([]);
  const activeRequestRef = useRef(null);
  const abortTimerRef = useRef(null);

  const queryParams = useMemo(
    () =>
      usePeriod
        ? { period, limit: 20 }
        : {
            from: desde?.format("YYYY-MM-DD"),
            to: hasta?.format("YYYY-MM-DD"),
            limit: 20,
          },
    [usePeriod, period, desde, hasta]
  );

  const arsFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }),
    []
  );
  const usdFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }),
    []
  );

  const formatDateTime = (value) => (value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-");
  const formatArs = (value) => arsFormatter.format(Number(value || 0));
  const formatUsd = (value) => usdFormatter.format(Number(value || 0));

  const loadRecent = useCallback(
    async (signal) => {
      setLoading(true);
      try {
        const { data } = await apiClient.get("/stats/nuevas-compras/", {
          params: queryParams,
          signal,
        });
        const nextRows = Array.isArray(data) ? data : [];
        setRows((prevRows) => {
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
    loadRecent(controller.signal);
    abortTimerRef.current = setTimeout(() => controller.abort(), 15000);
  }, [loadRecent]);

  useEffect(() => {
    triggerRefresh();
    return () => {
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
    const onCompraCreated = () => {
      triggerRefresh();
    };
    const onStorage = (event) => {
      if (event.key === "compra:last-created" && event.newValue) {
        triggerRefresh();
      }
    };
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        triggerRefresh();
      }
    };
    const onFocus = () => triggerRefresh();

    window.addEventListener("compra:created", onCompraCreated);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("compra:created", onCompraCreated);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [triggerRefresh]);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvents((message) => {
      if (message?.type === "compra_created") {
        triggerRefresh();
      }
    });
    return unsubscribe;
  }, [triggerRefresh]);

  return (
    <div className="w-full min-w-0 rounded-xl border border-white/10 bg-black/80 text-white p-4 overflow-hidden flex flex-col h-[320px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Nuevas compras (tiempo real)</h3>
        <span className="text-xs text-white/60">
          {loading ? "Actualizando..." : "Actualiza al guardar compra"}
        </span>
      </div>
      <div className="recent-compras-scroll flex-1 min-h-0 overflow-x-auto overflow-y-auto rounded-lg border border-white/5">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/70 bg-black sticky top-0 z-10">
              <th className="text-left py-2 pl-2 pr-3">Username</th>
              <th className="text-left py-2 pr-3">Contacto</th>
              <th className="text-left py-2 pr-3">Hora</th>
              <th className="text-left py-2 pr-3">Monto ARS</th>
              <th className="text-left py-2 pr-3">Monto USD</th>
              <th className="text-left py-2 pr-3">Operador</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((compra) => (
              <tr
                key={compra.id}
                className={`border-b border-white/5 transition-colors duration-700 ${
                  highlightedIds.includes(compra.id) ? "bg-emerald-500/10" : ""
                }`}
              >
                <td className="py-2 pl-2 pr-3">{compra.username || "-"}</td>
                <td className="py-2 pr-3">{compra.contacto || "-"}</td>
                <td className="py-2 pr-3">{formatDateTime(compra.hora)}</td>
                <td className="py-2 pr-3">{formatArs(compra.monto_ars)}</td>
                <td className="py-2 pr-3">{formatUsd(compra.monto_usd)}</td>
                <td className="py-2 pr-3">{compra.operador || "-"}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-white/60">
                  Sin compras recientes.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const RecentPurchasesTable = memo(RecentPurchasesTableComponent);

export default RecentPurchasesTable;
