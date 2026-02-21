import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../services/auth";
import { subscribeRealtimeEvents } from "../services/realtime";
import ModalBase from "./ModalBase.jsx";
import { useTenant } from "../context/TenantContext";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import "../assets/css/RecentPurchasesTable.css";

function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(date);
}

function NuevosLeads() {
    const { tenantId } = useTenant();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedLead, setSelectedLead] = useState(null);
    const [clienteDetalle, setClienteDetalle] = useState(null);
    const [detalleLoading, setDetalleLoading] = useState(false);
    const detalleCacheRef = useRef(new Map());

    const loadLeads = useCallback(async (opts = {}) => {
        const { silent } = opts;
        if (!silent) {
            setLoading(true);
        }
        setError("");
        try {
            const { data } = await apiClient.get("/eventos-meta/", {
                params: { tipo: "lead", sin_contacto: 1 },
            });
            setLeads(Array.isArray(data) ? data : []);
        } catch (err) {
            setError("No se pudieron cargar los nuevos leads.");
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [tenantId]);

    useEffect(() => {
        loadLeads();
        const handleRefresh = () => loadLeads({ silent: true });
        const handleStorage = (event) => {
            if (event.key === "leads_refresh_ts") {
                loadLeads({ silent: true });
            }
        };
        window.addEventListener("leads:refresh", handleRefresh);
        window.addEventListener("storage", handleStorage);
        return () => {
            window.removeEventListener("leads:refresh", handleRefresh);
            window.removeEventListener("storage", handleStorage);
        };
    }, [loadLeads]);

    useEffect(() => {
        const unsubscribe = subscribeRealtimeEvents((message) => {
            if (message?.type === "lead_created") {
                loadLeads({ silent: true });
            }
        });
        return unsubscribe;
    }, [loadLeads]);

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
        username: lead.cliente_username || "Sin username",
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
                        className="w-full rounded-[18px] cursor-pointer border border-white/10 bg-black/20 px-4 py-2 text-left transition-all duration-200 hover:border-white/30"
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
                                {lead.username}
                            </span>
                            <span className="shrink-0 text-base font-semibold text-cyan-300">
                                {lead.cliente_contacto || "-"}
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
