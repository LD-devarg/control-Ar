import { useEffect, useMemo, useState } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import "../assets/css/Form.css";
import UploadButton from './UploadButton';
import { useTheme } from '@mui/material/styles';
import { fetchClientes } from '../services/operativo/clientes';
import { apiClient, getCurrentUser } from '../services/auth';

export default function FormCompra() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const color = isDarkMode ? '#f4f4f5' : '#000000';
  const [usuarios, setUsuarios] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [monto, setMonto] = useState("");
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, severity: "success", message: "" });
  const empresaId = getCurrentUser()?.empresa;
  const fieldSx = {
    '& .MuiInputBase-input': { color },
    '& .MuiInputLabel-root': { color },
    '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '&:hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '& .MuiSvgIcon-root': { color },
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
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(selectedCliente?.id) && Boolean(monto) && Boolean(empresaId);
  }, [selectedCliente, monto, empresaId]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("cliente", selectedCliente.id);
      formData.append("monto_ars", monto);
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
        renderInput={(params) => <TextField {...params} label="Seleccione el cliente" sx={fieldSx} />}
      />
        <TextField id="outlined-basic" label="Monto" variant="outlined" fullWidth type='number'
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        sx={fieldSx}
        />
        <UploadButton label="Subir comprobante" onUpload={setComprobanteFile} />
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
