import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import { apiClient } from "../services/auth";
import { markClientesDirty } from "../services/operativo/clientes";
import { buildClienteDisplayLabel } from "../utils/clientDisplay";

const CLIENT_CODE_MIN_LENGTH = 6;
const CLIENT_CODE_MAX_LENGTH = 10;

export default function FormClienteCreate({ empresaId, onCreated }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const color = isDarkMode ? "#f4f4f5" : "#000000";
  const [landings, setLandings] = useState([]);
  const [selectedLanding, setSelectedLanding] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ severity: "info", text: "" });
  const [confirmExistingOpen, setConfirmExistingOpen] = useState(false);
  const [existingCliente, setExistingCliente] = useState(null);

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
    if (!empresaId) {
      setLandings([]);
      setSelectedLanding(null);
      return undefined;
    }

    const loadLandings = async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get("/landings/", { params: { empresa: empresaId } });
        if (!mounted) return;
        const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        setLandings(rows.filter((landing) => landing?.activo));
      } catch {
        if (!mounted) return;
        setMessage({ severity: "error", text: "No se pudieron cargar las landings." });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadLandings();
    return () => {
      mounted = false;
    };
  }, [empresaId]);

  const canSubmit = useMemo(
    () =>
      Boolean(empresaId) &&
      Boolean(selectedLanding?.token) &&
      codigo.trim().length >= CLIENT_CODE_MIN_LENGTH &&
      codigo.trim().length <= CLIENT_CODE_MAX_LENGTH,
    [empresaId, selectedLanding, codigo]
  );

  const resetForm = () => {
    setCodigo("");
    setNombre("");
    setContacto("");
    setUsername("");
    setSelectedLanding(null);
  };

  const handleSubmit = async (options = {}) => {
    if (!canSubmit) return;
    setSubmitting(true);
    setMessage({ severity: "info", text: "" });
    try {
      await apiClient.post("/clientes/", {
        landing_token: selectedLanding.token,
        manual_create: true,
        confirm_existing_code: Boolean(options.confirmExistingCode),
        codigo: codigo.trim(),
        ...(nombre.trim() ? { nombre: nombre.trim() } : {}),
        ...(contacto.trim() ? { contacto: contacto.trim() } : {}),
        ...(username.trim() ? { username: username.trim() } : {}),
      });
      markClientesDirty();
      resetForm();
      setConfirmExistingOpen(false);
      setExistingCliente(null);
      setMessage({ severity: "success", text: "Cliente creado." });
      onCreated?.();
    } catch (err) {
      if (err?.response?.status === 409 && err?.response?.data?.code_conflict) {
        setExistingCliente(err.response.data.existing_cliente || null);
        setConfirmExistingOpen(true);
        setMessage({ severity: "warning", text: err.response.data.detail || "Cliente existente, desea crear igualmente?" });
        return;
      }
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        "No se pudo crear el cliente.";
      setMessage({ severity: "error", text: detail });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      {!empresaId ? (
        <Alert severity="info" variant="outlined">
          Selecciona una empresa para crear un cliente.
        </Alert>
      ) : null}
      {message.text ? (
        <Alert severity={message.severity} variant="outlined">
          {message.text}
        </Alert>
      ) : null}
      <Autocomplete
        disablePortal
        options={landings}
        loading={loading}
        value={selectedLanding}
        onChange={(event, value) => setSelectedLanding(value)}
        getOptionLabel={(option) => option?.nombre || ""}
        renderInput={(params) => <TextField {...params} label="Landing" sx={fieldSx} />}
      />
      <TextField
        label="Codigo"
        value={codigo}
        onChange={(event) => setCodigo(event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, CLIENT_CODE_MAX_LENGTH))}
        required
        helperText="Obligatorio. Usa 6 a 8 digitos o el nuevo formato AA + 8 caracteres."
        sx={fieldSx}
      />
      <TextField label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} sx={fieldSx} />
      <TextField label="Contacto" value={contacto} onChange={(event) => setContacto(event.target.value)} sx={fieldSx} />
      <TextField label="Username" value={username} onChange={(event) => setUsername(event.target.value)} sx={fieldSx} />
      <Button variant="outlined" onClick={handleSubmit} disabled={!canSubmit || submitting}>
        {submitting ? "Creando..." : "Crear cliente"}
      </Button>
      <Dialog open={confirmExistingOpen} onClose={() => setConfirmExistingOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Cliente existente</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <Alert severity="warning" variant="outlined">
              Cliente existente, desea crear igualmente?
            </Alert>
            {existingCliente ? (
              <Alert severity="info" variant="outlined">
                {buildClienteDisplayLabel(existingCliente)}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmExistingOpen(false)} variant="outlined" disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => handleSubmit({ confirmExistingCode: true })} variant="contained" disabled={submitting}>
            Crear igualmente
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
