import { useEffect, useState } from "react";
import Page from "../layouts/Page.jsx";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchEmpresas();
            setEmpresas(data);
            if (selected) {
                const updated = data.find((item) => item.id === selected.id);
                if (updated) {
                    setSelected(updated);
                    setNombre(updated.nombre || "");
                    setActivo(Boolean(updated.activo));
                }
            }
        } catch (err) {
            setError("No se pudieron cargar las empresas.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

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
        if (!nombre.trim()) {
            setError("El nombre es obligatorio.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            if (selected) {
                await updateEmpresa(selected.id, {
                    nombre: nombre.trim(),
                    activo,
                });
            } else {
                await createEmpresa({
                    nombre: nombre.trim(),
                    activo,
                });
            }
            await load();
            if (!selected) {
                setNombre("");
                setActivo(true);
            }
        } catch (err) {
            const detail = err?.response?.data?.detail;
            setError(detail || "No se pudo guardar la empresa.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Page title="Empresas">
            <div className="flex flex-col w-full gap-6 p-6">
                <div className="flex gap-6">
                    <div className="flex-1 rounded-xl bg-black/80 text-white p-4 border border-white/10">
                        <div className="font-semibold text-lg mb-3">Listado</div>
                        <div className="flex flex-col gap-2 max-h-[60vh] overflow-auto">
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
                                        {empresa.activo ? "Activo" : "Inactivo"} · #{empresa.id}
                                    </div>
                                </button>
                            ))}
                            {empresas.length === 0 ? (
                                <div className="text-sm text-white/60">Sin empresas.</div>
                            ) : null}
                        </div>
                    </div>
                    <div className="w-[420px] rounded-xl bg-black/80 text-white p-4 border border-white/10">
                        <div className="font-semibold text-lg mb-3">
                            {selected ? "Editar empresa" : "Crear empresa"}
                        </div>
                        <TextField
                            label="Nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            fullWidth
                            size="small"
                            sx={{
                                "& .MuiInputBase-input": { color: "#fff" },
                                "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.8)" },
                                "& .MuiOutlinedInput-root fieldset": {
                                    borderColor: "rgba(255,255,255,0.4)",
                                },
                                "& .MuiOutlinedInput-root:hover fieldset": {
                                    borderColor: "rgba(255,255,255,0.7)",
                                },
                                "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                                    borderColor: "#fff",
                                },
                            }}
                        />
                        <div className="flex items-center gap-2 mt-3">
                            <Checkbox
                                checked={activo}
                                onChange={(e) => setActivo(e.target.checked)}
                                sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    "&.Mui-checked": { color: "#fff" },
                                }}
                            />
                            <span className="text-sm">Activo</span>
                        </div>
                        {error ? <div className="text-red-400 text-sm mt-2">{error}</div> : null}
                        <div className="flex gap-2 mt-4">
                            <Button
                                variant="contained"
                                onClick={handleSave}
                                disabled={loading}
                                sx={{ backgroundColor: "#22c55e", color: "#0b0b0b", fontWeight: 700 }}
                            >
                                {selected ? "Guardar" : "Crear"}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleClear}
                                disabled={loading}
                                sx={{ borderColor: "#fff", color: "#fff" }}
                            >
                                Limpiar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Page>
    );
}
