import { memo, useEffect, useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import CircularProgress from "@mui/material/CircularProgress";
import { createByType, fetchRemoteOptions, getCreateConfig } from "../services/pauta/create";

function buildOptionLabel(item = {}) {
  return item.nombre || item.username || item.meta_id || item.id?.toString() || "Sin etiqueta";
}

function buildInitialForm(config) {
  if (!config?.fields) return {};
  return config.fields.reduce((acc, field) => {
    acc[field.name] = "";
    return acc;
  }, {});
}

function PautaCreateModal({ open, onClose, types = [], defaultType, onCreated }) {
  const options = useMemo(() => types.map((item) => ({ key: item, label: item })), [types]);

  const [selectedType, setSelectedType] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [remoteOptions, setRemoteOptions] = useState({});
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const config = selectedType ? getCreateConfig(selectedType.key) : null;

  useEffect(() => {
    if (!open) return;
    const initial = options.find((option) => option.key === defaultType) ?? null;
    setSelectedType(initial);
    setError("");
    setSuccess("");
  }, [defaultType, open, options]);

  useEffect(() => {
    setFormValues(buildInitialForm(config));
    setRemoteOptions({});
  }, [config]);

  useEffect(() => {
    const load = async () => {
      if (!config?.fields?.length) return;
      const remoteFields = config.fields.filter((field) => field.type === "select-remote");
      if (remoteFields.length === 0) return;
      setLoadingRemote(true);
      try {
        const next = await fetchRemoteOptions(remoteFields);
        setRemoteOptions(next || {});
      } catch {
        setError("No se pudieron cargar las opciones relacionadas.");
      } finally {
        setLoadingRemote(false);
      }
    };
    load();
  }, [config]);

  const updateField = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const validateRequired = () => {
    if (!config?.fields) return true;
    for (const field of config.fields) {
      if (!field.required) continue;
      const value = formValues[field.name];
      if (value === null || value === undefined || value === "") {
        setError(`Completa el campo obligatorio: ${field.label}.`);
        return false;
      }
    }
    return true;
  };

  const buildPayload = () => {
    if (!config?.fields) return {};
    const payload = {};
    for (const field of config.fields) {
      const raw = formValues[field.name];
      if (raw === "" || raw === null || raw === undefined) continue;
      if (field.type === "number") {
        payload[field.name] = Number(raw);
        continue;
      }
      if (field.type === "json") {
        payload[field.name] = typeof raw === "string" ? JSON.parse(raw) : raw;
        continue;
      }
      payload[field.name] = raw;
    }
    return payload;
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    if (!selectedType) {
      setError("Selecciona un tipo de registro.");
      return;
    }
    if (!config) {
      setError("Tipo de registro no soportado.");
      return;
    }
    if (config.mode === "external-pipeline") {
      setError("Assets se crea con el flujo separado de subida a S3/Meta.");
      return;
    }
    if (!validateRequired()) return;

    let payload = {};
    try {
      payload = buildPayload();
    } catch {
      setError("El campo Segmentacion debe ser un JSON valido.");
      return;
    }

    setSaving(true);
    try {
      const data = await createByType(selectedType.key, payload);
      setSuccess("Registro creado correctamente.");
      onCreated?.({ type: selectedType.key, data });
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        (typeof requestError?.response?.data === "string" ? requestError.response.data : null);
      setError(detail || "No se pudo crear el registro.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/45 p-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-full w-[90%] max-w-[1100px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/90 shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-xl font-bold text-white">Crear Registro de Pauta</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de creacion"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto w-full max-w-[760px] space-y-4">
            <p className="text-sm text-zinc-300">Selecciona el tipo de dato a crear y completa los campos requeridos.</p>

            <Autocomplete
              options={options}
              value={selectedType}
              onChange={(_, value) => setSelectedType(value)}
              isOptionEqualToValue={(option, value) => option.key === value?.key}
              getOptionLabel={(option) => option?.label || ""}
              slotProps={{ popper: { sx: { zIndex: 4000 } } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tipo de registro"
                  placeholder="Seleccionar..."
                  fullWidth
                  size="small"
                />
              )}
            />

            {config?.mode === "external-pipeline" ? (
              <Alert severity="info">Assets se gestiona por flujo separado: subida a S3 y posterior sincronizacion con Meta.</Alert>
            ) : null}

            {loadingRemote ? (
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CircularProgress size={18} />
                Cargando opciones relacionadas...
              </div>
            ) : null}

            {config?.fields?.map((field) => {
              if (field.type === "select-remote") {
                const fieldOptions = remoteOptions[field.name] || [];
                const selectedOption = fieldOptions.find((item) => item.id === formValues[field.name]) || null;
                return (
                  <Autocomplete
                    key={field.name}
                    options={fieldOptions}
                    value={selectedOption}
                    onChange={(_, value) => updateField(field.name, value?.id ?? "")}
                    getOptionLabel={(option) => buildOptionLabel(option)}
                    isOptionEqualToValue={(option, value) => option.id === value?.id}
                    slotProps={{ popper: { sx: { zIndex: 4000 } } }}
                    renderInput={(params) => (
                      <TextField {...params} label={field.label} required={field.required} size="small" />
                    )}
                  />
                );
              }

              if (field.type === "textarea") {
                return (
                  <TextField
                    key={field.name}
                    label={field.label}
                    required={field.required}
                    multiline
                    minRows={3}
                    value={formValues[field.name] ?? ""}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    fullWidth
                    size="small"
                  />
                );
              }

              return (
                <TextField
                  key={field.name}
                  label={field.label}
                  required={field.required}
                  type={field.type === "json" ? "text" : field.type}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => updateField(field.name, event.target.value)}
                  fullWidth
                  size="small"
                />
              );
            })}

            {error ? <Alert severity="error">{error}</Alert> : null}
            {success ? <Alert severity="success">{success}</Alert> : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
          <Button variant="outlined" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="contained" disabled={!selectedType || saving} onClick={handleSubmit}>
            {saving ? "Guardando..." : "Crear"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default memo(PautaCreateModal);
