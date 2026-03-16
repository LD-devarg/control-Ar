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
  Collapse,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import Page from "../layouts/Page";
import { apiClient, getCurrentUser } from "../services/auth";
import { mergeEmpresaParam } from "../services/tenant";
import FormLeadEvent from "../components/FormLeadEvent.jsx";
import { useTenant } from "../context/TenantContext";

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
  return parsed.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
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
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", letterSpacing: 0.3, lineHeight: 1.1 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: "break-word", fontSize: 13 }}>
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
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1, p: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 14 }}>
              {target?.nombre || "Pixel"}
            </Typography>
            <Chip size="small" color={target?.ok ? "success" : "error"} label={target?.ok ? "OK" : "Error"} />
            {target?.is_primary ? <Chip size="small" variant="outlined" label="Primario" /> : null}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Pixel {target?.pixel_id || "-"}
          </Typography>
        </Stack>

        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
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

function EventDetail({ event, availableTargets, selectedTargetIds, onToggleTarget, loadingTargets }) {
  const payload = event?.data || {};
  const meta = event?.respuesta_meta || {};
  const targets = Array.isArray(meta?.targets) ? meta.targets : [];
  const hasCodigoMismatch = Boolean(payload?.codigo_provisorio_distinto);

  return (
    <Box sx={{ pt: 1.5 }}>
      <Divider sx={{ mb: 1.5 }} />
      <Card variant="outlined" sx={{ borderRadius: 3, mb: 1.25 }}>
        <CardContent sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Targets para reenvio
          </Typography>
          {loadingTargets ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Cargando pixeles disponibles...
              </Typography>
            </Box>
          ) : availableTargets.length ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {availableTargets.map((target) => {
                const selected = selectedTargetIds.includes(target.id);
                return (
                  <Chip
                    key={target.id}
                    clickable
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    onClick={() => onToggleTarget(target.id)}
                    label={`${target.nombre || "Pixel"} · ${target.pixel_id}`}
                  />
                );
              })}
            </Stack>
          ) : (
            <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
              No hay credenciales Meta configuradas para esta empresa.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", xl: "1.15fr 0.85fr" } }}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.25 }}>
              Payload y matching
            </Typography>
            {hasCodigoMismatch ? (
              <Alert severity="warning" sx={{ borderRadius: 2.5, mb: 1.25 }}>
                Codigo provisorio distinto. Se envio {payload?.codigo_solicitado || "-"} pero el cliente quedo con {payload?.codigo_final || "-"}.
              </Alert>
            ) : null}
            <Box sx={{ display: "grid", gap: 1.1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
              <DataRow label="Telefono payload" value={payload?.phone || "-"} />
              <DataRow label="Email" value={payload?.email || "-"} />
              <DataRow label="Nombre payload" value={payload?.nombre || "-"} />
              <DataRow label="External ID" value={payload?.external_id || "-"} />
              <DataRow label="Codigo solicitado" value={payload?.codigo_solicitado || "-"} />
              <DataRow label="Codigo final" value={payload?.codigo_final || event?.cliente_codigo || "-"} />
              <DataRow label="FBP" value={event?.fbp || "-"} />
              <DataRow label="FBC" value={event?.fbc || "-"} />
              <DataRow label="IP" value={event?.ip_address || "-"} />
              <DataRow label="URL origen" value={payload?.event_source_url || "-"} />
              <Box sx={{ gridColumn: { xs: "1 / -1", sm: "1 / -1" } }}>
                <DataRow label="User Agent" value={event?.user_agent || "-"} />
              </Box>
            </Box>
            {event?.tipo === "purchase" ? (
              <Alert severity="info" sx={{ borderRadius: 2.5, mt: 1.25, py: 0 }}>
                Valor enviado: {formatMoney(payload?.value, payload?.currency)}.
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Respuesta Meta
              </Typography>
              <Chip size="small" color={meta?.primary_ok ? "success" : "error"} label={`Primario ${boolLabel(Boolean(meta?.primary_ok))}`} />
              <Chip size="small" variant="outlined" label={`Fallos extra ${meta?.extra_failures ?? 0}`} />
              <Chip size="small" variant="outlined" label={`Targets ${targets.length}`} />
            </Stack>
            {targets.length ? (
              <Stack spacing={1}>
                {targets.map((target, index) => (
                  <TargetCard key={`${event?.id}-target-${index}`} target={target} />
                ))}
              </Stack>
            ) : (
              <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
                Este evento no tiene targets registrados.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

function EventRow({
  event,
  expanded,
  onToggle,
  onRetry,
  retrying,
  availableTargets,
  selectedTargetIds,
  onToggleTarget,
  loadingTargets,
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: expanded ? "rgba(59,130,246,0.45)" : "rgba(15,23,42,0.12)",
        boxShadow: expanded ? "0 18px 40px rgba(15,23,42,0.08)" : "0 8px 20px rgba(15,23,42,0.05)",
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, md: 1.75 } }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "center" }}>
          <Button
            onClick={onToggle}
            sx={{
              p: 0,
              minWidth: 0,
              justifyContent: "flex-start",
              textAlign: "left",
              textTransform: "none",
              color: "inherit",
              flex: 1,
              "&:hover": { backgroundColor: "transparent" },
            }}
          >
            <Stack spacing={1} sx={{ width: "100%" }}>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                <Chip color={resolveStatusColor(event?.estado_envio)} label={ESTADO_LABELS[event?.estado_envio] || event?.estado_envio || "-"} size="small" />
                <Chip variant="outlined" label={TIPO_LABELS[event?.tipo] || event?.tipo || "-"} size="small" />
                <Chip variant="outlined" label={event?.empresa_nombre || `Empresa #${event?.empresa}`} size="small" />
                {event?.landing_nombre ? <Chip variant="outlined" label={event.landing_nombre} size="small" /> : null}
                {expanded ? <ExpandLessOutlinedIcon fontSize="small" /> : <ExpandMoreOutlinedIcon fontSize="small" />}
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: { xs: "1fr", md: "1.5fr 1fr 0.85fr 0.6fr 0.8fr 0.65fr" },
                  alignItems: "center",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: 18 }}>
                    {event?.cliente_nombre || "Sin nombre"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    #{event?.id} · {event?.id_evento || "-"}
                  </Typography>
                </Box>
                <DataRow label="Cliente" value={event?.cliente_contacto || event?.cliente_username || "-"} />
                <DataRow label="Codigo" value={event?.cliente_codigo || "-"} />
                <DataRow label="Targets" value={String(Array.isArray(event?.respuesta_meta?.targets) ? event.respuesta_meta.targets.length : 0)} />
                <DataRow label="Creado" value={formatDateTime(event?.creado_en)} />
                <DataRow label="Retry" value={String(event?.reintentos ?? 0)} />
              </Box>
            </Stack>
          </Button>

          <Stack direction={{ xs: "row", lg: "column" }} spacing={1} alignItems={{ xs: "center", lg: "flex-end" }} justifyContent="space-between" sx={{ minWidth: { lg: 132 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", lg: "block" } }}>
              {event?.operador_username ? `Operador ${event.operador_username}` : "Sin operador"}
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={retrying ? <CircularProgress size={16} color="inherit" /> : <ReplayOutlinedIcon />}
              onClick={onRetry}
              disabled={retrying}
              sx={{ borderRadius: 999 }}
            >
              Reenviar
            </Button>
          </Stack>
        </Stack>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <EventDetail
            event={event}
            availableTargets={availableTargets}
            selectedTargetIds={selectedTargetIds}
            onToggleTarget={onToggleTarget}
            loadingTargets={loadingTargets}
          />
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default function MetaEvents() {
  const currentUser = getCurrentUser();
  const { tenantId } = useTenant();
  const [rows, setRows] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [retryingId, setRetryingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [openCreateLead, setOpenCreateLead] = useState(false);
  const [toast, setToast] = useState({ open: false, severity: "success", message: "" });
  const [targetsByEmpresa, setTargetsByEmpresa] = useState({});
  const [loadingTargetsByEmpresa, setLoadingTargetsByEmpresa] = useState({});
  const [selectedTargetsByEvent, setSelectedTargetsByEvent] = useState({});
  const [filters, setFilters] = useState({
    empresa: "",
    tipo: "",
    estado: "",
    limit: 50,
  });

  const isSuperuser = Boolean(currentUser?.is_superuser);
  const selectedEmpresaId = filters.empresa || tenantId || "";

  const loadEmpresas = async () => {
    const { data } = await apiClient.get("/empresas/");
    const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
    setEmpresas(items);
  };

  const ensureTargetsForEmpresa = async (empresaId) => {
    if (!empresaId || targetsByEmpresa[empresaId] || loadingTargetsByEmpresa[empresaId]) return;
    setLoadingTargetsByEmpresa((prev) => ({ ...prev, [empresaId]: true }));
    try {
      const { data } = await apiClient.get("/credenciales-meta/", { params: { empresa: empresaId } });
      const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setTargetsByEmpresa((prev) => ({ ...prev, [empresaId]: items }));
    } finally {
      setLoadingTargetsByEmpresa((prev) => ({ ...prev, [empresaId]: false }));
    }
  };

  const getDefaultTargetIds = (event) => {
    const targets = Array.isArray(event?.respuesta_meta?.targets) ? event.respuesta_meta.targets : [];
    return targets.map((item) => item?.credencial_id).filter(Boolean);
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
        setSelectedTargetsByEvent((prev) => {
          const next = { ...prev };
          for (const item of items) {
            if (!next[item.id] || next[item.id].length === 0) {
              next[item.id] = getDefaultTargetIds(item);
            }
          }
          return next;
        });
        setExpandedId((prev) => (items.some((item) => item.id === prev) ? prev : items[0]?.id || null));
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

  useEffect(() => {
    const expandedEvent = rows.find((item) => item.id === expandedId);
    if (!expandedEvent?.empresa) return;
    ensureTargetsForEmpresa(expandedEvent.empresa).catch(() => {});
  }, [expandedId, rows]);

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
          onClick={() => setOpenCreateLead(true)}
          sx={{ borderRadius: 999 }}
        >
          Crear lead
        </Button>

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
      <Stack
        spacing={2}
        sx={{
          width: "100%",
          height: { xs: "calc(100dvh - 190px)", md: "calc(100dvh - 170px)" },
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          Vista completa para superusuario. Cada fila resume un evento y al abrirla ves el detalle completo.
        </Alert>

        {error ? (
          <Alert severity="error" sx={{ borderRadius: 3 }}>
            {error}
          </Alert>
        ) : null}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            pr: 0.5,
            "&::-webkit-scrollbar": { width: 8 },
            "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(148,163,184,0.35)", borderRadius: 999 },
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : rows.length === 0 ? (
            <Alert severity="warning" sx={{ borderRadius: 3 }}>
              No hay eventos para los filtros seleccionados.
            </Alert>
          ) : (
            <Stack spacing={1.25} sx={{ width: "100%" }}>
              {rows.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  expanded={expandedId === event.id}
                  retrying={retryingId === event.id}
                  availableTargets={targetsByEmpresa[event.empresa] || []}
                  selectedTargetIds={selectedTargetsByEvent[event.id] || getDefaultTargetIds(event)}
                  loadingTargets={Boolean(loadingTargetsByEmpresa[event.empresa])}
                  onToggleTarget={(targetId) => {
                    setSelectedTargetsByEvent((prev) => {
                      const current = prev[event.id] || getDefaultTargetIds(event);
                      const exists = current.includes(targetId);
                      const next = exists ? current.filter((item) => item !== targetId) : [...current, targetId];
                      return { ...prev, [event.id]: next };
                    });
                  }}
                  onToggle={() => {
                    setExpandedId((prev) => (prev === event.id ? null : event.id));
                    ensureTargetsForEmpresa(event.empresa).catch(() => {});
                  }}
                  onRetry={async () => {
                    setRetryingId(event.id);
                    setError("");
                    try {
                      const params = filters.empresa ? { empresa: filters.empresa } : {};
                      const selectedIds = selectedTargetsByEvent[event.id] || getDefaultTargetIds(event);
                      if (!selectedIds.length) {
                        const message = "Selecciona al menos un target antes de reenviar.";
                        setError(message);
                        setToast({
                          open: true,
                          severity: "warning",
                          message,
                        });
                        return;
                      }
                      const { data } = await apiClient.post(
                        `/eventos-meta/${event.id}/retry/`,
                        { credencial_ids: selectedIds },
                        { params }
                      );
                      const nextEvent = data?.evento || event;
                      setRows((prev) => prev.map((item) => (item.id === event.id ? nextEvent : item)));
                      setSelectedTargetsByEvent((prev) => ({
                        ...prev,
                        [event.id]: getDefaultTargetIds(nextEvent),
                      }));
                      setExpandedId(event.id);
                      setToast({
                        open: true,
                        severity: "success",
                        message: `Evento #${event.id} reenviado a ${selectedIds.length || 0} target(s).`,
                      });
                    } catch (requestError) {
                      const message =
                        requestError?.response?.data?.detail || requestError?.message || "No se pudo reenviar el evento.";
                      setError(message);
                      setToast({
                        open: true,
                        severity: "error",
                        message,
                      });
                    } finally {
                      setRetryingId(null);
                    }
                  }}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius: 2, minWidth: 280 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
      <Dialog open={openCreateLead} onClose={() => setOpenCreateLead(false)} fullWidth maxWidth="sm">
        <DialogTitle>Crear lead</DialogTitle>
        <DialogContent>
          <FormLeadEvent
            empresaId={selectedEmpresaId}
            onCreated={() => {
              setOpenCreateLead(false);
              loadRows({ silent: true });
              setToast({ open: true, severity: "success", message: "Lead manual creado." });
            }}
          />
        </DialogContent>
      </Dialog>
    </Page>
  );
}
