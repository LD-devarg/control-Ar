import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import CloseIcon from "@mui/icons-material/Close";
import CircularProgress from "@mui/material/CircularProgress";
import {
  createByType,
  createProvisioningStructure,
  fetchRemoteOptions,
  getCreateConfig,
  normalizeAdsetForCreate,
} from "../services/pauta/create";
import FieldRenderer from "./pautaCreate/FieldRenderer";
import {
  buildInitialValues,
  buildPayloadFromValues,
  createRowId,
  isCommonBulkField,
  isEmptyValue,
  resolveBulkContextField,
  resolveErrorMessage,
  shouldUseBulk,
  validateRequiredFields,
} from "./pautaCreate/helpers";

const META_CONFIRM_TYPES = new Set(["Campaigns", "Adsets", "Ads"]);

function createNestedRowId() {
  return `nested-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function PautaCreateModal({ open, onClose, types = [], defaultType, onCreated }) {
  const options = useMemo(() => types.map((item) => ({ key: item, label: item })), [types]);
  const whiteFieldSx = useMemo(
    () => ({
      "& .MuiInputBase-input": {
        color: "#ffffff",
      },
      "& .MuiInputBase-input::placeholder": {
        color: "rgba(255,255,255,0.65)",
        opacity: 1,
      },
      "& .MuiInputLabel-root": {
        color: "rgba(255,255,255,0.8)",
      },
      "& .MuiInputLabel-root.Mui-focused": {
        color: "#ffffff",
      },
      "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
        borderColor: "rgba(255,255,255,0.7)",
      },
      "&:hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
        borderColor: "#ffffff",
      },
      "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "#ffffff",
      },
      "& .MuiSvgIcon-root": {
        color: "#ffffff",
      },
    }),
    []
  );

  const whiteAutocompletePopperSx = useMemo(
    () => ({
      zIndex: 4000,
      "& .MuiPaper-root": {
        backgroundColor: "#111827",
        color: "#ffffff",
      },
      "& .MuiAutocomplete-option": {
        color: "#ffffff",
      },
      "& .MuiAutocomplete-option[aria-selected='true']": {
        backgroundColor: "rgba(59,130,246,0.25)",
      },
      "& .MuiAutocomplete-option.Mui-focused": {
        backgroundColor: "rgba(255,255,255,0.12)",
      },
    }),
    []
  );

  const [selectedType, setSelectedType] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [remoteOptions, setRemoteOptions] = useState({});
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmMetaOpen, setConfirmMetaOpen] = useState(false);
  const [showSecretByField, setShowSecretByField] = useState({});

  const [bulkContextValues, setBulkContextValues] = useState({});
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkApplyValues, setBulkApplyValues] = useState({});
  const [bulkRowErrors, setBulkRowErrors] = useState({});

  const [fullStackMode, setFullStackMode] = useState(false);
  const [campaignStackValues, setCampaignStackValues] = useState({});
  const [adsetStackRows, setAdsetStackRows] = useState([]);
  const [stackErrors, setStackErrors] = useState({});

  const dialogTitleId = "pauta-create-modal-title";
  const remoteLoadIdRef = useRef(0);

  const config = selectedType ? getCreateConfig(selectedType.key) : null;
  const shouldAskMetaConfirm = useMemo(() => META_CONFIRM_TYPES.has(selectedType?.key), [selectedType]);
  const canUseFullStack = selectedType?.key === "Campaigns";
  const campaignConfig = useMemo(() => getCreateConfig("Campaigns"), []);
  const adsetConfig = useMemo(() => getCreateConfig("Adsets"), []);
  const adConfig = useMemo(() => getCreateConfig("Ads"), []);
  const adsetCampaignFieldName = useMemo(() => {
    const candidate = adsetConfig?.fields?.find((field) => field.type === "select-remote" && field.source === "/campanas/");
    return candidate?.name || "campaña";
  }, [adsetConfig]);
  const adConjuntoFieldName = useMemo(() => {
    const candidate = adConfig?.fields?.find((field) => field.type === "select-remote" && field.source === "/conjuntos-anuncios/");
    return candidate?.name || "conjunto_anuncios";
  }, [adConfig]);
  const campaignStackFields = useMemo(() => {
    if (!campaignConfig?.fields) return [];
    return campaignConfig.fields;
  }, [campaignConfig]);
  const adsetStackFields = useMemo(() => {
    if (!adsetConfig?.fields) return [];
    return adsetConfig.fields.filter((field) => field.name !== adsetCampaignFieldName);
  }, [adsetConfig, adsetCampaignFieldName]);
  const adStackFields = useMemo(() => {
    if (!adConfig?.fields) return [];
    return adConfig.fields.filter((field) => field.name !== adConjuntoFieldName);
  }, [adConfig, adConjuntoFieldName]);
  const bulkMode = useMemo(() => shouldUseBulk(selectedType?.key), [selectedType]);
  const bulkContextField = useMemo(
    () => (bulkMode ? resolveBulkContextField(config, selectedType?.key) : null),
    [bulkMode, config, selectedType]
  );
  const bulkContextFields = useMemo(() => (bulkContextField ? [bulkContextField] : []), [bulkContextField]);
  const bulkRowFields = useMemo(() => {
    if (!bulkMode || !config?.fields?.length) return [];
    if (!bulkContextField) return config.fields;
    return config.fields.filter((field) => field.name !== bulkContextField.name);
  }, [bulkMode, config, bulkContextField]);
  const commonBulkFields = useMemo(() => bulkRowFields.filter(isCommonBulkField), [bulkRowFields]);

  useEffect(() => {
    if (!open) return;
    const initial = options.find((option) => option.key === defaultType) ?? null;
    setSelectedType(initial);
    setError("");
    setSuccess("");
  }, [defaultType, open, options]);

  useEffect(() => {
    if (open) return;
    setSelectedType(null);
    setFormValues({});
    setRemoteOptions({});
    setLoadingRemote(false);
    setSaving(false);
    setError("");
    setSuccess("");
    setConfirmMetaOpen(false);
    setShowSecretByField({});
    setBulkContextValues({});
    setBulkRows([]);
    setBulkApplyValues({});
    setBulkRowErrors({});
    setFullStackMode(false);
    setCampaignStackValues({});
    setAdsetStackRows([]);
    setStackErrors({});
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (canUseFullStack && fullStackMode) {
      setCampaignStackValues(buildInitialValues(campaignStackFields));
      setAdsetStackRows([
        {
          id: createNestedRowId(),
          values: buildInitialValues(adsetStackFields),
          ads: [{ id: createNestedRowId(), values: buildInitialValues(adStackFields) }],
        },
      ]);
      setStackErrors({});
      setFormValues({});
      setBulkContextValues({});
      setBulkRows([]);
      setBulkApplyValues({});
      setBulkRowErrors({});
    } else if (bulkMode) {
      setBulkContextValues(buildInitialValues(bulkContextFields));
      const rowInitial = buildInitialValues(bulkRowFields);
      setBulkRows([{ id: createRowId(), values: rowInitial }]);
      setBulkApplyValues(buildInitialValues(commonBulkFields));
      setBulkRowErrors({});
      setFormValues({});
    } else {
      setFormValues(buildInitialValues(config?.fields || []));
      setBulkContextValues({});
      setBulkRows([]);
      setBulkApplyValues({});
      setBulkRowErrors({});
    }

    setRemoteOptions({});
    setShowSecretByField({});
    setError("");
    setSuccess("");
  }, [
    open,
    config,
    bulkMode,
    canUseFullStack,
    fullStackMode,
    bulkContextFields,
    bulkRowFields,
    commonBulkFields,
    campaignStackFields,
    adsetStackFields,
    adStackFields,
  ]);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      let fieldsForRemote = config?.fields || [];
      if (canUseFullStack && fullStackMode) {
        fieldsForRemote = [
          ...(campaignConfig?.fields || []),
          ...(adsetConfig?.fields || []),
          ...(adConfig?.fields || []),
        ];
      }
      if (!fieldsForRemote.length) return;
      const remoteFields = fieldsForRemote.filter(
        (field) => field.type === "select-remote" || field.type === "multiselect-remote"
      );
      if (remoteFields.length === 0) return;

      const loadId = ++remoteLoadIdRef.current;
      setLoadingRemote(true);

      try {
        const next = await fetchRemoteOptions(remoteFields);
        if (loadId !== remoteLoadIdRef.current) return;
        setRemoteOptions(next || {});
      } catch (err) {
        if (loadId !== remoteLoadIdRef.current) return;
        const detail = err?.response?.data?.detail;
        setError(detail || err?.message || "No se pudieron cargar las opciones relacionadas.");
      } finally {
        if (loadId === remoteLoadIdRef.current) {
          setLoadingRemote(false);
        }
      }
    };

    load();
  }, [open, config, canUseFullStack, fullStackMode, campaignConfig, adsetConfig, adConfig]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  const updateField = useCallback((name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const updateBulkContextField = useCallback((name, value) => {
    setBulkContextValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const updateBulkApplyField = useCallback((name, value) => {
    setBulkApplyValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const updateBulkRowField = useCallback((rowId, name, value) => {
    setBulkRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, values: { ...row.values, [name]: value } } : row))
    );
    setBulkRowErrors((prev) => {
      if (!prev[rowId]) return prev;
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }, []);

  const addBulkRow = useCallback(() => {
    const rowInitial = buildInitialValues(bulkRowFields);
    setBulkRows((prev) => [...prev, { id: createRowId(), values: rowInitial }]);
  }, [bulkRowFields]);

  const duplicateBulkRow = useCallback((rowId) => {
    setBulkRows((prev) => {
      const source = prev.find((row) => row.id === rowId);
      if (!source) return prev;
      return [...prev, { id: createRowId(), values: { ...source.values } }];
    });
  }, []);

  const removeBulkRow = useCallback((rowId) => {
    setBulkRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== rowId);
    });
    setBulkRowErrors((prev) => {
      if (!prev[rowId]) return prev;
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }, []);

  const applyCommonValuesToAllRows = useCallback(() => {
    setBulkRows((prev) =>
      prev.map((row) => {
        const nextValues = { ...row.values };
        for (const field of commonBulkFields) {
          const nextValue = bulkApplyValues[field.name];
          if (!isEmptyValue(nextValue, field)) {
            nextValues[field.name] = nextValue;
          }
        }
        return { ...row, values: nextValues };
      })
    );
  }, [bulkApplyValues, commonBulkFields]);

  const updateCampaignStackField = useCallback((name, value) => {
    setCampaignStackValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const updateAdsetStackField = useCallback((adsetId, name, value) => {
    setAdsetStackRows((prev) =>
      prev.map((row) => (row.id === adsetId ? { ...row, values: { ...row.values, [name]: value } } : row))
    );
    setStackErrors((prev) => {
      if (!prev[adsetId]) return prev;
      const next = { ...prev };
      delete next[adsetId];
      return next;
    });
  }, []);

  const updateAdStackField = useCallback((adsetId, adId, name, value) => {
    setAdsetStackRows((prev) =>
      prev.map((row) => {
        if (row.id !== adsetId) return row;
        return {
          ...row,
          ads: row.ads.map((ad) => (ad.id === adId ? { ...ad, values: { ...ad.values, [name]: value } } : ad)),
        };
      })
    );
  }, []);

  const addAdsetStackRow = useCallback(() => {
    setAdsetStackRows((prev) => [
      ...prev,
      {
        id: createNestedRowId(),
        values: buildInitialValues(adsetStackFields),
        ads: [{ id: createNestedRowId(), values: buildInitialValues(adStackFields) }],
      },
    ]);
  }, [adsetStackFields, adStackFields]);

  const removeAdsetStackRow = useCallback((adsetId) => {
    setAdsetStackRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== adsetId);
    });
    setStackErrors((prev) => {
      if (!prev[adsetId]) return prev;
      const next = { ...prev };
      delete next[adsetId];
      return next;
    });
  }, []);

  const addAdToAdset = useCallback(
    (adsetId) => {
      setAdsetStackRows((prev) =>
        prev.map((row) =>
          row.id === adsetId
            ? { ...row, ads: [...row.ads, { id: createNestedRowId(), values: buildInitialValues(adStackFields) }] }
            : row
        )
      );
    },
    [adStackFields]
  );

  const removeAdFromAdset = useCallback((adsetId, adId) => {
    setAdsetStackRows((prev) =>
      prev.map((row) => {
        if (row.id !== adsetId) return row;
        if (row.ads.length <= 1) return row;
        return { ...row, ads: row.ads.filter((ad) => ad.id !== adId) };
      })
    );
  }, []);

  const toggleShowSecret = useCallback((fieldName) => {
    setShowSecretByField((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  }, []);

  const validateSingleRequired = useCallback(() => {
    if (!config?.fields) return true;
    const message = validateRequiredFields(config.fields, formValues);
    if (message) {
      setError(message);
      return false;
    }
    return true;
  }, [config, formValues]);

  const validateBulkRequired = useCallback(() => {
    if (!config?.fields) return false;

    const contextError = validateRequiredFields(bulkContextFields, bulkContextValues);
    if (contextError) {
      setError(contextError);
      return false;
    }

    if (bulkRows.length === 0) {
      setError("Agrega al menos una fila para crear.");
      return false;
    }

    const rowErrors = {};
    for (const row of bulkRows) {
      const rowMessage = validateRequiredFields(bulkRowFields, row.values);
      if (rowMessage) {
        rowErrors[row.id] = rowMessage;
      }
    }

    setBulkRowErrors(rowErrors);

    if (Object.keys(rowErrors).length > 0) {
      setError("Hay filas con campos obligatorios incompletos.");
      return false;
    }

    return true;
  }, [config, bulkContextFields, bulkContextValues, bulkRows, bulkRowFields]);

  const validateFullStackRequired = useCallback(() => {
    const campaignError = validateRequiredFields(campaignStackFields, campaignStackValues);
    if (campaignError) {
      setError(campaignError);
      return false;
    }

    if (adsetStackRows.length === 0) {
      setError("Agrega al menos un adset.");
      return false;
    }

    const nextErrors = {};
    for (const adsetRow of adsetStackRows) {
      const adsetError = validateRequiredFields(adsetStackFields, adsetRow.values);
      if (adsetError) {
        nextErrors[adsetRow.id] = adsetError;
        continue;
      }
      if (!Array.isArray(adsetRow.ads) || adsetRow.ads.length === 0) {
        nextErrors[adsetRow.id] = "Cada adset requiere al menos un ad.";
        continue;
      }
      for (const adRow of adsetRow.ads) {
        const adError = validateRequiredFields(adStackFields, adRow.values);
        if (adError) {
          nextErrors[adsetRow.id] = adError;
          break;
        }
      }
    }

    setStackErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Revisa campaign/adsets/ads: hay campos obligatorios incompletos.");
      return false;
    }
    return true;
  }, [campaignStackFields, campaignStackValues, adsetStackRows, adsetStackFields, adStackFields]);

  const singleFormHasRequiredMissing = useMemo(() => {
    if (!config?.fields || bulkMode) return false;
    return config.fields.some((field) => field.required && isEmptyValue(formValues[field.name], field));
  }, [config, bulkMode, formValues]);

  const bulkFormHasRequiredMissing = useMemo(() => {
    if (!bulkMode) return false;

    const contextMissing = bulkContextFields.some(
      (field) => field.required && isEmptyValue(bulkContextValues[field.name], field)
    );
    if (contextMissing) return true;

    if (bulkRows.length === 0) return true;

    return bulkRows.some((row) =>
      bulkRowFields.some((field) => field.required && isEmptyValue(row.values[field.name], field))
    );
  }, [bulkMode, bulkContextFields, bulkContextValues, bulkRows, bulkRowFields]);

  const fullStackHasRequiredMissing = useMemo(() => {
    if (!(canUseFullStack && fullStackMode)) return false;

    const campaignMissing = campaignStackFields.some(
      (field) => field.required && isEmptyValue(campaignStackValues[field.name], field)
    );
    if (campaignMissing) return true;

    if (adsetStackRows.length === 0) return true;

    return adsetStackRows.some((adsetRow) => {
      const adsetMissing = adsetStackFields.some(
        (field) => field.required && isEmptyValue(adsetRow.values[field.name], field)
      );
      if (adsetMissing) return true;
      if (!Array.isArray(adsetRow.ads) || adsetRow.ads.length === 0) return true;
      return adsetRow.ads.some((adRow) =>
        adStackFields.some((field) => field.required && isEmptyValue(adRow.values[field.name], field))
      );
    });
  }, [
    canUseFullStack,
    fullStackMode,
    campaignStackFields,
    campaignStackValues,
    adsetStackRows,
    adsetStackFields,
    adStackFields,
  ]);

  const isSubmitDisabled =
    !selectedType ||
    saving ||
    config?.mode === "external-pipeline" ||
    (canUseFullStack && fullStackMode
      ? fullStackHasRequiredMissing
      : bulkMode
        ? bulkFormHasRequiredMissing
        : singleFormHasRequiredMissing);

  const handleSubmitSingle = async (createMetaDraft = true) => {
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
    if (!validateSingleRequired()) return;

    let payload = {};
    try {
      payload = buildPayloadFromValues(config.fields, formValues);
    } catch (buildError) {
      setError(buildError?.message || "Hay un campo con formato invalido.");
      return;
    }

    setSaving(true);
    try {
      const data = await createByType(selectedType.key, payload, { createMetaDraft });
      setSuccess("Registro creado correctamente.");
      onCreated?.({ type: selectedType.key, data });
    } catch (requestError) {
      const message =
        resolveErrorMessage(requestError?.response?.data) ||
        requestError?.message ||
        "No se pudo crear el registro.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitBulk = async (createMetaDraft = true) => {
    if (!selectedType) {
      setError("Selecciona un tipo de registro.");
      return;
    }
    if (!config?.fields?.length) {
      setError("Tipo de registro no soportado.");
      return;
    }
    if (!validateBulkRequired()) return;

    const payloads = [];

    for (let idx = 0; idx < bulkRows.length; idx += 1) {
      const row = bulkRows[idx];
      const mergedValues = { ...bulkContextValues, ...row.values };
      try {
        payloads.push(buildPayloadFromValues(config.fields, mergedValues));
      } catch (buildError) {
        setBulkRowErrors((prev) => ({ ...prev, [row.id]: buildError?.message || "Formato invalido" }));
        setError(`Error en fila ${idx + 1}: ${buildError?.message || "Formato invalido"}`);
        return;
      }
    }

    setSaving(true);
    try {
      const results = await Promise.allSettled(
        payloads.map((payload) => createByType(selectedType.key, payload, { createMetaDraft }))
      );
      const failures = [];
      const createdData = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          createdData.push(result.value);
          return;
        }
        const reason = result.reason;
        const message =
          resolveErrorMessage(reason?.response?.data) || reason?.message || "No se pudo crear la fila.";
        failures.push(`Fila ${index + 1}: ${message}`);
      });

      const successCount = createdData.length;
      const failedCount = failures.length;

      if (failedCount === 0) {
        setSuccess(`Se crearon ${successCount} registros correctamente.`);
        onCreated?.({ type: selectedType.key, data: createdData });
        return;
      }

      if (successCount > 0) {
        setSuccess(`Se crearon ${successCount} registros.`);
      }

      setError(`Fallaron ${failedCount} registros. ${failures.join(" | ")}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitFullStack = async (createMetaDraft = true) => {
    if (!validateFullStackRequired()) return;

    let campaignPayload = {};
    const adsetsPayload = [];

    try {
      campaignPayload = buildPayloadFromValues(campaignStackFields, campaignStackValues);

      for (const adsetRow of adsetStackRows) {
        const adsetRaw = buildPayloadFromValues(adsetStackFields, adsetRow.values);
        const adsetNormalized = normalizeAdsetForCreate(adsetRaw);
        const ads = adsetRow.ads.map((adRow) => buildPayloadFromValues(adStackFields, adRow.values));
        adsetsPayload.push({ ...adsetNormalized, ads });
      }
    } catch (buildError) {
      setError(buildError?.message || "Hay un campo con formato invalido.");
      return;
    }

    setSaving(true);
    try {
      const response = await createProvisioningStructure(
        {
          campana: campaignPayload,
          adsets: adsetsPayload,
        },
        { createMetaDraft }
      );
      const summary = response?.summary || {};
      setSuccess(
        `Creacion completada. Campana: ${summary.campaign_created ? "si" : "no"}, Adsets: ${summary.adsets_created || 0}, Ads: ${summary.ads_created || 0}.`
      );
      onCreated?.({ type: "Campaigns", data: response });
    } catch (requestError) {
      const message =
        resolveErrorMessage(requestError?.response?.data) ||
        requestError?.message ||
        "No se pudo crear la estructura completa.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setConfirmMetaOpen(false);

    if (canUseFullStack && fullStackMode) {
      if (!validateFullStackRequired()) return;
    } else if (bulkMode) {
      if (!validateBulkRequired()) return;
    } else {
      if (!validateSingleRequired()) return;
    }

    if (shouldAskMetaConfirm) {
      setConfirmMetaOpen(true);
      return;
    }

    if (canUseFullStack && fullStackMode) {
      await handleSubmitFullStack(true);
      return;
    }
    if (bulkMode) {
      await handleSubmitBulk(true);
      return;
    }
    await handleSubmitSingle(true);
  };

  const handleConfirmMeta = async (createMetaDraft) => {
    setConfirmMetaOpen(false);
    if (canUseFullStack && fullStackMode) {
      await handleSubmitFullStack(createMetaDraft);
      return;
    }
    if (bulkMode) {
      await handleSubmitBulk(createMetaDraft);
      return;
    }
    await handleSubmitSingle(createMetaDraft);
  };

  const handleCancelMetaConfirm = () => {
    setConfirmMetaOpen(false);
  };

  const handleBackdropClick = () => {
    if (confirmMetaOpen) return;
    onClose?.();
  };

  const stopClickPropagation = (event) => {
    event.stopPropagation();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="flex h-[94vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-3xl border border-white/15 bg-neutral-950/95 shadow-2xl shadow-black/60"
        onClick={stopClickPropagation}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
      >
        <div className="flex items-start justify-between border-b border-white/10 bg-gradient-to-r from-slate-900/70 via-neutral-900 to-slate-900/70 px-5 py-4 sm:px-6">
          <div>
            <h3 id={dialogTitleId} className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              Crear Registro de Pauta
            </h3>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
              Carga local con opcion de crear borrador en Meta para Campaigns, Adsets y Ads.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de creacion"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-[900px] space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <p className="mb-3 text-sm font-medium text-zinc-200">Tipo de registro</p>
              <Autocomplete
                options={options}
                value={selectedType}
                onChange={(_, value) => setSelectedType(value)}
                isOptionEqualToValue={(option, value) => option.key === value?.key}
                getOptionLabel={(option) => option?.label || ""}
                slotProps={{ popper: { sx: whiteAutocompletePopperSx } }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tipo de registro"
                    placeholder="Seleccionar..."
                    fullWidth
                    size="small"
                    sx={whiteFieldSx}
                  />
                )}
              />
            </div>

            {config?.mode === "external-pipeline" ? (
              <Alert severity="info">Assets se gestiona por flujo separado: subida a S3 y posterior sincronizacion con Meta.</Alert>
            ) : null}

            {canUseFullStack ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5">
                <FormControlLabel
                  control={
                    <Switch
                      checked={fullStackMode}
                      onChange={(_, checked) => setFullStackMode(checked)}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#60a5fa" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                          backgroundColor: "#3b82f6",
                        },
                      }}
                    />
                  }
                  label={
                    <span className="text-sm text-zinc-200">
                      Crear estructura completa (Campana + Adsets + Ads) en una sola operacion
                    </span>
                  }
                />
              </div>
            ) : null}

            {loadingRemote ? (
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CircularProgress size={18} />
                Cargando opciones relacionadas...
              </div>
            ) : null}

            {!bulkMode && !(canUseFullStack && fullStackMode) ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <div className="space-y-3">
                  {config?.fields?.map((field) => (
                    <FieldRenderer
                      key={field.name}
                      field={field}
                      value={formValues[field.name]}
                      onChange={updateField}
                      remoteOptions={remoteOptions}
                      showSecretByField={showSecretByField}
                      toggleShowSecret={toggleShowSecret}
                      whiteAutocompletePopperSx={whiteAutocompletePopperSx}
                      whiteFieldSx={whiteFieldSx}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {canUseFullStack && fullStackMode ? (
              <>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                  <p className="mb-3 text-sm font-semibold text-white">Campana</p>
                  <div className="space-y-3">
                    {campaignStackFields.map((field) => (
                      <FieldRenderer
                        key={`stack-campaign-${field.name}`}
                        field={field}
                        value={campaignStackValues[field.name]}
                        onChange={updateCampaignStackField}
                        remoteOptions={remoteOptions}
                        showSecretByField={showSecretByField}
                        toggleShowSecret={toggleShowSecret}
                        whiteAutocompletePopperSx={whiteAutocompletePopperSx}
                        whiteFieldSx={whiteFieldSx}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Adsets y Ads</p>
                    <Button variant="contained" size="small" onClick={addAdsetStackRow}>
                      + Agregar adset
                    </Button>
                  </div>

                  {adsetStackRows.map((adsetRow, adsetIndex) => (
                    <div key={adsetRow.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">Adset {adsetIndex + 1}</p>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          disabled={adsetStackRows.length <= 1}
                          onClick={() => removeAdsetStackRow(adsetRow.id)}
                        >
                          Eliminar adset
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {adsetStackFields.map((field) => (
                          <FieldRenderer
                            key={`stack-adset-${adsetRow.id}-${field.name}`}
                            field={field}
                            value={adsetRow.values[field.name]}
                            onChange={(name, value) => updateAdsetStackField(adsetRow.id, name, value)}
                            remoteOptions={remoteOptions}
                            showSecretByField={showSecretByField}
                            toggleShowSecret={toggleShowSecret}
                            whiteAutocompletePopperSx={whiteAutocompletePopperSx}
                            whiteFieldSx={whiteFieldSx}
                          />
                        ))}
                      </div>

                      <div className="mt-4 border-t border-white/10 pt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">Ads del adset</p>
                          <Button variant="outlined" size="small" onClick={() => addAdToAdset(adsetRow.id)}>
                            + Agregar ad
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {adsetRow.ads.map((adRow, adIndex) => (
                            <div key={adRow.id} className="rounded-lg border border-white/10 bg-black/20 p-3 sm:p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                                  Ad {adIndex + 1}
                                </p>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="error"
                                  disabled={adsetRow.ads.length <= 1}
                                  onClick={() => removeAdFromAdset(adsetRow.id, adRow.id)}
                                >
                                  Eliminar
                                </Button>
                              </div>
                              <div className="space-y-3">
                                {adStackFields.map((field) => (
                                  <FieldRenderer
                                    key={`stack-ad-${adsetRow.id}-${adRow.id}-${field.name}`}
                                    field={field}
                                    value={adRow.values[field.name]}
                                    onChange={(name, value) => updateAdStackField(adsetRow.id, adRow.id, name, value)}
                                    remoteOptions={remoteOptions}
                                    showSecretByField={showSecretByField}
                                    toggleShowSecret={toggleShowSecret}
                                    whiteAutocompletePopperSx={whiteAutocompletePopperSx}
                                    whiteFieldSx={whiteFieldSx}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {stackErrors[adsetRow.id] ? (
                        <div className="mt-3">
                          <Alert severity="error">{stackErrors[adsetRow.id]}</Alert>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {bulkMode ? (
              <>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                  <p className="mb-3 text-sm font-semibold text-white">Contexto compartido</p>
                  <div className="space-y-3">
                    {bulkContextFields.map((field) => (
                      <FieldRenderer
                        key={`${field.name}-bulk-context`}
                        field={field}
                        value={bulkContextValues[field.name]}
                        onChange={updateBulkContextField}
                        remoteOptions={remoteOptions}
                        showSecretByField={showSecretByField}
                        toggleShowSecret={toggleShowSecret}
                        whiteAutocompletePopperSx={whiteAutocompletePopperSx}
                        whiteFieldSx={whiteFieldSx}
                      />
                    ))}
                  </div>
                </div>

                {commonBulkFields.length > 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">Aplicar valores a todas las filas (opcional)</p>
                      <Button variant="outlined" size="small" onClick={applyCommonValuesToAllRows}>
                        Aplicar a todas
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {commonBulkFields.map((field) => (
                        <FieldRenderer
                          key={`${field.name}-bulk-apply`}
                          field={field}
                          value={bulkApplyValues[field.name]}
                          onChange={updateBulkApplyField}
                          remoteOptions={remoteOptions}
                          showSecretByField={showSecretByField}
                          toggleShowSecret={toggleShowSecret}
                          whiteAutocompletePopperSx={whiteAutocompletePopperSx}
                          whiteFieldSx={whiteFieldSx}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Filas de creacion</p>
                    <Button variant="contained" size="small" onClick={addBulkRow}>
                      + Agregar fila
                    </Button>
                  </div>

                  {bulkRows.map((row, index) => (
                    <div key={row.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">Fila {index + 1}</p>
                        <div className="flex items-center gap-2">
                          <Button variant="outlined" size="small" onClick={() => duplicateBulkRow(row.id)}>
                            Duplicar
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            disabled={bulkRows.length <= 1}
                            onClick={() => removeBulkRow(row.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {bulkRowFields.map((field) => (
                          <FieldRenderer
                            key={`${field.name}-bulk-row-${row.id}`}
                            field={field}
                            value={row.values[field.name]}
                            onChange={(name, value) => updateBulkRowField(row.id, name, value)}
                            remoteOptions={remoteOptions}
                            showSecretByField={showSecretByField}
                            toggleShowSecret={toggleShowSecret}
                            whiteAutocompletePopperSx={whiteAutocompletePopperSx}
                            whiteFieldSx={whiteFieldSx}
                          />
                        ))}
                      </div>

                      {bulkRowErrors[row.id] ? (
                        <div className="mt-3">
                          <Alert severity="error">{bulkRowErrors[row.id]}</Alert>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {error ? <Alert severity="error">{error}</Alert> : null}
            {success ? <Alert severity="success">{success}</Alert> : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-neutral-900/80 px-5 py-4 sm:px-6">
          <Button variant="outlined" onClick={onClose} sx={{ borderColor: "rgba(255,255,255,0.7)", color: "#ffffff" }}>
            Cancelar
          </Button>
          <Button variant="contained" disabled={isSubmitDisabled} onClick={handleSubmit}>
            {saving ? "Guardando..." : bulkMode ? "Crear en lote" : "Crear"}
          </Button>
        </div>
      </div>

      {confirmMetaOpen ? (
        <div
          className="fixed inset-0 z-[4200] flex items-center justify-center bg-black/50 p-4"
          onClick={handleCancelMetaConfirm}
          role="presentation"
        >
          <div
            className="w-full max-w-[560px] rounded-2xl border border-white/20 bg-neutral-900 p-5 shadow-2xl"
            onClick={stopClickPropagation}
            role="dialog"
            aria-modal="true"
            aria-labelledby="meta-confirm-title"
          >
            <h4 id="meta-confirm-title" className="text-lg font-semibold text-white">
              Confirmar creacion
            </h4>
            <p className="mt-2 text-sm text-zinc-300">
              {bulkMode
                ? "Queres crear estos borradores en Meta ademas de guardarlos en la base de datos?"
                : "Queres crear borrador en Meta ademas de guardarlo en la base de datos?"}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outlined" onClick={handleCancelMetaConfirm} sx={{ borderColor: "rgba(255,255,255,0.7)", color: "#ffffff" }}>
                Volver
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => handleConfirmMeta(false)}>
                No, solo base de datos
              </Button>
              <Button variant="contained" onClick={() => handleConfirmMeta(true)}>
                Si, crear en Meta
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default memo(PautaCreateModal);


