import Page from "../layouts/Page";
import TablaKPI from "../components/TablaKPI.jsx";
import Button from "@mui/material/Button";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import PautaGastoModal from "../components/PautaGastoModal";
import FilterDatePicker from "../components/DatePicker";
import PerformanceObjectivesModal from "../components/PerformanceObjectivesModal.jsx";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { apiClient } from "../services/auth";
import { getEffectiveTenantId } from "../services/tenant";

const PERIOD_OPTIONS = [
    { value: "day", label: "Dia" },
    { value: "week", label: "Semana" },
    { value: "month", label: "Mes" },
];

const ACCOUNT_OPTIONS = [
    { value: "all", label: "Todas" },
    { value: "main", label: "Principal" },
    { value: "scale", label: "Escala" },
];

const VIEW_OPTIONS = [
    { value: "executiva", label: "Vista ejecutiva" },
    { value: "operativa", label: "Vista operativa" },
];
const TABLET_MAX_WIDTH = 1024;

function isIpadDevice() {
    const userAgent = navigator.userAgent || "";
    const isiPadUA = /iPad/i.test(userAgent);
    const isiPadOSDesktopUA = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    return isiPadUA || isiPadOSDesktopUA;
}

const fieldSx = {
  minWidth: 90,
  "& .MuiOutlinedInput-root": {
    color: "#fff",
    "& fieldset": { borderColor: "rgba(255,255,255,0.25)" },
    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.45)" },
    "&.Mui-focused fieldset": { borderColor: "#22d3ee" }
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255,255,255,0.75)"
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#22d3ee"
  },
  "& .MuiSvgIcon-root": {
    color: "rgba(255,255,255,0.75)"
  }
};

function PautaKPI() {
    const [modalOpen, setModalOpen] = useState(false);
    const [toast, setToast] = useState({ open: false, severity: "success", message: "" });
    const [period, setPeriod] = useState("week");
    const [account, setAccount] = useState("all");
    const [view, setView] = useState("executiva");
    const [fromDate, setFromDate] = useState(dayjs().subtract(6, "day"));
    const [toDate, setToDate] = useState(dayjs());
    const [showResponsiveFilters, setShowResponsiveFilters] = useState(false);
    const [performanceScore, setPerformanceScore] = useState(60);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [performanceModalOpen, setPerformanceModalOpen] = useState(false);
    const [objectiveId, setObjectiveId] = useState(null);
    const [savingObjectives, setSavingObjectives] = useState(false);
    const [objectivesForm, setObjectivesForm] = useState({
        ingresos_objetivo_usd: "1000",
        roas_objetivo: "2",
        cpa_objetivo_usd: "20",
        cpc_objetivo_usd: "5",
        cpl_objetivo_usd: "10",
        efectividad_objetivo_pct: "3",
        frecuencia_objetivo: "3",
        ctr_objetivo_pct: "2",
    });
    const [isCompactViewport, setIsCompactViewport] = useState(() => {
        if (typeof window === "undefined") return false;
        if (isIpadDevice()) return true;
        return window.innerWidth <= TABLET_MAX_WIDTH;
    });
    const scoreTone =
        performanceScore >= 75
            ? "text-emerald-300"
            : performanceScore >= 55
                ? "text-amber-300"
                : "text-rose-300";
    const scoreBarClass =
        performanceScore >= 75
            ? "bg-emerald-400"
            : performanceScore >= 55
                ? "bg-amber-400"
                : "bg-rose-400";
    const radialRadius = 16;
    const radialStroke = 4;
    const radialNormalizedRadius = radialRadius - radialStroke * 0.5;
    const radialCircumference = 2 * Math.PI * radialNormalizedRadius;
    const radialOffset =
        radialCircumference - (Math.max(0, Math.min(100, performanceScore)) / 100) * radialCircumference;

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const recalcViewport = () => {
            const compact = isIpadDevice() || window.innerWidth <= TABLET_MAX_WIDTH;
            setIsCompactViewport(compact);
            if (!compact) {
                setShowResponsiveFilters(false);
            }
        };

        recalcViewport();
        window.addEventListener("resize", recalcViewport);
        return () => window.removeEventListener("resize", recalcViewport);
    }, []);

    useEffect(() => {
        let mounted = true;
        const loadObjectives = async () => {
            try {
                const { data } = await apiClient.get("/kpi-objetivos/");
                if (!mounted) return;
                const first = Array.isArray(data) && data.length > 0 ? data[0] : null;
                if (!first) return;
                setObjectiveId(first.id);
                setObjectivesForm({
                    ingresos_objetivo_usd: String(first.ingresos_objetivo_usd ?? "1000"),
                    roas_objetivo: String(first.roas_objetivo ?? "2"),
                    cpa_objetivo_usd: String(first.cpa_objetivo_usd ?? "20"),
                    cpc_objetivo_usd: String(first.cpc_objetivo_usd ?? "5"),
                    cpl_objetivo_usd: String(first.cpl_objetivo_usd ?? "10"),
                    efectividad_objetivo_pct: String((Number(first.efectividad_objetivo || 0) * 100).toFixed(2)),
                    frecuencia_objetivo: String(first.frecuencia_objetivo ?? "3"),
                    ctr_objetivo_pct: String((Number(first.ctr_objetivo || 0) * 100).toFixed(2)),
                });
            } catch (_err) {
                // keep defaults
            }
        };
        loadObjectives();
        return () => {
            mounted = false;
        };
    }, []);

    const handleCreated = () => {
        setToast({
            open: true,
            severity: "success",
            message: "Gasto diario creado. El ROAS se actualizara en Stats.",
        });
    };

    const handleRefreshSync = async () => {
        setRefreshing(true);
        try {
            const tenantId = getEffectiveTenantId();
            await apiClient.post("/pauta-kpi/refresh/", null, {
                params: tenantId ? { empresa: tenantId } : undefined,
            });
            setRefreshKey((prev) => prev + 1);
            setToast({
                open: true,
                severity: "success",
                message: "Sync ejecutada. Datos de pauta actualizados.",
            });
        } catch (_err) {
            setToast({
                open: true,
                severity: "error",
                message: "No se pudo ejecutar la sync manual.",
            });
        } finally {
            setRefreshing(false);
        }
    };

    const handleObjectiveChange = (key, value) => {
        setObjectivesForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSaveObjectives = async () => {
        const payload = {
            ingresos_objetivo_usd: Number(objectivesForm.ingresos_objetivo_usd || 0),
            roas_objetivo: Number(objectivesForm.roas_objetivo || 0),
            cpa_objetivo_usd: Number(objectivesForm.cpa_objetivo_usd || 0),
            cpc_objetivo_usd: Number(objectivesForm.cpc_objetivo_usd || 0),
            cpl_objetivo_usd: Number(objectivesForm.cpl_objetivo_usd || 0),
            efectividad_objetivo: Number(objectivesForm.efectividad_objetivo_pct || 0) / 100,
            frecuencia_objetivo: Number(objectivesForm.frecuencia_objetivo || 0),
            ctr_objetivo: Number(objectivesForm.ctr_objetivo_pct || 0) / 100,
        };

        setSavingObjectives(true);
        try {
            if (objectiveId) {
                const { data } = await apiClient.patch(`/kpi-objetivos/${objectiveId}/`, payload);
                setObjectiveId(data?.id || objectiveId);
            } else {
                const { data } = await apiClient.post("/kpi-objetivos/", payload);
                setObjectiveId(data?.id || null);
            }
            setToast({ open: true, severity: "success", message: "Objetivos de performance actualizados." });
            setPerformanceModalOpen(false);
        } catch (_err) {
            setToast({ open: true, severity: "error", message: "No se pudieron guardar los objetivos." });
        } finally {
            setSavingObjectives(false);
        }
    };

    const filterControls = (
        <div className="app-scrollbar flex w-full flex-nowrap items-center gap-2 overflow-x-auto">
            <button
                    type="button"
                    onClick={() => setPerformanceModalOpen(true)}
                    className="shrink-0 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-left hover:bg-white/5"
                >
                    <div className="flex items-center gap-2">
                        <div>
                            <p className="text-[10px] uppercase tracking-wide text-white/60">Performance score</p>
                            <p className={`text-sm font-semibold ${scoreTone}`}>{performanceScore}/100</p>
                        </div>
                        <div className="relative h-9 w-9">
                            <svg
                                height={radialRadius * 2}
                                width={radialRadius * 2}
                                className="-rotate-90"
                            >
                                <circle
                                    stroke="rgba(255,255,255,0.18)"
                                    fill="transparent"
                                    strokeWidth={radialStroke}
                                    r={radialNormalizedRadius}
                                    cx={radialRadius}
                                    cy={radialRadius}
                                />
                                <circle
                                    stroke={scoreBarClass === "bg-emerald-400" ? "#34d399" : scoreBarClass === "bg-amber-400" ? "#fbbf24" : "#fb7185"}
                                    fill="transparent"
                                    strokeLinecap="round"
                                    strokeWidth={radialStroke}
                                    strokeDasharray={`${radialCircumference} ${radialCircumference}`}
                                    style={{ strokeDashoffset: radialOffset }}
                                    r={radialNormalizedRadius}
                                    cx={radialRadius}
                                    cy={radialRadius}
                                />
                            </svg>
                        </div>
                    </div>
                </button>
            <Autocomplete
                size="small"
                disableClearable
                options={PERIOD_OPTIONS}
                value={PERIOD_OPTIONS.find((item) => item.value === period) || PERIOD_OPTIONS[0]}
                onChange={(_, option) => setPeriod(option?.value || "week")}
                getOptionLabel={(option) => option.label}
                sx={{ ...fieldSx, width: 120 }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Periodo"
                        sx={fieldSx}
                    />
                )}
            />
            <Autocomplete
                size="small"
                disableClearable
                options={ACCOUNT_OPTIONS}
                value={ACCOUNT_OPTIONS.find((item) => item.value === account) || ACCOUNT_OPTIONS[0]}
                onChange={(_, option) => setAccount(option?.value || "all")}
                getOptionLabel={(option) => option.label}
                sx={{ ...fieldSx, width: 126 }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Cuenta"
                        sx={fieldSx}
                    />
                )}
            />
            <Autocomplete
                size="small"
                disableClearable
                options={VIEW_OPTIONS}
                value={VIEW_OPTIONS.find((item) => item.value === view) || VIEW_OPTIONS[0]}
                onChange={(_, option) => setView(option?.value || "executiva")}
                getOptionLabel={(option) => option.label}
                sx={{ ...fieldSx, width: 170 }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Vista"
                        sx={fieldSx}
                    />
                )}
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <FilterDatePicker label="Desde" value={fromDate} onChange={setFromDate} sx={{ width: 150 }} />
                <FilterDatePicker label="Hasta" value={toDate} onChange={setToDate} sx={{ width: 150 }} />
            </LocalizationProvider>
        </div>
    );

    return (
        <Page
            title="Rendimientos"
            actions={
                <div className="app-scrollbar flex w-full flex-nowrap items-center justify-end overflow-x-auto ">
                    {isCompactViewport ? (
                        <Button
                            variant="outlined"
                            size="medium"
                            onClick={() => setShowResponsiveFilters((prev) => !prev)}
                            startIcon={<FilterListOutlinedIcon fontSize="small" />}
                            className="shrink-0"
                        >
                            {showResponsiveFilters ? "Ocultar" : "Filtros"}
                        </Button>
                    ) : null}
                    <div className={isCompactViewport ? "hidden" : "block"}>
                        {filterControls}
                    </div>
                </div>
            }
        >
            {showResponsiveFilters && isCompactViewport ? (
                <div className="w-full">
                    {filterControls}
                </div>
            ) : null}
            <div className="h-full min-h-0 w-full">
                <TablaKPI
                    period={period}
                    account={account}
                    fromDate={fromDate}
                    toDate={toDate}
                    view={view}
                    refreshKey={refreshKey}
                    headerActions={
                        <>
                            <Button
                                variant="outlined"
                                size="medium"
                                startIcon={<RefreshOutlinedIcon fontSize="small" />}
                                onClick={handleRefreshSync}
                                disabled={refreshing}
                                className="shrink-0"
                            >
                                {refreshing ? "Actualizando..." : "Refresh"}
                            </Button>
                            <Button
                                variant="outlined"
                                size="medium"
                                color="primary"
                                startIcon={<AddOutlinedIcon />}
                                onClick={() => setModalOpen(true)}
                                className="shrink-0"
                            >
                                Crear gasto
                            </Button>
                        </>
                    }
                    onScoreChange={(score) => setPerformanceScore(Number(score || 0))}
                />
            </div>
            <PautaGastoModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={handleCreated}
            />
            <Snackbar
                open={toast.open}
                autoHideDuration={3500}
                onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                    severity={toast.severity}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>

            <PerformanceObjectivesModal
                open={performanceModalOpen}
                onClose={() => setPerformanceModalOpen(false)}
                objectivesForm={objectivesForm}
                onObjectiveChange={handleObjectiveChange}
                onSave={handleSaveObjectives}
                saving={savingObjectives}
            />
        </Page>
    );
}

export default PautaKPI;
