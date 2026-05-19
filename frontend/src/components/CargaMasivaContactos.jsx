import React, { useState, useCallback, useMemo } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';
import { apiClient } from '../services/auth';
import { useTenant } from '../context/TenantContext';
import { markClientesDirty } from '../services/operativo/clientes';

export default function CargaMasivaContactos({ open, onClose, onProcessed }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const color = isDarkMode ? '#f4f4f5' : '#000000';
  const { tenantId: empresaId } = useTenant();

  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState([]);
  const [step, setStep] = useState(1); // 1: Paste, 2: Validate/Process
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const fieldSx = {
    '& .MuiInputBase-input': { color },
    '& .MuiInputLabel-root': { color },
    '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '&:hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: color },
  };

  const handleAnalyze = () => {
    const lines = rawText.split('\n').filter(line => line.trim() !== '');
    const parsedRows = lines.map((line, index) => {
      // Split by tabs or multiple spaces
      const parts = line.trim().split(/\s+/);
      const phone = parts[0] || '';
      const codigo = parts[1] || '';
      const amountStr = parts[2] || '';
      const amount = parseFloat(amountStr) || 0;

      return {
        id: index,
        phone,
        codigo,
        amount,
        status: 'pending', // pending, searching, ready, error, success
        message: 'Esperando validación',
        cliente: null,
      };
    });

    setRows(parsedRows);
    setStep(2);
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleProcess = async () => {
    setProcessing(true);
    setProgress(0);

    const newRows = [...rows];

    for (let i = 0; i < newRows.length; i++) {
      const row = newRows[i];
      if (row.status === 'success') continue;

      row.status = 'searching';
      row.message = 'Buscando cliente...';
      setRows([...newRows]);

      try {
        // 1. Buscar Cliente
        const { data: searchData } = await apiClient.get("/clientes/", {
          params: { search: row.codigo }
        });
        
        const results = Array.isArray(searchData) ? searchData : (searchData?.results || []);
        const cliente = results.find(c => c.codigo.toUpperCase() === row.codigo.toUpperCase());

        if (!cliente) {
          row.status = 'error';
          row.message = 'Código no encontrado';
          setRows([...newRows]);
          continue;
        }

        row.message = 'Cliente encontrado. Procesando...';
        setRows([...newRows]);

        const leadDate = new Date(cliente.creado_en || Date.now());
        const contactDate = new Date(leadDate.getTime() + 2 * 60000); // +2 mins
        const compraDate = new Date(leadDate.getTime() + 4 * 60000);  // +4 mins

        // 2. Actualizar contacto si no tiene o es diferente
        if (row.phone && cliente.contacto !== row.phone) {
          await apiClient.patch(`/clientes/${cliente.id}/`, { contacto: row.phone });
        }

        // 3. Crear Evento Meta "contact" si no fue contactado
        if (!cliente.contactado) {
          await apiClient.post("/eventos-meta/", {
            cliente_id: cliente.id,
            tipo: "contact",
            empresa_id: empresaId || cliente.empresa,
            ocurrido_en: contactDate.toISOString(),
          });
        }

        // 4. Crear Compra si hay monto
        if (row.amount > 0) {
          await apiClient.post("/compras/", {
            cliente: cliente.id,
            empresa_id: empresaId || cliente.empresa,
            monto_ars: row.amount,
            evento_ocurrido_en: compraDate.toISOString(),
          });
        }

        let successMsg = [];
        if (!cliente.contactado) successMsg.push('Contacto registrado');
        else successMsg.push('Ya estaba contactado');

        if (row.amount > 0) successMsg.push('Compra registrada');

        row.status = 'success';
        row.message = successMsg.join(' | ') || 'Procesado correctamente';
      } catch (err) {
        row.status = 'error';
        row.message = err?.response?.data?.detail || err?.message || 'Error al procesar';
      }

      setRows([...newRows]);
      setProgress(((i + 1) / newRows.length) * 100);
      
      // Pequeño delay para no saturar el backend
      await delay(300);
    }

    setProcessing(false);
    if (newRows.some((row) => row.status === 'success')) {
      markClientesDirty();
      onProcessed?.();
    }
    window.dispatchEvent(new CustomEvent("leads:refresh"));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#4ade80'; // green
      case 'error': return '#f87171'; // red
      case 'searching': return '#60a5fa'; // blue
      default: return color;
    }
  };

  const handleReset = () => {
    setRawText("");
    setRows([]);
    setStep(1);
    setProgress(0);
  };

  return (
    <Dialog open={open} onClose={!processing ? onClose : undefined} maxWidth="md" fullWidth PaperProps={{ style: { backgroundColor: isDarkMode ? '#1e1e20' : '#ffffff', color } }}>
      <DialogTitle>Carga Masiva de Contactos y Compras</DialogTitle>
      <DialogContent dividers sx={{ minHeight: 400 }}>
        {step === 1 ? (
          <Stack spacing={3}>
            <Alert severity="info" sx={{ mt: 1 }}>
              Copia y pega las filas desde Excel o WhatsApp. El formato esperado por fila es: <strong>Teléfono, Código, Monto (opcional)</strong>.
            </Alert>
            <TextField
              multiline
              rows={12}
              fullWidth
              placeholder={"Ejemplo:\n5491141816616\tRET0J63086\t3200\n5493834563455\tRET762580K\t\n..."}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              sx={fieldSx}
            />
          </Stack>
        ) : (
          <Stack spacing={2}>
             <Alert severity="warning">
              Se configuraron las fechas de forma automática: Contacto (2 mins después del lead) y Compra (4 mins después del lead). Si el cliente ya fue contactado, solo se omitirá el evento de contacto.
            </Alert>
            <TableContainer component={Paper} sx={{ backgroundColor: 'transparent', boxShadow: 'none', border: `1px solid ${isDarkMode ? '#333' : '#ccc'}` }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color }}>Teléfono</TableCell>
                    <TableCell sx={{ color }}>Código</TableCell>
                    <TableCell sx={{ color }}>Monto</TableCell>
                    <TableCell sx={{ color }}>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell sx={{ color: color }}>{row.phone}</TableCell>
                      <TableCell sx={{ color: color }}>{row.codigo}</TableCell>
                      <TableCell sx={{ color: color }}>{row.amount > 0 ? `$${row.amount}` : '-'}</TableCell>
                      <TableCell sx={{ color: getStatusColor(row.status), fontSize: '0.85rem' }}>
                        {row.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {processing && (
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ color }}>Procesando... {Math.round(progress)}%</Typography>
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={processing} sx={{ color }}>
          Cerrar
        </Button>
        {step === 1 ? (
          <Button onClick={handleAnalyze} variant="contained" disabled={!rawText.trim()}>
            Analizar Texto
          </Button>
        ) : (
          <>
            <Button onClick={handleReset} disabled={processing} sx={{ color }}>
              Volver
            </Button>
            <Button onClick={handleProcess} variant="contained" disabled={processing || rows.every(r => r.status === 'success')}>
              {rows.some(r => r.status === 'error') && !processing ? 'Reintentar con errores' : 'Procesar Todos'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
