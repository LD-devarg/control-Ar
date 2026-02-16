import { useCallback, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import Page from "../layouts/Page";
import {
  createOrganizacion,
  fetchOrganizaciones,
  updateOrganizacion,
} from "../services/empresas/organizaciones";

const EMPTY_FORM = {
  nombre: "",
  cupos: 1,
  activo: true,
};

export default function Organizaciones() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrganizaciones();
      setItems(data);
    } catch {
      setError("No se pudieron cargar las organizaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = (item) => {
    setSelected(item);
    setForm({
      nombre: item?.nombre || "",
      cupos: Number(item?.cupos || 1),
      activo: Boolean(item?.activo),
    });
    setError("");
  };

  const handleClear = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setError("");
  };

  const handleChange = (key) => (event) => {
    const value = key === "activo" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const nombre = String(form.nombre || "").trim();
    const cupos = Number(form.cupos);
    if (!nombre) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!Number.isFinite(cupos) || cupos < 1) {
      setError("Cupos debe ser mayor o igual a 1.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        nombre,
        cupos,
        activo: Boolean(form.activo),
      };
      if (selected) {
        const updated = await updateOrganizacion(selected.id, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        handleSelect(updated);
      } else {
        const created = await createOrganizacion(payload);
        setItems((prev) => [created, ...prev]);
        handleClear();
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || "No se pudo guardar la organizacion.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Organizaciones">
      <div className="flex flex-col w-full gap-4 md:gap-6 p-3 md:p-6">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          <div className="flex-1 rounded-xl bg-black/80 text-white p-4 border border-white/10">
            <div className="font-semibold text-lg mb-3">Listado</div>
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-auto">
              {loading ? <div className="text-sm text-white/60">Cargando organizaciones...</div> : null}
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`text-left rounded-lg px-3 py-2 border ${
                    selected?.id === item.id
                      ? "border-white bg-white/10"
                      : "border-white/10 hover:border-white/40"
                  }`}
                >
                  <div className="font-semibold">{item.nombre}</div>
                  <div className="text-xs text-white/70">
                    {item.activo ? "Activo" : "Inactivo"} - Cupos: {item.cupos}
                  </div>
                </button>
              ))}
              {!loading && items.length === 0 ? (
                <div className="text-sm text-white/60">Sin organizaciones.</div>
              ) : null}
            </div>
          </div>

          <div className="w-full lg:w-[460px] rounded-xl bg-black/80 text-white p-4 border border-white/10">
            <div className="font-semibold text-lg mb-3">
              {selected ? "Editar organizacion" : "Crear organizacion"}
            </div>

            <div className="flex flex-col gap-3">
              <TextField
                label="Nombre"
                value={form.nombre}
                onChange={handleChange("nombre")}
                fullWidth
                size="small"
                sx={{
                  "& .MuiInputBase-input": { color: "#fff" },
                  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.8)" },
                  "& .MuiOutlinedInput-root fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                  "& .MuiOutlinedInput-root:hover fieldset": { borderColor: "rgba(255,255,255,0.7)" },
                  "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#fff" },
                }}
              />

              <TextField
                label="Cupos"
                type="number"
                value={form.cupos}
                onChange={handleChange("cupos")}
                fullWidth
                size="small"
                inputProps={{ min: 1, step: 1 }}
                sx={{
                  "& .MuiInputBase-input": { color: "#fff" },
                  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.8)" },
                  "& .MuiOutlinedInput-root fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                  "& .MuiOutlinedInput-root:hover fieldset": { borderColor: "rgba(255,255,255,0.7)" },
                  "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#fff" },
                }}
              />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Checkbox
                checked={Boolean(form.activo)}
                onChange={handleChange("activo")}
                sx={{ color: "rgba(255,255,255,0.7)", "&.Mui-checked": { color: "#fff" } }}
              />
              <span className="text-sm">Activo</span>
            </div>

            {error ? <div className="text-red-400 text-sm mt-2">{error}</div> : null}

            <div className="flex gap-2 mt-4">
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{ backgroundColor: "#22c55e", color: "#0b0b0b", fontWeight: 700 }}
              >
                {selected ? "Guardar" : "Crear"}
              </Button>
              <Button
                variant="outlined"
                onClick={handleClear}
                disabled={saving}
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
