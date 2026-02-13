import { useCallback, useEffect, useState } from "react";
import Page from "../layouts/Page.jsx";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import EmpresaForm from "../components/EmpresaForm.jsx";
import {
    fetchEmpresas,
    createEmpresa,
    updateEmpresa,
} from "../services/empresas/empresas";

export default function Tenant() { 
    const [empresas, setEmpresas] = useState([]);
    const [selected, setSelected] = useState(null);
    const [nombre, setNombre] = useState("");
    const [activo, setActivo] = useState(true);
    const [listLoading, setListLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState({ open: false, severity: "success", message: "" });

    const load = useCallback(async () => {
        setListLoading(true);
        setError("");
        try {
            const data = await fetchEmpresas();
            setEmpresas(data);
        } catch (err) {
            setError("No se pudieron cargar las empresas.");
        } finally {
            setListLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleSelect = (empresa) => {
        setSelected(empresa);
        setNombre(empresa?.nombre || "");
        setActivo(Boolean(empresa?.activo));
        setError("");
    };

    const handleClear = () => {
        setSelected(null);
        setNombre("");
        setActivo(true);
        setError("");
    };

    const handleSave = async () => {
        const trimmedNombre = nombre.trim();
        if (!trimmedNombre) {
            setError("El nombre es obligatorio.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            if (selected) {
                const updated = await updateEmpresa(selected.id, {
                    nombre: trimmedNombre,
                    activo,
                });
                setEmpresas((prev) =>
                    prev.map((item) => (item.id === updated.id ? updated : item))
                );
                handleSelect(updated);
                setToast({ open: true, severity: "success", message: "Empresa actualizada." });
            } else {
                const created = await createEmpresa({
                    nombre: trimmedNombre,
                    activo,
                });
                setEmpresas((prev) => [created, ...prev]);
                setToast({ open: true, severity: "success", message: "Empresa creada." });
                handleClear();
            }
        } catch (err) {
            const detail = err?.response?.data?.detail;
            setError(detail || "No se pudo guardar la empresa.");
            setToast({
                open: true,
                severity: "error",
                message: detail || "No se pudo guardar la empresa.",
            });
        } finally {
            setSaving(false);
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
                                <button
                                    key={empresa.id}
                                    type="button"
                                    onClick={() => handleSelect(empresa)}
                                    className={`text-left rounded-lg px-3 py-2 border ${
                                        selected?.id === empresa.id
                                            ? "border-white bg-white/10"
                                            : "border-white/10 hover:border-white/40"
                                    }`}
                                >
                                    <div className="font-semibold">{empresa.nombre}</div>
                                    <div className="text-xs text-white/70">
                                        {empresa.activo ? "Activo" : "Inactivo"} - #{empresa.id}
                                    </div>
                                </button>
                            ))}
                            {!listLoading && empresas.length === 0 ? (
                                <div className="text-sm text-white/60">Sin empresas.</div>
                            ) : null}
                        </div>
                    </div>
                    <EmpresaForm
                        selected={selected}
                        nombre={nombre}
                        activo={activo}
                        error={error}
                        saving={saving}
                        onNombreChange={setNombre}
                        onActivoChange={setActivo}
                        onSave={handleSave}
                        onClear={handleClear}
                    />
                </div>
            </div>
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

