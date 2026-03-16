import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import { apiClient } from "../services/auth";
import { mergeEmpresaParam } from "../services/tenant";
import { buildClienteDisplayLabel } from "../utils/clientDisplay";

export default function FormLeadEvent({ empresaId, onCreated }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const color = isDarkMode ? "#f4f4f5" : "#000000";
  const [clientes, setClientes] = useState([]);
  const [landings, setLandings] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [selectedLanding, setSelectedLanding] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ severity: "info", message: "" });

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
      setClientes([]);
      setLandings([]);
      setSelectedCliente(null);
      setSelectedLanding(null);
      return undefined;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [clientesResponse, landingsResponse] = await Promise.all([
          apiClient.get("/clientes/", { params: mergeEmpresaParam({ empresa: empresaId }) }),
          apiClient.get("/landings/", { params: mergeEmpresaParam({ empresa: empresaId }) }),
        ]);
        if (!mounted) return;
        const clientesRows = Array.isArray(clientesResponse.data)
          ? clientesResponse.data
          : Array.isArray(clientesResponse.data?.results)
            ? clientesResponse.data.results
            : [];
        const landingRows = Array.isArray(landingsResponse.data)
          ? landingsResponse.data
          : Array.isArray(landingsResponse.data?.results)
            ? landingsResponse.data.results
            : [];
        setClientes(
          clientesRows.map((cliente) => ({
            ...cliente,
            label: buildClienteDisplayLabel(cliente),
          }))
        );
        setLandings(landingRows.filter((landing) => landing?.activo));
      } catch {
        if (!mounted) return;
        setToast({ severity: "error", message: "No se pudieron cargar clientes o landings." });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [empresaId]);

  const canSubmit = useMemo(
    () => Boolean(empresaId) && Boolean(selectedCliente?.id) && Boolean(selectedLanding?.token),
    [empresaId, selectedCliente, selectedLanding]
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setToast({ severity: "info", message: "" });
    try {
      await apiClient.post("/eventos-meta/", {
        cliente_id: selectedCliente.id,
        landing_token: selectedLanding.token,
        tipo: "lead",
      });
      setToast({ severity: "success", message: "Lead creado." });
      setSelectedCliente(null);
      setSelectedLanding(null);
      onCreated?.();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setToast({ severity: "error", message: detail || "No se pudo crear el lead." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      {!empresaId ? (
        <Alert severity="info" variant="outlined">
          Selecciona una empresa para crear un lead manual.
        </Alert>
      ) : null}
      {toast.message ? (
        <Alert severity={toast.severity} variant="outlined">
          {toast.message}
        </Alert>
      ) : null}
      <Autocomplete
        disablePortal
        options={clientes}
        loading={loading}
        value={selectedCliente}
        onChange={(event, value) => setSelectedCliente(value)}
        getOptionLabel={(option) => option.label || ""}
        renderInput={(params) => <TextField {...params} label="Cliente" sx={fieldSx} />}
      />
      <Autocomplete
        disablePortal
        options={landings}
        loading={loading}
        value={selectedLanding}
        onChange={(event, value) => setSelectedLanding(value)}
        getOptionLabel={(option) => option?.nombre || ""}
        renderInput={(params) => <TextField {...params} label="Landing" sx={fieldSx} />}
      />
      <Button variant="outlined" onClick={handleSubmit} disabled={!canSubmit || submitting}>
        {submitting ? "Creando..." : "Crear lead"}
      </Button>
    </Stack>
  );
}
