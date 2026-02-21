import { useCallback, useEffect, useMemo, useState } from "react";
import Page from "../layouts/Page.jsx";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import EmpresaForm from "../components/EmpresaForm.jsx";
import {
    fetchEmpresas,
    createEmpresa,
    updateEmpresa,
} from "../services/empresas/empresas";
import { fetchOrganizaciones } from "../services/empresas/organizaciones";
import { getCurrentUser } from "../services/auth";

function buildBeatTasksDraft(empresa) {
    const tasks = Array.isArray(empresa?.beat_tasks_available) ? empresa.beat_tasks_available : [];
    const config = empresa?.beat_tasks_config || {};
    const draft = {};
    tasks.forEach((task) => {
        const current = config?.[task.key];
        draft[task.key] = typeof current === "boolean" ? current : true;
    });
    return draft;
}

function extractApiErrorMessage(err, fallback) {
    const detail = err?.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;

    const body = err?.response?.data;
    if (Array.isArray(body) && body.length) {
        const first = body[0];
        if (typeof first === "string" && first.trim()) return first;
    }
    if (body && typeof body === "object") {
        const firstKey = Object.keys(body)[0];
        const firstValue = body[firstKey];
        if (Array.isArray(firstValue) && firstValue.length) {
            const first = firstValue[0];
            if (typeof first === "string" && first.trim()) return first;
        }
        if (typeof firstValue === "string" && firstValue.trim()) return firstValue;
    }
    return fallback;
}

export default function Tenant() {
    const currentUser = getCurrentUser();
    const isSuperuser = Boolean(currentUser?.is_superuser);
    const [empresas, setEmpresas] = useState([]);
    const [organizaciones, setOrganizaciones] = useState([]);
    const [selected, setSelected] = useState(null);
    const [nombre, setNombre] = useState("");
    const [organizacionId, setOrganizacionId] = useState("");
    const [activo, setActivo] = useState(true);
    const [operatingMode, setOperatingMode] = useState("full");
    const [listLoading, setListLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [beatModalEmpresa, setBeatModalEmpresa] = useState(null);
    const [beatTasksDraft, setBeatTasksDraft] = useState({});
    const [beatTasksSaving, setBeatTasksSaving] = useState(false);
    const [toast, setToast] = useState({ open: false, severity: "success", message: "" });

    const load = useCallback(async () => {
        setListLoading(true);
        setError("");
        try {
            const requests = [fetchEmpresas()];
            if (isSuperuser) requests.push(fetchOrganizaciones());
            const [empresasData, organizacionesData] = await Promise.all(requests);
            setEmpresas(empresasData);
            if (Array.isArray(organizacionesData)) {
                setOrganizaciones(organizacionesData);
            }
        } catch (err) {
            setError("No se pudieron cargar las empresas.");
        } finally {
            setListLoading(false);
        }
    }, [isSuperuser]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSelect = (empresa) => {
        setSelected(empresa);
        setNombre(empresa?.nombre || "");
        setOrganizacionId(empresa?.organizacion || "");
        setActivo(Boolean(empresa?.activo));
        setOperatingMode(empresa?.operating_mode || "full");
        setError("");
    };

    const handleClear = () => {
        setSelected(null);
        setNombre("");
        setOrganizacionId("");
        setActivo(true);
        setOperatingMode("full");
        setError("");
    };

    const handleSave = async () => {
        const trimmedNombre = nombre.trim();
        if (!trimmedNombre) {
            setError("El nombre es obligatorio.");
            return;
        }
        if (isSuperuser && !organizacionId) {
            setError("Selecciona una organizacion.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const payload = {
                nombre: trimmedNombre,
                activo,
                operating_mode: operatingMode || "full",
                ...(isSuperuser ? { organizacion: Number(organizacionId) } : {}),
            };
            if (selected) {
                const updated = await updateEmpresa(selected.id, payload);
                setEmpresas((prev) =>
                    prev.map((item) => (item.id === updated.id ? updated : item))
                );
                handleSelect(updated);
                setToast({ open: true, severity: "success", message: "Empresa actualizada." });
            } else {
                const created = await createEmpresa(payload);
                setEmpresas((prev) => [created, ...prev]);
                setToast({ open: true, severity: "success", message: "Empresa creada." });
                handleClear();
            }
        } catch (err) {
            const message = extractApiErrorMessage(err, "No se pudo guardar la empresa.");
            setError(message);
            setToast({
                open: true,
                severity: "error",
                message,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleWorkers = async (empresa) => {
        if (!empresa) return;
        const nextValue = !Boolean(empresa.workers_activos);
        setSaving(true);
        setError("");
        try {
            const updated = await updateEmpresa(empresa.id, { workers_activos: nextValue });
            setEmpresas((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item))
            );
            if (selected?.id === updated.id) {
                handleSelect(updated);
            }
            setToast({
                open: true,
                severity: "success",
                message: `Workers ${updated.workers_activos ? "activados" : "pausados"} en ${updated.nombre}.`,
            });
        } catch (err) {
            const message = extractApiErrorMessage(err, "No se pudo actualizar workers.");
            setError(message);
            setToast({
                open: true,
                severity: "error",
                message,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleBeatGlobal = async (empresa) => {
        if (!empresa) return;
        const nextValue = !Boolean(empresa.beat_activo);
        setSaving(true);
        setError("");
        try {
            const updated = await updateEmpresa(empresa.id, { beat_activo: nextValue });
            setEmpresas((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item))
            );
            if (selected?.id === updated.id) {
                handleSelect(updated);
            }
            if (beatModalEmpresa?.id === updated.id) {
                setBeatModalEmpresa(updated);
            }
            setToast({
                open: true,
                severity: "success",
                message: `Beat ${updated.beat_activo ? "activado" : "pausado"} en ${updated.nombre}.`,
            });
        } catch (err) {
            const message = extractApiErrorMessage(err, "No se pudo actualizar beat.");
            setError(message);
            setToast({
                open: true,
                severity: "error",
                message,
            });
        } finally {
            setSaving(false);
        }
    };

    const openBeatModal = (empresa) => {
        setBeatModalEmpresa(empresa);
        setBeatTasksDraft(buildBeatTasksDraft(empresa));
    };

    const closeBeatModal = () => {
        if (beatTasksSaving) return;
        setBeatModalEmpresa(null);
        setBeatTasksDraft({});
    };

    const beatTasks = useMemo(
        () => (Array.isArray(beatModalEmpresa?.beat_tasks_available) ? beatModalEmpresa.beat_tasks_available : []),
        [beatModalEmpresa]
    );

    const toggleBeatTaskDraft = (taskKey) => {
        setBeatTasksDraft((prev) => ({ ...prev, [taskKey]: !Boolean(prev[taskKey]) }));
    };

    const handleSaveBeatTasks = async () => {
        if (!beatModalEmpresa) return;
        setBeatTasksSaving(true);
        try {
            const updated = await updateEmpresa(beatModalEmpresa.id, {
                beat_tasks_config: beatTasksDraft,
            });
            setEmpresas((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            if (selected?.id === updated.id) {
                handleSelect(updated);
            }
            setBeatModalEmpresa(updated);
            setToast({
                open: true,
                severity: "success",
                message: `Tareas Beat actualizadas en ${updated.nombre}.`,
            });
        } catch (err) {
            const detail = extractApiErrorMessage(err, "No se pudieron actualizar las tareas Beat.");
            setToast({
                open: true,
                severity: "error",
                message: detail,
            });
        } finally {
            setBeatTasksSaving(false);
        }
    };

    return (
        <Page title="Empresas">
            <div className="flex flex-col w-full gap-4 md:gap-6 p-3 md:p-6">
                <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
                    <div className="flex-1 rounded-xl bg-black/80 text-white p-4 border border-white/10">
                        <div className="font-semibold text-lg mb-3">Listado</div>
                        <div className="flex flex-col gap-2 max-h-[60vh] overflow-auto">
                            {listLoading ? (
                                <div className="text-sm text-white/60">Cargando empresas...</div>
                            ) : null}
                            {empresas.map((empresa) => (
                                <div
                                    key={empresa.id}
                                    className={`rounded-lg px-3 py-2 border ${
                                        selected?.id === empresa.id
                                            ? "border-white bg-white/10"
                                            : "border-white/10 hover:border-white/40"
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(empresa)}
                                        className="w-full text-left"
                                    >
                                        <div className="font-semibold">{empresa.nombre}</div>
                                        <div className="text-xs text-white/70">
                                            {empresa.activo ? "Activo" : "Inactivo"} - {empresa.workers_activos ? "Workers ON" : "Workers OFF"} - {empresa.beat_activo ? "Beat ON" : "Beat OFF"} - #{empresa.id}
                                        </div>
                                        <div className="text-[11px] text-white/50">
                                            Modo: {empresa.operating_mode === "ftd_only" ? "Solo FTD" : "Full"}
                                        </div>
                                        <div className="mt-1 text-[11px] text-white/50">
                                            KPI sync: {empresa.kpi_sync_last_run_at ? new Date(empresa.kpi_sync_last_run_at).toLocaleString("es-AR") : "-"} ({empresa.kpi_sync_last_status || "n/a"})
                                        </div>
                                        <div className="text-[11px] text-white/50">
                                            Estado sync: {empresa.estado_sync_last_run_at ? new Date(empresa.estado_sync_last_run_at).toLocaleString("es-AR") : "-"} ({empresa.estado_sync_last_status || "n/a"})
                                        </div>
                                    </button>
                                    <div className="mt-2 flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => handleToggleWorkers(empresa)}
                                            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                                                empresa.workers_activos
                                                    ? "border-amber-400/70 text-amber-300 hover:bg-amber-500/10"
                                                    : "border-emerald-400/70 text-emerald-300 hover:bg-emerald-500/10"
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {empresa.workers_activos ? "Pausar workers" : "Activar workers"}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => openBeatModal(empresa)}
                                            className="rounded-md border border-cyan-400/70 px-2 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Gestionar beat
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {!listLoading && empresas.length === 0 ? (
                                <div className="text-sm text-white/60">Sin empresas.</div>
                            ) : null}
                        </div>
                    </div>
                    <EmpresaForm
                        selected={selected}
                        nombre={nombre}
                        organizacionId={organizacionId}
                        organizaciones={organizaciones}
                        showOrganizacionField={isSuperuser}
                        activo={activo}
                        operatingMode={operatingMode}
                        error={error}
                        saving={saving}
                        onNombreChange={setNombre}
                        onOrganizacionIdChange={setOrganizacionId}
                        onActivoChange={setActivo}
                        onOperatingModeChange={setOperatingMode}
                        onSave={handleSave}
                        onClear={handleClear}
                    />
                </div>
            </div>

            <Dialog open={Boolean(beatModalEmpresa)} onClose={closeBeatModal} maxWidth="sm" fullWidth>
                <DialogTitle>Beat por empresa</DialogTitle>
                <DialogContent>
                    <div className="text-sm text-zinc-300 mb-3">
                        Empresa: <span className="font-semibold">{beatModalEmpresa?.nombre}</span>
                    </div>

                    <div className="mb-4 flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2">
                        <div className="text-sm text-zinc-200">Beat global</div>
                        <button
                            type="button"
                            onClick={() => handleToggleBeatGlobal(beatModalEmpresa)}
                            disabled={saving}
                            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                                beatModalEmpresa?.beat_activo
                                    ? "border-amber-400/70 text-amber-300 hover:bg-amber-500/10"
                                    : "border-emerald-400/70 text-emerald-300 hover:bg-emerald-500/10"
                            }`}
                        >
                            {beatModalEmpresa?.beat_activo ? "Pausar beat" : "Activar beat"}
                        </button>
                    </div>

                    <div className="space-y-2">
                        {beatTasks.map((task) => (
                            <label key={task.key} className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2">
                                <div>
                                    <div className="text-sm text-zinc-100">{task.label}</div>
                                    <div className="text-xs text-zinc-400">{task.key}</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={Boolean(beatTasksDraft[task.key])}
                                    onChange={() => toggleBeatTaskDraft(task.key)}
                                    disabled={beatTasksSaving}
                                    className="h-4 w-4 accent-cyan-500"
                                />
                            </label>
                        ))}
                        {beatTasks.length === 0 ? (
                            <div className="text-sm text-zinc-400">No hay tareas configurables.</div>
                        ) : null}
                    </div>
                </DialogContent>
                <DialogActions>
                    <button
                        type="button"
                        onClick={closeBeatModal}
                        disabled={beatTasksSaving}
                        className="rounded-md border border-zinc-600 px-3 py-1 text-sm text-zinc-200"
                    >
                        Cerrar
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveBeatTasks}
                        disabled={beatTasksSaving || beatTasks.length === 0}
                        className="rounded-md border border-cyan-400/70 px-3 py-1 text-sm font-semibold text-cyan-300 disabled:opacity-50"
                    >
                        {beatTasksSaving ? "Guardando..." : "Guardar tareas"}
                    </button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={3500}
                onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                    severity={toast.severity}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </Page>
    );
}
