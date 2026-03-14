import { useEffect, useMemo, useState, startTransition } from "react";
import { Navigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import Page from "../layouts/Page";
import { apiClient, getCurrentUser } from "../services/auth";
import { mergeEmpresaParam } from "../services/tenant";

const TIPO_LABELS = {
  lead: "Lead",
  contact: "Contact",
  purchase: "Purchase",
};

const ESTADO_LABELS = {
  pendiente: "Pendiente",
  enviado: "Enviado",
  fallido: "Fallido",
};

const boolLabel = (value) => (value ? "Si" : "No");

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("es-AR");
}

function formatMoney(value, currency) {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || ""}`.trim();
  }
}

function resolveStatusColor(estado) {
  if (estado === "enviado") return "success";
  if (estado === "fallido") return "error";
  return "warning";
}

function DataRow({ label, value }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: "break-word" }}>
        {value || "-"}
      </Typography>
    </Box>
  );
}

function TargetCard({ target }) {
  const response = target?.response || {};
  const messages = Array.isArray(response?.messages) ? response.messages.filter(Boolean) : [];

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, backgroundColor: target?.ok ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)" }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {target?.nombre || "Pixel"}
            </Typography>
            <Chip size="small" color={target?.ok ? "success" : "error"} label={target?.ok ? "OK" : "Error"} />
            {target?.is_primary ? <Chip size="small" variant="outlined" label="Primario" /> : null}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Pixel {target?.pixel_id || "-"}
          </Typography>
        </Stack>

        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <DataRow label="Credencial" value={target?.credencial_id ? `#${target.credencial_id}` : "-"} />
          <DataRow label="Eventos recibidos" value={response?.events_received ?? "-"} />
          <DataRow label="FB Trace ID" value={response?.fbtrace_id || "-"} />
        </Box>

        {messages.length ? (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            {messages.join(" | ")}
          </Alert>
        ) : null}

        {response?.error ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {String(response.error)}
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EventCard({ event, onRetry, retrying }) {
  const payload = event?.data || {};
  const meta = event?.respuesta_meta || {};
  const targets = Array.isArray(meta?.targets) ? meta.targets : [];

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 4,
        borderColor: "rgba(15,23,42,0.12)",
        boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2.25 }}>
        <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={2}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip color={resolveStatusColor(event?.estado_envio)} label={ESTADO_LABELS[event?.estado_envio] || event?.estado_envio || "-"} size="small" />
              <Chip variant="outlined" label={TIPO_LABELS[event?.tipo] || event?.tipo || "-"} size="small" />
              <Chip variant="outlined" label={event?.empresa_nombre || `Empresa #${event?.empresa}`} size="small" />
              {event?.landing_nombre ? <Chip variant="outlined" label={`Landing ${event.landing_nombre}`} size="small" /> : null}
            </Stack>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {event?.cliente_nombre || "Sin nombre"} {event?.cliente_contacto ? `· ${event.cliente_contacto}` : ""}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Evento #{event?.id} · UUID {event?.id_evento || "-"}
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
            <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Creado
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatDateTime(event?.creado_en)}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="primary"
              startIcon={retrying ? <CircularProgress size={16} color="inherit" /> : <ReplayOutlinedIcon />}
              onClick={() => onRetry(event)}
              disabled={retrying}
              sx={{ borderRadius: 999 }}
            >
              Reenviar
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
          <DataRow label="Usuario" value={event?.cliente_username || "-"} />
          <DataRow label="Codigo cliente" value={event?.cliente_codigo || "-"} />
          <DataRow label="Operador" value={event?.operador_username || "-"} />
          <DataRow label="Reintentos" value={String(event?.reintentos ?? 0)} />
        </Box>

        <Divider />

        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <DataRow label="Telefono payload" value={payload?.phone || "-"} />
          <DataRow label="Email" value={payload?.email || "-"} />
          <DataRow label="Nombre payload" value={payload?.nombre || "-"} />
          <DataRow label="External ID" value={payload?.external_id || "-"} />
          <DataRow label="FBP" value={event?.fbp || "-"} />
          <DataRow label="FBC" value={event?.fbc || "-"} />
          <DataRow label="IP" value={event?.ip_address || "-"} />
          <DataRow label="User Agent" value={event?.user_agent || "-"} />
          <DataRow label="URL origen" value={payload?.event_source_url || "-"} />
        </Box>

        {event?.tipo === "purchase" ? (
          <Alert severity="info" sx={{ borderRadius: 3 }}>
            Valor enviado: {formatMoney(payload?.value, payload?.currency)}.
          </Alert>
        ) : null}

        <Divider />

        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Respuesta Meta
            </Typography>
            <Chip size="small" color={meta?.primary_ok ? "success" : "error"} label={`Primario ${boolLabel(Boolean(meta?.primary_ok))}`} />
            <Chip size="small" variant="outlined" label={`Fallos extra ${meta?.extra_failures ?? 0}`} />
            <Chip size="small" variant="outlined" label={`Targets ${targets.length}`} />
          </Stack>

          {targets.length ? (
            <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" } }}>
              {targets.map((target, index) => (
                <TargetCard key={`${event?.id}-target-${index}`} target={target} />
              ))}
            </Box>
          ) : (
            <Alert severity="warning" sx={{ borderRadius: 3 }}>
              Este evento no tiene targets registrados en `respuesta_meta`.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function MetaEvents() {
  const currentUser = getCurrentUser();
  const [rows, setRows] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [retryingId, setRetryingId] = useState(null);
  const [filters, setFilters] = useState({
    empresa: "",
    tipo: "",
    estado: "",
    limit: 50,
  });

  const isSuperuser = Boolean(currentUser?.is_superuser);

  const loadEmpresas = async () => {
    const { data } = await apiClient.get("/empresas/");
    const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
    setEmpresas(items);
  };

  const loadRows = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const params = {
        limit: filters.limit,
      };
      if (filters.empresa) params.empresa = filters.empresa;
      if (filters.tipo) params.tipo = filters.tipo;
      if (filters.estado) params.estado_envio = filters.estado;
      const { data } = await apiClient.get("/eventos-meta/", { params: mergeEmpresaParam(params) });
      const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      startTransition(() => {
        setRows(items);
      });
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || requestError?.message || "No se pudieron cargar los eventos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isSuperuser) return;
    loadEmpresas().catch(() => {});
  }, [isSuperuser]);

  useEffect(() => {
    if (!isSuperuser) return;
    loadRows();
  }, [filters.empresa, filters.tipo, filters.estado, filters.limit, isSuperuser]);

  const actions = useMemo(
    () => (
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ width: "100%", justifyContent: "flex-end" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="meta-events-empresa-label">Empresa</InputLabel>
          <Select
            labelId="meta-events-empresa-label"
            label="Empresa"
            value={filters.empresa}
            onChange={(event) => setFilters((prev) => ({ ...prev, empresa: event.target.value }))}
          >
            <MenuItem value="">Todas</MenuItem>
            {empresas.map((empresa) => (
              <MenuItem key={empresa.id} value={empresa.id}>
                {empresa.nombre || `Empresa #${empresa.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="meta-events-tipo-label">Tipo</InputLabel>
          <Select
            labelId="meta-events-tipo-label"
            label="Tipo"
            value={filters.tipo}
            onChange={(event) => setFilters((prev) => ({ ...prev, tipo: event.target.value }))}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="lead">Lead</MenuItem>
            <MenuItem value="contact">Contact</MenuItem>
            <MenuItem value="purchase">Purchase</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="meta-events-estado-label">Estado</InputLabel>
          <Select
            labelId="meta-events-estado-label"
            label="Estado"
            value={filters.estado}
            onChange={(event) => setFilters((prev) => ({ ...prev, estado: event.target.value }))}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="pendiente">Pendiente</MenuItem>
            <MenuItem value="enviado">Enviado</MenuItem>
            <MenuItem value="fallido">Fallido</MenuItem>
          </Select>
        </FormControl>

        <TextField
          select
          size="small"
          label="Limite"
          value={filters.limit}
          onChange={(event) => setFilters((prev) => ({ ...prev, limit: Number(event.target.value) || 50 }))}
          sx={{ minWidth: 110 }}
        >
          {[25, 50, 100].map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>

        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshOutlinedIcon />}
          onClick={() => loadRows({ silent: true })}
          disabled={refreshing}
          sx={{ borderRadius: 999 }}
        >
          Actualizar
        </Button>
      </Stack>
    ),
    [empresas, filters.empresa, filters.estado, filters.limit, filters.tipo, refreshing]
  );

  if (!isSuperuser) {
    return <Navigate to="/home" replace />;
  }

  return (
    <Page title="Eventos Meta" actions={actions}>
      <Stack spacing={2} sx={{ width: "100%" }}>
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          Vista completa para superusuario. Respeta tenant cuando filtras por empresa y permite reenviar el mismo evento a Meta.
        </Alert>

        {error ? (
          <Alert severity="error" sx={{ borderRadius: 3 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <Alert severity="warning" sx={{ borderRadius: 3 }}>
            No hay eventos para los filtros seleccionados.
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ width: "100%" }}>
            {rows.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                retrying={retryingId === event.id}
                onRetry={async (currentEvent) => {
                  setRetryingId(currentEvent.id);
                  setError("");
                  try {
                    const params = filters.empresa ? { empresa: filters.empresa } : {};
                    const { data } = await apiClient.post(`/eventos-meta/${currentEvent.id}/retry/`, null, { params });
                    const nextEvent = data?.evento || currentEvent;
                    setRows((prev) => prev.map((item) => (item.id === currentEvent.id ? nextEvent : item)));
                  } catch (requestError) {
                    setError(requestError?.response?.data?.detail || requestError?.message || "No se pudo reenviar el evento.");
                  } finally {
                    setRetryingId(null);
                  }
                }}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Page>
  );
}
