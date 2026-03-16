import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import { apiClient } from "../services/auth";
import { markClientesDirty } from "../services/operativo/clientes";

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
    () => Boolean(empresaId) && Boolean(selectedLanding?.token) && codigo.trim().length === 6,
    [empresaId, selectedLanding, codigo]
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setMessage({ severity: "info", text: "" });
    try {
      await apiClient.post("/clientes/", {
        landing_token: selectedLanding.token,
        codigo: codigo.trim(),
        ...(nombre.trim() ? { nombre: nombre.trim() } : {}),
        ...(contacto.trim() ? { contacto: contacto.trim() } : {}),
        ...(username.trim() ? { username: username.trim() } : {}),
      });
      markClientesDirty();
      setCodigo("");
      setNombre("");
      setContacto("");
      setUsername("");
      setSelectedLanding(null);
      setMessage({ severity: "success", text: "Cliente creado." });
      onCreated?.();
    } catch (err) {
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
        onChange={(event) => setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6))}
        required
        helperText="Obligatorio. Debe tener 6 digitos."
        sx={fieldSx}
      />
      <TextField label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} sx={fieldSx} />
      <TextField label="Contacto" value={contacto} onChange={(event) => setContacto(event.target.value)} sx={fieldSx} />
      <TextField label="Username" value={username} onChange={(event) => setUsername(event.target.value)} sx={fieldSx} />
      <Button variant="outlined" onClick={handleSubmit} disabled={!canSubmit || submitting}>
        {submitting ? "Creando..." : "Crear cliente"}
      </Button>
    </Stack>
  );
}
