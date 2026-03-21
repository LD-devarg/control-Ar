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
const DISCARD_REASONS = [
    { value: "duplicado", label: "Duplicado" },
    { value: "no_contactado", label: "No contactado" },
    { value: "invalido", label: "Invalido" },
    { value: "otro", label: "Otro" },
];

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

function resolveLeadCodes(lead, clienteDetalle) {
    const payload = lead?.data && typeof lead.data === "object" ? lead.data : {};
    const requestedCodigo = String(payload.codigo_solicitado || "").trim();
    const finalCodigo = String(
        clienteDetalle?.codigo || payload.codigo_final || lead?.cliente_codigo || ""
    ).trim();
    const hasCodigoMismatch = Boolean(
        payload.codigo_provisorio_distinto && requestedCodigo && finalCodigo && requestedCodigo !== finalCodigo
    );
    return { requestedCodigo, finalCodigo, hasCodigoMismatch };
}

function formatLeadResult(lead) {
    const payload = lead?.data && typeof lead.data === "object" ? lead.data : {};
    switch (payload.resultado) {
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

function rankLeadForAside(lead) {
    const payload = lead?.data && typeof lead.data === "object" ? lead.data : {};
    if (payload.resultado === "creado_reasignado") return 3;
    if (payload.resultado === "creado") return 2;
    if (payload.deduplicado) return 1;
    return 0;
}

function buildEffectiveLeads(rows) {
    const items = Array.isArray(rows) ? rows : [];
    const byCliente = new Map();

    items.forEach((lead, index) => {
        const clienteKey = lead?.cliente ? `cliente:${lead.cliente}` : `evento:${lead?.id ?? index}`;
        const current = byCliente.get(clienteKey);
        if (!current) {
            byCliente.set(clienteKey, lead);
            return;
        }

        const currentRank = rankLeadForAside(current);
        const nextRank = rankLeadForAside(lead);
        if (nextRank > currentRank) {
            byCliente.set(clienteKey, lead);
            return;
        }
        if (nextRank === currentRank) {
            const currentDate = new Date(current?.creado_en || 0).getTime();
            const nextDate = new Date(lead?.creado_en || 0).getTime();
            if (nextDate > currentDate) {
                byCliente.set(clienteKey, lead);
            }
        }
    });

    return Array.from(byCliente.values()).sort((a, b) => {
        const aDate = new Date(a?.creado_en || 0).getTime();
        const bDate = new Date(b?.creado_en || 0).getTime();
        return bDate - aDate;
    });
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
    const [discardReason, setDiscardReason] = useState("duplicado");
    const [discardDetail, setDiscardDetail] = useState("");
    const [discarding, setDiscarding] = useState(false);
    const [duplicateSearch, setDuplicateSearch] = useState("");
    const [duplicateOptions, setDuplicateOptions] = useState([]);
    const [duplicateLoading, setDuplicateLoading] = useState(false);
    const [selectedDuplicate, setSelectedDuplicate] = useState(null);
    const detalleCacheRef = useRef(new Map());
    const duplicateSearchTimerRef = useRef(null);
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
                params: { tipo: "lead", sin_contacto: 1, limit: 50 },
            });
            const nextRows = buildEffectiveLeads(data);
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
            if (message?.type === "lead_created" || message?.type === "lead_discarded") {
                triggerRefresh();
            }
        });
        return unsubscribe;
    }, [triggerRefresh]);

    const handleOpen = async (lead) => {
        setSelectedLead(lead);
        setClienteDetalle(null);
        setDiscardReason("duplicado");
        setDiscardDetail("");
        setDuplicateSearch("");
        setDuplicateOptions([]);
        setSelectedDuplicate(null);
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
        setDiscardReason("duplicado");
        setDiscardDetail("");
        setDiscarding(false);
        setDuplicateSearch("");
        setDuplicateOptions([]);
        setDuplicateLoading(false);
        setSelectedDuplicate(null);
    };

    const handleDiscard = async () => {
        if (!selectedLead?.id || discarding) return;
        if (discardReason === "duplicado" && !selectedDuplicate?.id) {
            setError("Selecciona el cliente real antes de descartar como duplicado.");
            return;
        }
        setDiscarding(true);
        try {
            await apiClient.post(`/eventos-meta/${selectedLead.id}/discard-lead/`, {
                reason: discardReason,
                detail: discardDetail.trim(),
                ...(discardReason === "duplicado" && selectedDuplicate?.id
                    ? {
                        duplicate_of_cliente_id: selectedDuplicate.id,
                        duplicate_of_codigo: selectedDuplicate.codigo,
                    }
                    : {}),
            });
            setLeads((prev) => prev.filter((item) => item.id !== selectedLead.id));
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("leads:refresh"));
                try {
                    localStorage.setItem("leads_dirty", "1");
                    localStorage.setItem("leads_refresh_ts", String(Date.now()));
                } catch {
                    // ignore storage errors
                }
            }
            handleClose();
        } catch {
            setError("No se pudo descartar el lead.");
        } finally {
            setDiscarding(false);
        }
    };

    useEffect(() => {
        if (discardReason !== "duplicado") {
            setDuplicateOptions([]);
            setDuplicateLoading(false);
            setSelectedDuplicate(null);
            return;
        }
        const term = duplicateSearch.trim();
        if (duplicateSearchTimerRef.current) {
            clearTimeout(duplicateSearchTimerRef.current);
        }
        if (term.length < 2) {
            setDuplicateOptions([]);
            setDuplicateLoading(false);
            return;
        }
        duplicateSearchTimerRef.current = setTimeout(async () => {
            setDuplicateLoading(true);
            try {
                const { data } = await apiClient.get("/clientes/", {
                    params: { search: term },
                });
                const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
                setDuplicateOptions(items.filter((item) => item?.id !== selectedLead?.cliente).slice(0, 8));
            } catch {
                setDuplicateOptions([]);
            } finally {
                setDuplicateLoading(false);
            }
        }, 250);

        return () => {
            if (duplicateSearchTimerRef.current) {
                clearTimeout(duplicateSearchTimerRef.current);
            }
        };
    }, [discardReason, duplicateSearch, selectedLead]);

    const leadRows = useMemo(() => leads.map((lead) => ({
        ...lead,
        title: buildLeadTitle(lead),
        fecha: formatDateTime(lead.creado_en),
    })), [leads]);
    const selectedLeadCodes = useMemo(
        () => resolveLeadCodes(selectedLead, clienteDetalle),
        [selectedLead, clienteDetalle]
    );

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
                        {lead?.data?.codigo_provisorio_distinto ? (
                            <div className="mt-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
                                Solicitado {lead?.data?.codigo_solicitado || "-"} {"->"} asignado {lead?.data?.codigo_final || lead?.cliente_codigo || "-"}
                            </div>
                        ) : null}
                        {lead?.data?.deduplicado ? (
                            <div className="mt-2 rounded-xl border border-sky-400/40 bg-sky-500/10 px-2.5 py-1.5 text-[11px] text-sky-200">
                                {formatLeadResult(lead) || "Intento deduplicado"}
                            </div>
                        ) : null}
                    </button>
                ))}
            </div>

            <ModalBase
                open={Boolean(selectedLead)}
                onClose={handleClose}
                title="Detalle del lead"
                actions={(
                    <>
                        <button type="button" className="modal-close-button" onClick={handleClose} disabled={discarding}>
                            Cerrar
                        </button>
                        <button type="button" className="modal-confirm-button" onClick={handleDiscard} disabled={discarding}>
                            {discarding ? "Descartando..." : "Descartar lead"}
                        </button>
                    </>
                )}
            >
                {detalleLoading ? (
                    <p>Cargando datos...</p>
                ) : (
                    <>
                        <div className="lead-detail-grid">
                            <div className="lead-detail-item">
                                <strong>Nombre</strong>
                                <span>{clienteDetalle?.nombre || selectedLead?.cliente_nombre || "-"}</span>
                            </div>
                            <div className="lead-detail-item">
                                <strong>ID</strong>
                                <span>{clienteDetalle?.codigo || selectedLead?.cliente_codigo || "-"}</span>
                            </div>
                            <div className="lead-detail-item">
                                <strong>Resultado</strong>
                                <span>{formatLeadResult(selectedLead) || "-"}</span>
                            </div>
                            <div className="lead-detail-item">
                                <strong>Motivo</strong>
                                <span>{selectedLead?.data?.motivo || "-"}</span>
                            </div>
                            <div className="lead-detail-item">
                                <strong>Codigo solicitado</strong>
                                <span>{selectedLeadCodes.requestedCodigo || "-"}</span>
                            </div>
                            <div className="lead-detail-item">
                                <strong>Codigo final</strong>
                                <span>{selectedLeadCodes.finalCodigo || "-"}</span>
                            </div>
                            <div className="lead-detail-item">
                                <strong>Contacto</strong>
                                <span>{clienteDetalle?.contacto || "-"}</span>
                            </div>
                            <div className="lead-detail-item">
                                <strong>Username</strong>
                                <span>{clienteDetalle?.username || selectedLead?.cliente_username || "-"}</span>
                            </div>
                            <div className="lead-detail-item lead-detail-full">
                                <strong>Fecha de Lead</strong>
                                <span>{formatDateTime(selectedLead?.creado_en)}</span>
                            </div>
                            {selectedLeadCodes.hasCodigoMismatch ? (
                                <div className="lead-detail-item lead-detail-full" style={{ borderColor: "rgba(251, 191, 36, 0.4)", background: "rgba(245, 158, 11, 0.1)", color: "#fde68a" }}>
                                    <strong>Codigo reasignado</strong>
                                    <span>Se solicito {selectedLeadCodes.requestedCodigo || "-"} y se asigno {selectedLeadCodes.finalCodigo || "-"}.</span>
                                </div>
                            ) : null}
                        </div>

                        <p className="lead-section-title">Descarte</p>

                        <div className="lead-field">
                            <label>Motivo de descarte</label>
                            <select
                                value={discardReason}
                                onChange={(event) => setDiscardReason(event.target.value)}
                                disabled={discarding}
                            >
                                {DISCARD_REASONS.map((option) => (
                                    <option key={option.value} value={option.value} style={{ color: "#111827" }}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="lead-field">
                            <label>Detalle opcional</label>
                            <textarea
                                value={discardDetail}
                                onChange={(event) => setDiscardDetail(event.target.value)}
                                disabled={discarding}
                                rows={3}
                            />
                        </div>
                        {discardReason === "duplicado" ? (
                            <div className="lead-field lead-autocomplete">
                                <label>Cliente real</label>
                                <input
                                    type="text"
                                    value={duplicateSearch}
                                    onChange={(event) => setDuplicateSearch(event.target.value)}
                                    disabled={discarding}
                                    placeholder="Buscar por codigo, nombre, username o contacto"
                                />
                                {duplicateLoading ? (
                                    <p style={{ marginTop: 2, fontSize: 12, opacity: 0.75 }}>Buscando clientes...</p>
                                ) : null}
                                {selectedDuplicate ? (
                                    <div className="lead-selected-duplicate">
                                        <strong>{selectedDuplicate.codigo || `Cliente #${selectedDuplicate.id}`}</strong>
                                        {" · "}
                                        {selectedDuplicate.nombre || selectedDuplicate.username || selectedDuplicate.contacto || "-"}
                                    </div>
                                ) : null}
                                {!selectedDuplicate && duplicateOptions.length ? (
                                    <div className="lead-autocomplete-list">
                                        {duplicateOptions.map((option) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => setSelectedDuplicate(option)}
                                                disabled={discarding}
                                                className="lead-autocomplete-option"
                                            >
                                                <strong>{option.codigo || `Cliente #${option.id}`}</strong>
                                                {" · "}
                                                {option.nombre || option.username || option.contacto || "-"}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                                {selectedDuplicate ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedDuplicate(null);
                                            setDuplicateSearch("");
                                            setDuplicateOptions([]);
                                        }}
                                        disabled={discarding}
                                        className="lead-link-button"
                                    >
                                        Cambiar cliente seleccionado
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                    </>
                )}
            </ModalBase>
        </aside>
    );
}
export default NuevosLeads;
