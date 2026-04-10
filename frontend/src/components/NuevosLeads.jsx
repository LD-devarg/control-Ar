import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { apiClient } from "../services/auth";
import { subscribeRealtimeEvents } from "../services/realtime";
import ModalBase from "./ModalBase.jsx";
import { useTenant } from "../context/TenantContext";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
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

function buildEffectiveLeads(rows) {
    const items = Array.isArray(rows) ? rows : [];
    return items.slice().sort((a, b) => {
        const aDate = new Date(a?.creado_en || 0).getTime();
        const bDate = new Date(b?.creado_en || 0).getTime();
        return bDate - aDate;
    });
}

function wasLeadSentToMeta(lead) {
    if (!lead || lead.tipo !== "lead") return false;

    const payload = lead?.data && typeof lead.data === "object" ? lead.data : {};
    if (payload.meta_skipped) return false;

    const respuestaMeta =
        lead?.respuesta_meta && typeof lead.respuesta_meta === "object" ? lead.respuesta_meta : null;
    const targets = Array.isArray(respuestaMeta?.targets) ? respuestaMeta.targets : [];
    if (!targets.length) return false;

    const hasPositiveTarget = targets.some((target) => target?.ok === true);
    if (!hasPositiveTarget) return false;

    return lead?.estado_envio === "enviado" || respuestaMeta?.primary_ok === true || Boolean(lead?.enviado_en);
}

function buildDayGroups(items) {
    const now = dayjs();
    const grouped = new Map();

    items.forEach((item) => {
        const date = dayjs(item?.creado_en);
        let label = date.format("DD/MM/YYYY");
        if (date.isSame(now, "day")) label = "Hoy";
        else if (date.isSame(now.subtract(1, "day"), "day")) label = "Ayer";

        if (!grouped.has(label)) grouped.set(label, []);
        grouped.get(label).push(item);
    });

    return Array.from(grouped.entries()).map(([label, rows]) => ({ label, rows }));
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
    const [copiedCode, setCopiedCode] = useState("");
    const detalleCacheRef = useRef(new Map());
    const duplicateSearchTimerRef = useRef(null);
    const refreshTimerRef = useRef(null);
    const lastRefreshAtRef = useRef(0);
    const copiedTimerRef = useRef(null);

    const loadLeads = useCallback(async (opts = {}) => {
        const { silent } = opts;
        if (!silent) {
            setLoading(true);
        }
        setError("");
        try {
            const { data } = await apiClient.get("/eventos-meta/", {
                params: { tipo: "lead", limit: 50 },
            });
            const metaSentRows = (Array.isArray(data) ? data : []).filter(wasLeadSentToMeta);
            const nextRows = buildEffectiveLeads(metaSentRows);
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
    const groupedLeads = useMemo(() => buildDayGroups(leadRows), [leadRows]);
    const todayMetrics = useMemo(() => {
        const today = dayjs();
        return leadRows.reduce(
            (acc, lead) => {
                const createdAt = dayjs(lead?.creado_en);
                if (!createdAt.isSame(today, "day")) return acc;
                acc.total += 1;
                if (lead?.data?.deduplicado) acc.deduplicados += 1;
                if (lead?.data?.codigo_provisorio_distinto) acc.reasignados += 1;
                return acc;
            },
            { total: 0, deduplicados: 0, reasignados: 0 }
        );
    }, [leadRows]);
    const formatClock = (value) => (value ? dayjs(value).format("HH:mm") : "--:--");
    const handleCopyCodigo = useCallback(async (event, codigo) => {
        event.stopPropagation();
        event.preventDefault();
        const normalized = String(codigo || "").trim();
        if (!normalized) return;

        const markCopied = () => {
            setCopiedCode(normalized);
            if (copiedTimerRef.current) {
                clearTimeout(copiedTimerRef.current);
            }
            copiedTimerRef.current = setTimeout(() => setCopiedCode(""), 1400);
        };

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(normalized);
                markCopied();
                return;
            }
        } catch {
            // fallback below
        }

        try {
            const textarea = document.createElement("textarea");
            textarea.value = normalized;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "fixed";
            textarea.style.top = "-9999px";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            textarea.setSelectionRange(0, textarea.value.length);
            const copied = document.execCommand("copy");
            document.body.removeChild(textarea);
            if (copied) {
                markCopied();
            }
        } catch {
            // ignore clipboard errors
        }
    }, []);

    useEffect(() => () => {
        if (copiedTimerRef.current) {
            clearTimeout(copiedTimerRef.current);
        }
    }, []);

    return (
        <aside className="w-full rounded-[28px] border border-white/10 bg-[#121214] p-4 text-white shadow-xl shadow-black h-full flex flex-col">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Nuevos Leads</h3>
                <span className="text-xs text-white/55">{loading ? "Actualizando..." : "Tiempo real"}</span>
            </div>

            {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}

            <div className="mb-5 rounded-2xl border border-white/6 bg-white/[0.03] px-2 py-3">
                <div className="mb-1 pl-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Hoy</div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
                    <div className="inline-flex items-center gap-1 text-sky-200">
                        <PendingActionsOutlinedIcon sx={{ fontSize: 14 }} />
                        <span className="text-[14px] font-semibold">{todayMetrics.total} leads</span>
                    </div>
                    <span className="text-white/20">|</span>
                    <div className="inline-flex items-center gap-1 text-cyan-200">
                        <ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />
                        <span className="text-[14px] font-semibold">{todayMetrics.deduplicados} dedup</span>
                    </div>
                    <span className="text-white/20">|</span>
                    <div className="inline-flex items-center gap-1 text-amber-200">
                        <AutorenewOutlinedIcon sx={{ fontSize: 14 }} />
                        <span className="text-[14px] font-semibold">{todayMetrics.reasignados} reasignados</span>
                    </div>
                </div>
            </div>

            <div className="recent-compras-scroll overflow-y-auto overflow-x-hidden pr-1 flex-1 min-h-0">
                {!loading && !error && leadRows.length === 0 ? (
                    <div className="rounded-xl bg-white/[0.03] px-3 py-4 text-sm text-white/55">
                        No hay leads sin contactar.
                    </div>
                ) : null}

                <div className="space-y-5">
                    {groupedLeads.map((group) => (
                        <section key={group.label}>
                            <div className="mb-2 flex items-center gap-3">
                                <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/45">
                                    {group.label}
                                </span>
                                <div className="h-px flex-1 bg-white/8" />
                            </div>

                            <div>
                                {group.rows.map((lead) => (
                                    <div
                                        key={lead.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleOpen(lead)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                handleOpen(lead);
                                            }
                                        }}
                                        className="group grid w-full grid-cols-[52px_minmax(0,1fr)] items-start gap-3 border-b border-white/7 py-3 text-left transition-colors hover:bg-white/[0.03] cursor-pointer"
                                    >
                                        <div className="pt-1 text-[13px] font-medium tabular-nums text-white/45">
                                            {formatClock(lead.creado_en)}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex min-w-0 items-start justify-between gap-2">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <PendingActionsOutlinedIcon className="shrink-0 text-sky-300" sx={{ fontSize: 14 }} />
                                                    <span className="truncate text-[14px] font-semibold text-white">
                                                        {lead.title}
                                                    </span>
                                                </div>
                                                <div className="shrink-0 pt-0.5 text-right">
                                                    {lead.cliente_codigo ? (
                                                        <button
                                                            type="button"
                                                            onClick={(event) => handleCopyCodigo(event, lead.cliente_codigo)}
                                                            className="block whitespace-nowrap text-[15px] font-semibold tracking-[0.01em] text-sky-200 transition-colors hover:text-sky-100"
                                                            title={copiedCode === String(lead.cliente_codigo) ? "Copiado" : `Copiar ${lead.cliente_codigo}`}
                                                        >
                                                            {copiedCode === String(lead.cliente_codigo)
                                                                ? "Copiado"
                                                                : `ID ${lead.cliente_codigo}`}
                                                        </button>
                                                    ) : (
                                                        <span className="block whitespace-nowrap text-[15px] font-semibold tracking-[0.01em] text-sky-200">
                                                            -
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-1 pl-5 text-[12px] text-white/52">
                                                {lead?.data?.deduplicado
                                                    ? (formatLeadResult(lead) || "Lead deduplicado")
                                                    : "Lead"}{" "}
                                                • {formatClock(lead.creado_en)}
                                            </div>
                                        </div>

                                        {lead?.data?.codigo_provisorio_distinto ? (
                                            <div className="col-[2/3] ml-5 mt-1 rounded-xl border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
                                                Solicitado {lead?.data?.codigo_solicitado || "-"} {"->"} asignado {lead?.data?.codigo_final || lead?.cliente_codigo || "-"}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
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
