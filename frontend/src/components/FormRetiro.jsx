import { useEffect, useMemo, useState } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { useTheme } from "@mui/material/styles";
import UploadButton from "./UploadButton";
import "../assets/css/Form.css";
import { fetchClientes } from "../services/operativo/clientes";
import { apiClient } from "../services/auth";
import { useTenant } from "../context/TenantContext";

export default function FormRetiro() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const color = isDarkMode ? "#f4f4f5" : "#000000";
  const [usuarios, setUsuarios] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [monto, setMonto] = useState("");
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, severity: "success", message: "" });
  const { tenantId: empresaId } = useTenant();

  const fieldSx = {
    "& .MuiInputBase-input": { color },
    "& .MuiInputLabel-root": { color },
    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": { borderColor: color },
    "&:hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": { borderColor: color },
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: color },
    "& .MuiSvgIcon-root": { color },
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

  const canSubmit = useMemo(() => {
    return Boolean(selectedCliente?.id) && Boolean(monto) && Boolean(empresaId);
  }, [selectedCliente, monto, empresaId]);

  const formattedMonto = useMemo(() => {
    const value = Number(monto || 0);
    return Number.isFinite(value) ? value.toLocaleString("es-AR") : "0";
  }, [monto]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("empresa", String(empresaId));
      formData.append("cliente", selectedCliente.id);
      formData.append("monto_ars", monto);
      if (comprobanteFile) {
        formData.append("comprobante_archivo", comprobanteFile);
      }
      await apiClient.post("/retiros/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMonto("");
      setSelectedCliente(null);
      setComprobanteFile(null);
      setToast({ open: true, severity: "success", message: "Retiro guardado." });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setToast({
        open: true,
        severity: "error",
        message: detail || "No se pudo guardar el retiro.",
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
        options={usuarios}
        loading={loading}
        className="form-autocomplete"
        getOptionLabel={(option) => option.label || ""}
        value={selectedCliente}
        onChange={(event, value) => setSelectedCliente(value)}
        renderInput={(params) => <TextField {...params} label="Seleccione el cliente" sx={fieldSx} />}
      />
      <TextField
        id="retiro-monto"
        label="Monto"
        variant="outlined"
        fullWidth
        type="number"
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        sx={fieldSx}
      />
      <UploadButton label="Subir comprobante" onUpload={setComprobanteFile} />
      <Button variant="outlined" onClick={openConfirm} disabled={!canSubmit || submitting}>
        {submitting ? "Guardando..." : "Guardar"}
      </Button>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar retiro</DialogTitle>
        <DialogContent>
          {`¿Deseas guardar el retiro de $${formattedMonto} ARS para el cliente ${selectedCliente?.username || "cliente"}?`}
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
