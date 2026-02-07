import { useEffect, useMemo, useState } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import "../assets/css/Form.css";
import { useTheme } from '@mui/material/styles';
import { fetchClientes } from '../services/operativo/clientes';
import { apiClient, getCurrentUser } from '../services/auth';

export default function FormContacto() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const color = isDarkMode ? '#f4f4f5' : '#000000';
  const [usuarios, setUsuarios] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const canSubmit = useMemo(() => Boolean(selectedCliente?.id) && Boolean(empresaId), [selectedCliente, empresaId]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await apiClient.post("/eventos-meta/", {
        cliente_id: selectedCliente.id,
        tipo: "contact",
        empresa_id: empresaId,
      });
      setSelectedCliente(null);
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
        <Button variant="outlined" onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
    </Stack>
  );
}
