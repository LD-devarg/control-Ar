import { useEffect, useMemo, useRef, useState } from "react";
import Page from "../layouts/Page";
import TablaPauta from "../components/TablaPauta";
import PautaCreateModal from "../components/PautaCreateModal";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { apiClient } from "../services/auth";

const META_STATUS_OPTIONS = ["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"];

const ENDPOINTS_BY_VIEW = {
  Bms: "/bms/",
  "Ad Accounts": "/cuentas-publicitarias/",
  FanPage: "/fanpages/",
  Campaigns: "/campanas/",
  Adsets: "/conjuntos-anuncios/",
  Assets: "/pauta-assets/",
  Creatives: "/creatives/",
  Ads: "/anuncios/",
};

const EDITABLE_FIELDS_BY_VIEW = {
  Bms: ["nombre", "meta_id", "estado", "empresas"],
  "Ad Accounts": ["nombre", "meta_id", "estado"],
  FanPage: ["nombre", "meta_id", "estado"],
  Campaigns: ["nombre", "meta_id", "estado", "objetivo"],
  Adsets: ["nombre", "meta_id", "estado", "presupuesto_diario"],
  Assets: ["s3_url", "meta_asset_id", "estado"],
  Creatives: ["nombre", "primary_text", "headline", "descripcion", "url_destino", "cta", "meta_id"],
  Ads: ["nombre", "meta_id", "estado"],
};

const FIELD_LABELS = {
  nombre: "Nombre",
  meta_id: "Meta ID",
  estado: "Estado",
  objetivo: "Objetivo",
  presupuesto_diario: "Presupuesto diario",
  s3_url: "S3 URL",
  meta_asset_id: "Meta Asset ID",
  primary_text: "Texto principal",
  headline: "Headline",
  descripcion: "Descripcion",
  url_destino: "URL destino",
  cta: "CTA",
  empresas: "Empresas vinculadas",
};

const COLUMN_SETS = {
  Bms: [
    { key: "name", label: "Nombre" },
    { key: "metaId", label: "Meta_ID" },
    { key: "empresas", label: "Empresas" },
    { key: "status", label: "Estado" },
  ],
  "Ad Accounts": [
    { key: "name", label: "Nombre" },
    { key: "bm", label: "Bm" },
    { key: "metaId", label: "Meta_ID" },
    { key: "status", label: "Estado" },
  ],
  FanPage: [
    { key: "name", label: "Nombre" },
    { key: "metaId", label: "Meta_ID" },
    { key: "status", label: "Estado" },
  ],
  Campaigns: [
    { key: "name", label: "Nombre" },
    { key: "adAccount", label: "Ad Account" },
    { key: "metaId", label: "Meta_ID" },
    { key: "createdAt", label: "Fecha de creacion" },
    { key: "objective", label: "Objetivo" },
    { key: "status", label: "Estado" },
  ],
  Adsets: [
    { key: "name", label: "Nombre" },
    { key: "campaign", label: "Campaign" },
    { key: "metaId", label: "Meta_ID" },
    { key: "budget", label: "Presupuesto" },
    { key: "createdAt", label: "Fecha de creacion" },
    { key: "location", label: "Ubicacion" },
    { key: "region", label: "Region" },
    { key: "conversionSite", label: "Sitio de Conversion" },
    { key: "ageRange", label: "Rango Edad" },
    { key: "gender", label: "Sexo" },
    { key: "targeting", label: "Segmentacion" },
    { key: "status", label: "Estado" },
  ],
  Assets: [
    { key: "name", label: "Nombre" },
    { key: "s3_url", label: "S3 URL" },
    { key: "metaAssetId", label: "Meta_ID" },
    { key: "type", label: "Tipo" },
    { key: "status", label: "Estado" },
  ],
  Creatives: [
    { key: "name", label: "Nombre" },
    { key: "fanpage", label: "Fanpage" },
    { key: "instagram_account", label: "Cuenta de Instagram" },
    { key: "primary_text", label: "Texto" },
    { key: "headline", label: "Titulo" },
    { key: "description", label: "Descripcion" },
    { key: "metaId", label: "Meta_ID" },
    { key: "url_destino", label: "URL Destino" },
    { key: "asset", label: "Asset_ID" },
    { key: "cta", label: "CTA" },
    { key: "status", label: "Estado" },
  ],
  Ads: [
    { key: "name", label: "Nombre" },
    { key: "adset", label: "Adset" },
    { key: "metaId", label: "Meta_ID" },
    { key: "text", label: "Texto" },
    { key: "title", label: "Titulo" },
    { key: "image", label: "Imagen" },
    { key: "status", label: "Estado" },
  ],
};

export default function PautaDatabase() {
  const [tab, setTab] = useState("Bms");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedByView, setSelectedByView] = useState({});
  const [rowsByView, setRowsByView] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingRow, setDeletingRow] = useState(false);
  const [empresasOptions, setEmpresasOptions] = useState([]);
  const [editState, setEditState] = useState({ open: false, view: "", row: null, values: {} });
  const [deleteState, setDeleteState] = useState({ open: false, view: "", row: null });
  const pickerRef = useRef(null);

  const tabs = Object.keys(COLUMN_SETS);
  const createTypes = [...tabs, "Credenciales Meta"];
  const columnsForView = COLUMN_SETS[tab] ?? COLUMN_SETS.Bms;

  const selectedColumns = useMemo(() => {
    const saved = selectedByView[tab];
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return columnsForView.map(({ key }) => key);
  }, [columnsForView, selectedByView, tab]);

  const toggleColumn = (key) => {
    setSelectedByView((prev) => {
      const current = Array.isArray(prev[tab]) ? prev[tab] : columnsForView.map(({ key: columnKey }) => columnKey);
      if (current.length === 1 && current.includes(key)) return prev;
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      return { ...prev, [tab]: next };
    });
  };

  const showAll = () => {
    setSelectedByView((prev) => ({ ...prev, [tab]: columnsForView.map(({ key }) => key) }));
  };

  const hideAll = () => {
    setSelectedByView((prev) => {
      const firstKey = columnsForView[0]?.key;
      if (!firstKey) return prev;
      return { ...prev, [tab]: [firstKey] };
    });
  };

  useEffect(() => {
    if (!pickerOpen) return;
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [pickerOpen]);

  const unwrapList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };

  const loadRows = async () => {
    setLoadingData(true);
    setError("");
    try {
      const [
        bmsRes,
        empresasRes,
        adAccountsRes,
        fanpagesRes,
        campaignsRes,
        adsetsRes,
        assetsRes,
        creativesRes,
        adsRes,
      ] = await Promise.all([
        apiClient.get("/bms/"),
        apiClient.get("/empresas/"),
        apiClient.get("/cuentas-publicitarias/"),
        apiClient.get("/fanpages/"),
        apiClient.get("/campanas/"),
        apiClient.get("/conjuntos-anuncios/"),
        apiClient.get("/pauta-assets/"),
        apiClient.get("/creatives/"),
        apiClient.get("/anuncios/"),
      ]);

      const bms = unwrapList(bmsRes?.data);
      const empresas = unwrapList(empresasRes?.data);
      setEmpresasOptions(empresas);
      const adAccounts = unwrapList(adAccountsRes?.data);
      const fanpages = unwrapList(fanpagesRes?.data);
      const campaigns = unwrapList(campaignsRes?.data);
      const adsets = unwrapList(adsetsRes?.data);
      const assets = unwrapList(assetsRes?.data);
      const creatives = unwrapList(creativesRes?.data);
      const ads = unwrapList(adsRes?.data);

      const bmNameById = Object.fromEntries(bms.map((item) => [item.id, item.nombre]));
      const empresaNameById = Object.fromEntries(empresas.map((item) => [item.id, item.nombre]));
      const adAccountNameById = Object.fromEntries(adAccounts.map((item) => [item.id, item.nombre]));
      const campaignNameById = Object.fromEntries(campaigns.map((item) => [item.id, item.nombre]));
      const adsetNameById = Object.fromEntries(adsets.map((item) => [item.id, item.nombre]));
      const fanpageNameById = Object.fromEntries(fanpages.map((item) => [item.id, item.nombre]));
      const instagramNameById = Object.fromEntries(
        unwrapList((await apiClient.get("/instagram-accounts/"))?.data).map((item) => [
          item.id,
          item.username || item.nombre || `#${item.id}`,
        ])
      );
      const assetNameById = Object.fromEntries(
        assets.map((item) => [item.id, item.nombre || item.meta_asset_id || `#${item.id}`])
      );

      setRowsByView({
        Bms: bms.map((item) => ({
          id: item.id,
          name: item.nombre,
          metaId: item.meta_id,
          empresas: Array.isArray(item.empresas) ? item.empresas.map((id) => empresaNameById[id] || `#${id}`).join(", ") : "-",
          status: item.estado,
          __raw: item,
        })),
        "Ad Accounts": adAccounts.map((item) => ({
          id: item.id,
          name: item.nombre,
          bm: bmNameById[item.bm] || `#${item.bm}`,
          metaId: item.meta_id,
          status: item.estado,
          __raw: item,
        })),
        FanPage: fanpages.map((item) => ({
          id: item.id,
          name: item.nombre,
          metaId: item.meta_id,
          status: item.estado,
          __raw: item,
        })),
        Campaigns: campaigns.map((item) => ({
          id: item.id,
          name: item.nombre,
          adAccount: adAccountNameById[item.cuenta_publicitaria] || `#${item.cuenta_publicitaria}`,
          metaId: item.meta_id,
          createdAt: item.creado_en ? new Date(item.creado_en).toLocaleString("es-AR") : "-",
          objective: item.objetivo,
          status: item.estado,
          __raw: item,
        })),
        Adsets: adsets.map((item) => {
          const campaignId = item["campaña"] || item["campaÃ±a"];
          const targeting = item.segmentacion?.targeting || {};
          const genders = Array.isArray(targeting.genders)
            ? targeting.genders.map((value) => (value === 1 ? "Hombre" : value === 2 ? "Mujer" : value)).join(", ")
            : "Todos";
          return {
            id: item.id,
            name: item.nombre,
            campaign: campaignNameById[campaignId] || `#${campaignId}`,
            metaId: item.meta_id,
            budget: item.presupuesto_diario,
            createdAt: item.creado_en ? new Date(item.creado_en).toLocaleString("es-AR") : "-",
            location: targeting?.geo_locations?.countries?.join(", ") || "-",
            region: "-",
            conversionSite: item.segmentacion?.destination_type || "-",
            ageRange: targeting.age_min && targeting.age_max ? `${targeting.age_min}-${targeting.age_max}` : "-",
            gender: genders,
            targeting: JSON.stringify(targeting),
            status: item.estado,
            __raw: item,
          };
        }),
        Assets: assets.map((item) => ({
          id: item.id,
          name: item.nombre || item.meta_asset_id || `Asset #${item.id}`,
          s3_url: item.s3_url,
          metaAssetId: item.meta_asset_id,
          type: item.tipo,
          status: item.estado,
          __raw: item,
        })),
        Creatives: creatives.map((item) => ({
          id: item.id,
          name: item.nombre,
          fanpage: fanpageNameById[item.fanpage] || `#${item.fanpage}`,
          instagram_account: item.instagram_account ? instagramNameById[item.instagram_account] || `#${item.instagram_account}` : "-",
          primary_text: item.primary_text,
          headline: item.headline,
          description: item.descripcion,
          metaId: item.meta_id,
          url_destino: item.url_destino,
          asset: assetNameById[item.asset] || `#${item.asset}`,
          cta: item.cta,
          status: "-",
          __raw: item,
        })),
        Ads: ads.map((item) => ({
          id: item.id,
          name: item.nombre,
          adset: adsetNameById[item.conjunto_anuncios] || `#${item.conjunto_anuncios}`,
          metaId: item.meta_id,
          text: "-",
          title: "-",
          image: "-",
          status: item.estado,
          __raw: item,
        })),
      });
    } catch {
      setError("No se pudieron cargar los datos de pauta.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const handleOpenCreateModal = () => setCreateModalOpen(true);
  const handleCloseCreateModal = () => setCreateModalOpen(false);

  const handleCreated = ({ type }) => {
    setCreateModalOpen(false);
    if (type) setTab(type);
    loadRows();
  };

  const openEditDialog = (viewName, row) => {
    const raw = row?.__raw;
    if (!raw) return;
    const editableFields = EDITABLE_FIELDS_BY_VIEW[viewName] || [];
    const initialValues = {};
    editableFields.forEach((fieldName) => {
      if (fieldName === "empresas") {
        initialValues[fieldName] = Array.isArray(raw.empresas) ? raw.empresas : [];
      } else {
        initialValues[fieldName] = raw[fieldName] ?? "";
      }
    });
    setEditState({ open: true, view: viewName, row, values: initialValues });
  };

  const closeEditDialog = () => setEditState({ open: false, view: "", row: null, values: {} });
  const openDeleteDialog = (viewName, row) => setDeleteState({ open: true, view: viewName, row });
  const closeDeleteDialog = () => setDeleteState({ open: false, view: "", row: null });
  const updateEditField = (fieldName, value) => {
    setEditState((prev) => ({ ...prev, values: { ...prev.values, [fieldName]: value } }));
  };

  const handleSaveEdit = async () => {
    const endpoint = ENDPOINTS_BY_VIEW[editState.view];
    const rowId = editState.row?.id;
    if (!endpoint || !rowId) return;
    setSavingEdit(true);
    setError("");
    try {
      const editableFields = EDITABLE_FIELDS_BY_VIEW[editState.view] || [];
      const payload = {};
      editableFields.forEach((fieldName) => {
        payload[fieldName] = editState.values[fieldName];
      });
      await apiClient.patch(`${endpoint}${rowId}/`, payload);
      closeEditDialog();
      await loadRows();
    } catch {
      setError("No se pudo actualizar el registro.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteRow = async () => {
    const endpoint = ENDPOINTS_BY_VIEW[deleteState.view];
    const rowId = deleteState.row?.id;
    if (!endpoint || !rowId) return;
    setDeletingRow(true);
    setError("");
    try {
      await apiClient.delete(`${endpoint}${rowId}/`);
      closeDeleteDialog();
      await loadRows();
    } catch {
      setError("No se pudo eliminar el registro.");
    } finally {
      setDeletingRow(false);
    }
  };

  const editFields = EDITABLE_FIELDS_BY_VIEW[editState.view] || [];
  const bmSelectedEmpresas = empresasOptions.filter((empresa) =>
    (editState.values.empresas || []).includes(Number(empresa.id))
  );

  return (
    <Page
      title="Base de Datos Pauta Publicitaria"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outlined"
            size="medium"
            color="primary"
            startIcon={<RefreshOutlinedIcon />}
            onClick={loadRows}
            disabled={loadingData}
          >
            {loadingData ? "Actualizando..." : "Refresh"}
          </Button>
          <Button
            variant="outlined"
            size="medium"
            color="primary"
            startIcon={<AddOutlinedIcon />}
            onClick={handleOpenCreateModal}
          >
            Crear
          </Button>
        </div>
      }
    >
      <div className="mt-4 w-full">
        <div className="w-full rounded-2xl border border-slate-300/40 bg-white/80 p-4 shadow-sm dark:border-zinc-700 dark:bg-neutral-900/70">
          {error ? <div className="mb-3 text-sm text-red-500">{error}</div> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {tabs.map((label) => {
              const active = tab === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setTab(label)}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-gradient-to-b from-sky-300 to-sky-700 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-white dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}

            <div className="relative ml-auto" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setPickerOpen((open) => !open)}
                className="rounded-full border border-slate-300/70 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Columnas
              </button>
              {pickerOpen ? (
                <div className="absolute right-0 z-10 mt-2 w-[320px] rounded-xl border border-slate-300/70 bg-white/95 p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95">
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={showAll}
                      className="rounded-md border border-slate-300/70 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Mostrar todo
                    </button>
                    <button
                      type="button"
                      onClick={hideAll}
                      className="rounded-md border border-slate-300/70 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Ocultar todo
                    </button>
                  </div>
                  <div className="flex max-h-48 flex-wrap gap-2 overflow-auto pr-1 text-xs">
                    {columnsForView.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/70 px-2 py-1 text-xs text-slate-600 transition hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <input
                          id={`pauta-column-${tab}-${col.key}`}
                          name={`pauta-column-${tab}-${col.key}`}
                          type="checkbox"
                          className="accent-sky-600"
                          checked={selectedColumns.includes(col.key)}
                          onChange={() => toggleColumn(col.key)}
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <TablaPauta
              view={tab}
              rowsByView={rowsByView}
              visibleColumns={selectedColumns}
              enableColumnPicker={false}
              renderRowActions={(row) => (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="small"
                    variant="outlined"
                    color="info"
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={() => openEditDialog(tab, row)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineOutlinedIcon fontSize="small" />}
                    onClick={() => openDeleteDialog(tab, row)}
                  >
                    Eliminar
                  </Button>
                </div>
              )}
            />
          </div>
        </div>
      </div>

      <PautaCreateModal
        open={createModalOpen}
        onClose={handleCloseCreateModal}
        types={createTypes}
        defaultType={tab}
        onCreated={handleCreated}
      />

      <Dialog open={editState.open} onClose={closeEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Editar registro ({editState.view})</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {editFields.map((fieldName) => {
            if (fieldName === "empresas") {
              return (
                <Autocomplete
                  key={fieldName}
                  multiple
                  options={empresasOptions}
                  getOptionLabel={(option) => option?.nombre || `Empresa #${option?.id}`}
                  value={bmSelectedEmpresas}
                  onChange={(_, values) =>
                    updateEditField(
                      "empresas",
                      values.map((item) => Number(item.id))
                    )
                  }
                  renderInput={(params) => (
                    <TextField {...params} label={FIELD_LABELS[fieldName] || fieldName} size="small" />
                  )}
                />
              );
            }
            if (fieldName === "estado") {
              return (
                <TextField
                  key={fieldName}
                  select
                  label={FIELD_LABELS[fieldName] || fieldName}
                  size="small"
                  value={editState.values[fieldName] ?? ""}
                  onChange={(event) => updateEditField(fieldName, event.target.value)}
                >
                  {META_STATUS_OPTIONS.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>
              );
            }
            return (
              <TextField
                key={fieldName}
                label={FIELD_LABELS[fieldName] || fieldName}
                size="small"
                value={editState.values[fieldName] ?? ""}
                onChange={(event) => updateEditField(fieldName, event.target.value)}
              />
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={savingEdit}>
            {savingEdit ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteState.open} onClose={closeDeleteDialog} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar registro</DialogTitle>
        <DialogContent>
          ¿Seguro que queres eliminar <strong>{deleteState.row?.name || `#${deleteState.row?.id}`}</strong>?
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleDeleteRow} color="error" variant="contained" disabled={deletingRow}>
            {deletingRow ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}

