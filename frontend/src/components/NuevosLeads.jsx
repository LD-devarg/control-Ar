import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../services/auth";
import { subscribeRealtimeEvents } from "../services/realtime";
import ModalBase from "./ModalBase.jsx";
import { useTenant } from "../context/TenantContext";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import "../assets/css/RecentPurchasesTable.css";

const REFRESH_DEBOUNCE_MS = 500;
const REFRESH_COOLDOWN_MS = 5000;
const POLL_INTERVAL_MS = 60000;

function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(date);
}

function buildLeadTitle(lead) {
    const nombre = String(lead?.cliente_nombre || "").trim();
    const username = String(lead?.cliente_username || "").trim();
    const codigo = String(lead?.cliente_codigo || "").trim();
    const clienteId = String(lead?.cliente || "").trim();

    if (nombre) return nombre;
    if (username) return username;
    if (codigo) return `ID ${codigo}`;
    if (clienteId) return `Cliente #${clienteId}`;
    return "Lead";
}

function readCachedLeads(cacheKey) {
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

function NuevosLeads() {
    const { tenantId } = useTenant();
    const cacheKey = useMemo(() => `new_leads_aside:${tenantId || "all"}`, [tenantId]);
    const [leads, setLeads] = useState(() => readCachedLeads(cacheKey));
    const [loading, setLoading] = useState(() => readCachedLeads(cacheKey).length === 0);
    const [error, setError] = useState("");
    const [selectedLead, setSelectedLead] = useState(null);
    const [clienteDetalle, setClienteDetalle] = useState(null);
    const [detalleLoading, setDetalleLoading] = useState(false);
    const detalleCacheRef = useRef(new Map());
    const refreshTimerRef = useRef(null);
    const lastRefreshAtRef = useRef(0);

    const loadLeads = useCallback(async (opts = {}) => {
        const { silent } = opts;
        if (!silent) {
            setLoading(true);
        }
        setError("");
        try {
            const { data } = await apiClient.get("/eventos-meta/", {
                params: { tipo: "lead", sin_contacto: 1, limit: 25 },
            });
            const nextRows = Array.isArray(data) ? data : [];
            setLeads(nextRows);
            if (typeof window !== "undefined") {
                window.sessionStorage.setItem(cacheKey, JSON.stringify(nextRows));
            }
        } catch (err) {
            setError("No se pudieron cargar los nuevos leads.");
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [cacheKey]);

    const triggerRefresh = useCallback((options = {}) => {
        const { force = false, silent = true } = options;
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }
        const now = Date.now();
        const elapsed = now - lastRefreshAtRef.current;
        const delay = force || elapsed >= REFRESH_COOLDOWN_MS ? 0 : REFRESH_DEBOUNCE_MS;
        refreshTimerRef.current = setTimeout(() => {
            lastRefreshAtRef.current = Date.now();
            loadLeads({ silent });
        }, delay);
    }, [loadLeads]);

    useEffect(() => {
        setLeads(readCachedLeads(cacheKey));
    }, [cacheKey]);

    useEffect(() => {
        triggerRefresh({ force: true, silent: false });
        const intervalId = setInterval(() => triggerRefresh(), POLL_INTERVAL_MS);
        const handleRefresh = () => triggerRefresh();
        const handleStorage = (event) => {
            if (event.key === "leads_refresh_ts") {
                triggerRefresh();
            }
        };
        window.addEventListener("leads:refresh", handleRefresh);
        window.addEventListener("storage", handleStorage);
        return () => {
            clearInterval(intervalId);
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
            window.removeEventListener("leads:refresh", handleRefresh);
            window.removeEventListener("storage", handleStorage);
        };
    }, [cacheKey, triggerRefresh]);

    useEffect(() => {
        const unsubscribe = subscribeRealtimeEvents((message) => {
            if (message?.type === "lead_created") {
                triggerRefresh();
            }
        });
        return unsubscribe;
    }, [triggerRefresh]);

    const handleOpen = async (lead) => {
        setSelectedLead(lead);
        setClienteDetalle(null);
        if (!lead?.cliente) return;
        const cached = detalleCacheRef.current.get(lead.cliente);
        if (cached) {
            setClienteDetalle(cached);
            return;
        }
        setDetalleLoading(true);
        try {
            const { data } = await apiClient.get(`/clientes/${lead.cliente}/`);
            detalleCacheRef.current.set(lead.cliente, data);
            setClienteDetalle(data);
        } finally {
            setDetalleLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedLead(null);
        setClienteDetalle(null);
        setDetalleLoading(false);
    };

    const leadRows = useMemo(() => leads.map((lead) => ({
        ...lead,
        title: buildLeadTitle(lead),
        fecha: formatDateTime(lead.creado_en),
    })), [leads]);

    return (
        <aside className="w-full rounded-2xl shadow-xl shadow-black bg-white dark:bg-neutral-900 p-4 text-white h-full flex flex-col">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base text-black dark:text-white font-semibold">Nuevos Leads</h3>
                <span className="text-xs text-black/80 dark:text-white/60">{loading ? "Actualizando..." : "Tiempo real"}</span>
            </div>

            {error ? <p className="mb-2 text-sm text-red-500">{error}</p> : null}

            <div className="recent-compras-scroll space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
                {!loading && !error && leadRows.length === 0 ? (
                    <div className="rounded-xl bg-white dark:bg-neutral-900 px-3 py-4 text-sm text-black/60 dark:text-white/60">
                        No hay leads sin contactar.
                    </div>
                ) : null}

                {leadRows.map((lead) => (
                    <button
                        key={lead.id}
                        type="button"
                        onClick={() => handleOpen(lead)}
                        className="w-full rounded-[18px] cursor-pointer border border-white/10 bg-gradient-to-r from-black to-black/80 dark:bg-black/20 px-4 py-2 text-left transition-all duration-200 hover:border-white/30 hover:bg-gradient-to-r hover:from-black/80 hover:to-black/60"
                    >
                        <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-white/65">
                            <div className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-none bg-sky-500/10 text-sky-300 border-sky-400/60">
                                <PendingActionsOutlinedIcon sx={{ fontSize: 14 }} />
                                <span>Lead</span>
                            </div>
                            <span>{lead.fecha}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm xl:text-lg font-semibold text-white">
                                {lead.title}
                            </span>
                            <span className="shrink-0 text-base font-semibold text-cyan-300">
                                {lead.cliente_codigo ? `ID ${lead.cliente_codigo}` : (lead.cliente_contacto || "-")}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            <ModalBase
                open={Boolean(selectedLead)}
                onClose={handleClose}
                title="Detalle del lead"
                actions={null}
            >
                {detalleLoading ? (
                    <p>Cargando datos...</p>
                ) : (
                    <>
                        <p><strong>Nombre:</strong> {clienteDetalle?.nombre || selectedLead?.cliente_nombre || "-"}</p>
                        <p><strong>ID:</strong> {clienteDetalle?.codigo || selectedLead?.cliente_codigo || "-"}</p>
                        <p><strong>Contacto:</strong> {clienteDetalle?.contacto || "-"}</p>
                        <p><strong>Username:</strong> {clienteDetalle?.username || selectedLead?.cliente_username || "-"}</p>
                        <p><strong>Fecha de Lead:</strong> {formatDateTime(selectedLead?.creado_en)}</p>
                    </>
                )}
            </ModalBase>
        </aside>
    );
}
export default NuevosLeads;
