import { useEffect, useMemo, useState } from "react";
import Button from "@mui/material/Button";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import ModalBase from "./ModalBase";
import { createGastoDiario, fetchCuentasPublicitarias } from "../services/pauta/gastos";

const EMPTY_FORM = {
  cuenta_publicitaria: "",
  fecha: "",
  monto_usd: "",
};

function todayDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function PautaGastoModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, fecha: todayDate() });
  const [cuentas, setCuentas] = useState([]);
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const hasCuentas = cuentas.length > 0;

  const canSave = useMemo(
    () => Boolean(form.cuenta_publicitaria) && Boolean(form.fecha) && Number(form.monto_usd) > 0,
    [form]
  );
  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY_FORM, fecha: todayDate() });
    setError("");
    let mounted = true;
    const load = async () => {
      setLoadingCuentas(true);
      try {
        const data = await fetchCuentasPublicitarias();
        if (mounted) {
          setCuentas(data);
          if (data.length === 0) {
            setError("No hay cuentas publicitarias para la empresa seleccionada.");
          }
        }
      } catch {
        if (mounted) setError("No se pudieron cargar las cuentas publicitarias.");
      } finally {
        if (mounted) setLoadingCuentas(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [open]);

  const handleChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    if (error) setError("");
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        cuenta_publicitaria: Number(form.cuenta_publicitaria),
        fecha: form.fecha,
        monto_usd: Number(form.monto_usd),
      };
      const created = await createGastoDiario(payload);
      onCreated?.(created);
      onClose?.();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || "No se pudo crear el gasto diario.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase
      open={open}
      onClose={onClose}
      title="Crear gasto diario"
      actions={
        <>
          <Button onClick={onClose} variant="outlined" disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={!canSave || saving || loadingCuentas}>
            {saving ? "Guardando..." : "Crear"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Autocomplete
          options={cuentas}
          value={cuentas.find((cuenta) => String(cuenta.id) === String(form.cuenta_publicitaria)) || null}
          onChange={(_, value) =>
            setForm((prev) => ({
              ...prev,
              cuenta_publicitaria: value ? String(value.id) : "",
            }))
          }
          getOptionLabel={(option) => option?.nombre || option?.meta_id || `Cuenta #${option?.id || ""}`}
          isOptionEqualToValue={(option, value) => option.id === value?.id}
          loading={loadingCuentas}
          disabled={loadingCuentas || saving || !hasCuentas}
          noOptionsText={loadingCuentas ? "Cargando cuentas..." : "Sin cuentas disponibles"}
          slotProps={{ popper: { sx: { zIndex: 4000 } } }}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              size="small"
              label="Cuenta publicitaria"
            />
          )}
        />
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Fecha"
          InputLabelProps={{ shrink: true }}
          value={form.fecha}
          onChange={handleChange("fecha")}
          disabled={saving}
        />
        <TextField
          fullWidth
          size="small"
          type="number"
          label="Monto USD"
          value={form.monto_usd}
          onChange={handleChange("monto_usd")}
          inputProps={{ min: 0, step: "0.01" }}
          disabled={saving}
        />
        <div className="text-xs text-white/70">
          El tipo de cambio vigente y monto ARS se calculan automáticamente en backend.
        </div>
        {error ? <Alert severity="error">{error}</Alert> : null}
      </div>
    </ModalBase>
  );
}
