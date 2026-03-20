import { useEffect, useMemo, useState } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import "../assets/css/Form.css";
import { useTheme } from '@mui/material/styles';
import { apiClient } from '../services/auth';
import { useTenant } from '../context/TenantContext';
import { subscribeRealtimeEvents } from '../services/realtime';
import { markClientesDirty } from '../services/operativo/clientes';
import { buildClienteDisplayLabel } from '../utils/clientDisplay';

export default function FormContacto() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const color = isDarkMode ? '#f4f4f5' : '#000000';
  const [usuarios, setUsuarios] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [missingDataChoice, setMissingDataChoice] = useState(null);
  const [extraContacto, setExtraContacto] = useState("");
  const [extraNombre, setExtraNombre] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, severity: "success", message: "" });
  const { tenantId: empresaId, kommoEnabled } = useTenant();
  const fieldSx = {
    '& .MuiInputBase-input': { color },
    '& .MuiInputLabel-root': { color },
    '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '&:hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '& .MuiSvgIcon-root': { color },
  };

  const markLeadsDirty = () => {
    try {
      localStorage.setItem("leads_dirty", "1");
      localStorage.setItem("leads_refresh_ts", String(Date.now()));
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    let mounted = true;
    const CACHE_KEY = `leads_cache:${empresaId || "default"}`;

    const readCache = () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };

    const writeCache = (data) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
        localStorage.setItem("leads_dirty", "0");
      } catch {
        // ignore cache errors
      }
    };

    const normalize = (data) => {
      const unique = new Map();
      (data || []).forEach((evento) => {
        if (!evento?.cliente) return;
        if (unique.has(evento.cliente)) return;
        const cliente = {
          id: evento.cliente,
          codigo: evento.cliente_codigo || "",
          username: evento.cliente_username || "",
          contacto: evento.cliente_contacto || "",
          nombre: evento.cliente_nombre || "",
        };
        unique.set(evento.cliente, {
          ...cliente,
          label: buildClienteDisplayLabel(cliente),
        });
      });
      return Array.from(unique.values());
    };

    const load = async (opts = {}) => {
      const { silent } = opts;
      if (!silent) {
        setLoading(true);
      }
      try {
        const { data } = await apiClient.get("/eventos-meta/", {
          params: { tipo: "lead", sin_contacto: 1 },
        });
        const normalized = normalize(data);
        writeCache(normalized);
        if (mounted) {
          setUsuarios(normalized);
        }
      } finally {
        if (!silent && mounted) setLoading(false);
      }
    };

    const cached = readCache();
    if (cached) {
      setUsuarios(cached);
    }
    load({ silent: Boolean(cached) });

    const handleRefresh = () => {
      load({ silent: true });
    };
    const handleStorage = (event) => {
      if (event.key === "leads_refresh_ts") {
        load({ silent: true });
      }
    };
    const unsubscribeRealtime = subscribeRealtimeEvents((message) => {
      if (message?.type === "lead_created" || message?.type === "contact_created") {
        load({ silent: true });
      }
    });
    window.addEventListener("leads:refresh", handleRefresh);
    window.addEventListener("storage", handleStorage);
    return () => {
      mounted = false;
      unsubscribeRealtime();
      window.removeEventListener("leads:refresh", handleRefresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, [empresaId]);

  useEffect(() => {
    setMissingDataChoice(null);
    setExtraContacto("");
    setExtraNombre("");
  }, [selectedCliente?.id]);

  const selectedClienteHasContacto = Boolean(String(selectedCliente?.contacto || "").trim());
  const needsMissingDataDecision = Boolean(selectedCliente?.id) && !selectedClienteHasContacto;
  const shouldShowExtraFields = needsMissingDataDecision && missingDataChoice === "add";

  const canSubmit = useMemo(
    () => {
      if (!selectedCliente?.id || !empresaId) {
        return false;
      }
      if (!needsMissingDataDecision) {
        return true;
      }
      if (missingDataChoice === "skip") {
        return true;
      }
      if (missingDataChoice !== "add") {
        return false;
      }
      return Boolean(extraContacto.trim() || extraNombre.trim());
    },
    [selectedCliente, empresaId, needsMissingDataDecision, missingDataChoice, extraContacto, extraNombre]
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (shouldShowExtraFields) {
        const payload = {};
        if (extraContacto.trim()) {
          payload.contacto = extraContacto.trim();
        }
        if (extraNombre.trim()) {
          payload.nombre = extraNombre.trim();
        }
        if (Object.keys(payload).length) {
          await apiClient.patch(`/clientes/${selectedCliente.id}/`, payload);
        }
      }

      await apiClient.post("/eventos-meta/", {
        cliente_id: selectedCliente.id,
        tipo: "contact",
        empresa_id: empresaId,
      });
      markClientesDirty();
      markLeadsDirty();
      window.dispatchEvent(new CustomEvent("leads:refresh"));
      setSelectedCliente(null);
      setToast({ open: true, severity: "success", message: "Contacto guardado." });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setToast({
        open: true,
        severity: "error",
        message: detail || "No se pudo guardar el contacto.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2} className="form-stack">
      {kommoEnabled ? (
        <Alert severity="info" variant="outlined">
          Integracion Kommo activa. Este guardado manual queda como fallback si no llegara el webhook.
        </Alert>
      ) : null}
        <Autocomplete
        disablePortal
        id="combo-box-demo"
        options={usuarios}
        loading={loading}
        className="form-autocomplete"
        getOptionLabel={(option) => option.label || ""}
        value={selectedCliente}
        onChange={(event, value) => setSelectedCliente(value)}
        renderOption={(props, option) => (
          <li {...props}>
            {option.label || buildClienteDisplayLabel(option)}
          </li>
        )}
        renderInput={(params) => <TextField {...params} label="Seleccione el cliente" sx={fieldSx} />}
      />
      {needsMissingDataDecision ? (
        <Stack spacing={1.25}>
          <Alert severity="warning" variant="outlined">
            Este cliente no tiene numero cargado. Queres agregar datos antes de enviar el evento?
          </Alert>
          <Stack direction="row" spacing={1}>
            <Button
              variant={missingDataChoice === "add" ? "contained" : "outlined"}
              onClick={() => setMissingDataChoice("add")}
              disabled={submitting}
            >
              Si
            </Button>
            <Button
              variant={missingDataChoice === "skip" ? "contained" : "outlined"}
              onClick={() => setMissingDataChoice("skip")}
              disabled={submitting}
            >
              No
            </Button>
          </Stack>
          {shouldShowExtraFields ? (
            <Stack spacing={1.5}>
              <Typography variant="body2" sx={{ color }}>
                Completa nombre, numero o ambos. Para habilitar el envio, al menos uno tiene que estar completo.
              </Typography>
              <TextField
                label="Numero"
                value={extraContacto}
                onChange={(event) => setExtraContacto(event.target.value)}
                sx={fieldSx}
              />
              <TextField
                label="Nombre"
                value={extraNombre}
                onChange={(event) => setExtraNombre(event.target.value)}
                sx={fieldSx}
              />
            </Stack>
          ) : null}
        </Stack>
      ) : null}
        <Button variant="outlined" onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
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
    </Stack>
  );
}
