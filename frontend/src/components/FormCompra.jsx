import { useEffect, useMemo, useState } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import "../assets/css/Form.css";
import UploadButton from './UploadButton';
import { useTheme } from '@mui/material/styles';
import { fetchClientes } from '../services/operativo/clientes';
import { apiClient } from '../services/auth';
import { useTenant } from '../context/TenantContext';

export default function FormCompra() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const color = isDarkMode ? '#f4f4f5' : '#000000';
  const [usuarios, setUsuarios] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [monto, setMonto] = useState("");
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [hasBono, setHasBono] = useState(false);
  const [bono, setBono] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, severity: "success", message: "" });
  const { tenantId: empresaId, features } = useTenant();
  const enableBonos = Boolean(features?.bonos);
  const fieldSx = {
    '& .MuiInputBase-input': { color: `${color} !important` },
    '& .MuiInputLabel-root': { color: `${color} !important` },
    '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: `${color} !important` },
    '&:hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: `${color} !important` },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: `${color} !important` },
    '& .MuiSvgIcon-root': { color: `${color} !important` },
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchClientes();
        if (mounted) {
          const options = (data || []).map((cliente) => ({
            ...cliente,
            label: `${cliente.contacto} - ${cliente.username}`,
          }));
          setUsuarios(options);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [empresaId]);

  useEffect(() => {
    if (!enableBonos) {
      setHasBono(false);
      setBono("");
    }
  }, [enableBonos]);

  const canSubmit = useMemo(() => {
    return Boolean(selectedCliente?.id) && Boolean(monto) && Boolean(empresaId);
  }, [selectedCliente, monto, empresaId]);

  const formattedMonto = useMemo(() => {
    const value = Number(monto || 0);
    return Number.isFinite(value) ? value.toLocaleString("es-AR") : "0";
  }, [monto]);

  const formattedBono = useMemo(() => {
    const value = Number(bono || 0);
    return Number.isFinite(value) ? value.toLocaleString("es-AR") : "0";
  }, [bono]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("empresa", String(empresaId));
      formData.append("cliente", selectedCliente.id);
      formData.append("monto_ars", monto);
      const bonoArs = enableBonos && hasBono ? Number(bono || 0) : 0;
      formData.append("bono_ars", String(bonoArs));
      if (comprobanteFile) {
        formData.append("comprobante_archivo", comprobanteFile);
      }
      await apiClient.post("/compras/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("compra:created", {
            detail: { clienteId: selectedCliente.id, montoArs: monto, at: Date.now() },
          })
        );
        try {
          window.localStorage.setItem(
            "compra:last-created",
            JSON.stringify({ at: Date.now(), clienteId: selectedCliente.id })
          );
        } catch {
          // ignore storage errors
        }
      }
      setMonto("");
      setBono("");
      setHasBono(false);
      setSelectedCliente(null);
      setComprobanteFile(null);
      setToast({ open: true, severity: "success", message: "Compra guardada." });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setToast({
        open: true,
        severity: "error",
        message: detail || "No se pudo guardar la compra.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirm = () => {
    if (!canSubmit || submitting) return;
    setConfirmOpen(true);
  };

  return (
    <Stack spacing={2} className="form-stack">
        <Autocomplete
        disablePortal
        id="combo-box-demo"
        options={usuarios}
        loading={loading}
        className="form-autocomplete"
        getOptionLabel={(option) => option.label || ""}
        value={selectedCliente}
        onChange={(event, value) => setSelectedCliente(value)}
        renderInput={(params) => <TextField {...params} label="Seleccione el cliente" 
        sx={{ ...fieldSx, 
              '& .MuiAutocomplete-input': { color: `${color} !important` },
              '& .MuiFormLabel-root': { color: `${color} !important` },
              '& .MuiOutlinedInput-root': { borderColor: `${color} !important` },

        }} />}
      />
        <TextField id="outlined-basic" label="Monto" variant="outlined" fullWidth type='number'
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        sx={fieldSx}
        />
        {enableBonos ? (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={hasBono}
                  onChange={(event) => setHasBono(event.target.checked)}
                />
              }
              label="Bono"
            />
            {hasBono ? (
              <TextField
                id="bono-ars"
                label="Monto de bono"
                variant="outlined"
                fullWidth
                type='number'
                value={bono}
                onChange={(e) => setBono(e.target.value)}
                sx={fieldSx}
              />
            ) : null}
          </>
        ) : null}
        <UploadButton label="Subir comprobante" onUpload={setComprobanteFile} />
        <Button variant="outlined" onClick={openConfirm} disabled={!canSubmit || submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar compra</DialogTitle>
        <DialogContent>
          {enableBonos
            ? `¿Deseas guardar la compra para ${selectedCliente?.username || "cliente"} con monto de $${formattedMonto} ARS y bono de $${hasBono ? formattedBono : "0"} ARS?`
            : `¿Deseas guardar la compra para ${selectedCliente?.username || "cliente"} con monto de $${formattedMonto} ARS?`}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              setConfirmOpen(false);
              await handleSubmit();
            }}
            variant="contained"
            disabled={submitting}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
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
