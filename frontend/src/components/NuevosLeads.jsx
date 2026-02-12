import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../services/auth";
import ModalBase from "./ModalBase.jsx";

const POLL_MS = 180000;

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
    }, []);

    useEffect(() => {
        loadLeads();
        const timer = setInterval(() => loadLeads({ silent: true }), POLL_MS);
        const handleRefresh = () => loadLeads({ silent: true });
        const handleStorage = (event) => {
            if (event.key === "leads_refresh_ts") {
                loadLeads({ silent: true });
            }
        };
        window.addEventListener("leads:refresh", handleRefresh);
        window.addEventListener("storage", handleStorage);
        return () => {
            clearInterval(timer);
            window.removeEventListener("leads:refresh", handleRefresh);
            window.removeEventListener("storage", handleStorage);
        };
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
        nombre: lead.cliente_nombre || "Sin nombre",
        fecha: formatDateTime(lead.creado_en),
    })), [leads]);

    return (
        <div className="flex flex-col gap-4 p-4 align-center items-center bg-white dark:bg-neutral-900 rounded-2xl shadow-xl shadow-black w-full h-full">
            <h2 className="text-black dark:text-white text-lg text-shadow-md text-shadow-black font-semibold">NUEVOS LEADS</h2>
            <div className="w-full flex flex-col gap-2">
                {loading ? <p className="text-black dark:text-white text-center">Cargando...</p> : null}
                {error ? <p className="text-red-500 text-center">{error}</p> : null}
                {!loading && !error && leadRows.length === 0 ? (
                    <p className="text-black dark:text-white text-center">
                        No hay leads sin contactar.
                    </p>
                ) : null}
                <div className="flex flex-col gap-2 max-h-full overflow-y-auto px-1 py-1">
                    {leadRows.map((lead) => (
                        <div key={lead.id} className="flex flex-col gap-1 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                            <button
                                type="button"
                                className="font-medium text-left text-blue-800 dark:text-blue-700 underline
                                bg-none border-none p-0 m-0"
                                onClick={() => handleOpen(lead)}
                            >
                                {lead.username}
                            </button>
                            <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
                                <span>{lead.nombre}</span>
                                <span>{lead.fecha}</span>
                            </div>
                        </div>
                    ))}
                </div>
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
        </div>
    );
}
export default NuevosLeads;
