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
import { useTheme } from "@mui/material/styles";
import { apiClient } from "../services/auth";
import { getEffectiveTenantId } from "../services/tenant";
import { useTenant } from "../context/TenantContext";

const PERIOD_OPTIONS = [
    { value: "day", label: "Dia" },
    { value: "week", label: "Semana" },
    { value: "month", label: "Mes" },
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

function parseDecimalInput(value) {
    if (value === null || value === undefined) return 0;
    const normalized = String(value).trim().replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function PautaKPI() {
    const { tenantId } = useTenant();
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const [modalOpen, setModalOpen] = useState(false);
    const [toast, setToast] = useState({ open: false, severity: "success", message: "" });
    const [period, setPeriod] = useState("week");
    const [usePeriod, setUsePeriod] = useState(true);
    const [account, setAccount] = useState("all");
    const [accountOptions, setAccountOptions] = useState([{ value: "all", label: "Todas" }]);
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
            ? (isDark ? "text-emerald-300" : "text-emerald-700")
            : performanceScore >= 55
                ? (isDark ? "text-amber-300" : "text-amber-700")
                : (isDark ? "text-rose-300" : "text-rose-700");
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
    const fieldSx = {
        minWidth: 90,
        "& .MuiOutlinedInput-root": {
            color: isDark ? "#fff" : "#111827",
            backgroundColor: isDark ? "transparent" : "#ffffff",
            "& fieldset": { borderColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(17,24,39,0.22)" },
            "&:hover fieldset": { borderColor: isDark ? "rgba(255,255,255,0.45)" : "rgba(17,24,39,0.35)" },
            "&.Mui-focused fieldset": { borderColor: "#22d3ee" },
        },
        "& .MuiInputLabel-root": {
            color: isDark ? "rgba(255,255,255,0.75)" : "rgba(17,24,39,0.72)",
        },
        "& .MuiInputLabel-root.Mui-focused": {
            color: "#22d3ee",
        },
        "& .MuiSvgIcon-root": {
            color: isDark ? "rgba(255,255,255,0.75)" : "rgba(17,24,39,0.65)",
        },
    };

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
                const params = tenantId ? { empresa: tenantId } : undefined;
                const { data } = await apiClient.get("/kpi-objetivos/", { params });
                if (!mounted) return;
                const first = Array.isArray(data) && data.length > 0 ? data[0] : null;
                if (!first) {
                    setObjectiveId(null);
                    setObjectivesForm({
                        roas_objetivo: "2",
                        cpa_objetivo_usd: "20",
                        cpc_objetivo_usd: "5",
                        cpl_objetivo_usd: "10",
                        efectividad_objetivo_pct: "3",
                        frecuencia_objetivo: "3",
                        ctr_objetivo_pct: "2",
                    });
                    return;
                }
                setObjectiveId(first.id);
                setObjectivesForm({
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
    }, [tenantId]);

    useEffect(() => {
        let mounted = true;
        const loadAccounts = async () => {
            try {
                const { data } = await apiClient.get("/cuentas-publicitarias/");
                if (!mounted) return;
                const dynamicOptions = [
                    { value: "all", label: "Todas" },
                    ...(Array.isArray(data)
                        ? data.map((item) => ({
                            value: String(item.id),
                            label: item.nombre || `Cuenta #${item.id}`,
                          }))
                        : []),
                ];
                setAccountOptions(dynamicOptions);
                setAccount((current) =>
                    dynamicOptions.some((option) => option.value === current) ? current : "all"
                );
            } catch {
                if (!mounted) return;
                setAccountOptions([{ value: "all", label: "Todas" }]);
                setAccount("all");
            }
        };
        loadAccounts();
        return () => {
            mounted = false;
        };
    }, [tenantId]);

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

    const handlePeriodChange = (nextPeriod) => {
        setPeriod(nextPeriod);
        setUsePeriod(true);
    };

    const handleFromDateChange = (value) => {
        setFromDate(value);
        if (value?.isValid?.() && toDate?.isValid?.() && value.isAfter(toDate, "day")) {
            setToDate(value);
        }
        setUsePeriod(false);
    };

    const handleToDateChange = (value) => {
        setToDate(value);
        if (value?.isValid?.() && fromDate?.isValid?.() && value.isBefore(fromDate, "day")) {
            setFromDate(value);
        }
        setUsePeriod(false);
    };

    const handleSaveObjectives = async () => {
        const currentTenantId = getEffectiveTenantId();
        const payload = {
            roas_objetivo: parseDecimalInput(objectivesForm.roas_objetivo),
            cpa_objetivo_usd: parseDecimalInput(objectivesForm.cpa_objetivo_usd),
            cpc_objetivo_usd: parseDecimalInput(objectivesForm.cpc_objetivo_usd),
            cpl_objetivo_usd: parseDecimalInput(objectivesForm.cpl_objetivo_usd),
            efectividad_objetivo: parseDecimalInput(objectivesForm.efectividad_objetivo_pct) / 100,
            frecuencia_objetivo: parseDecimalInput(objectivesForm.frecuencia_objetivo),
            ctr_objetivo: parseDecimalInput(objectivesForm.ctr_objetivo_pct) / 100,
            ...(currentTenantId ? { empresa: currentTenantId } : {}),
        };

        setSavingObjectives(true);
        try {
            if (objectiveId) {
                const { data } = await apiClient.patch(
                    `/kpi-objetivos/${objectiveId}/`,
                    payload,
                    { params: currentTenantId ? { empresa: currentTenantId } : undefined }
                );
                setObjectiveId(data?.id || objectiveId);
            } else {
                const { data } = await apiClient.post(
                    "/kpi-objetivos/",
                    payload,
                    { params: currentTenantId ? { empresa: currentTenantId } : undefined }
                );
                setObjectiveId(data?.id || null);
            }
            setToast({ open: true, severity: "success", message: "Objetivos de performance actualizados." });
            setPerformanceModalOpen(false);
        } catch (err) {
            const detail =
                err?.response?.data?.detail ||
                err?.response?.data?.empresa?.[0] ||
                err?.response?.data?.non_field_errors?.[0] ||
                "No se pudieron guardar los objetivos.";
            setToast({ open: true, severity: "error", message: String(detail) });
        } finally {
            setSavingObjectives(false);
        }
    };

    const filterControls = (
                <div className="app-scrollbar flex w-full flex-nowrap items-center gap-2 overflow-x-auto">
            <button
                    type="button"
                    onClick={() => setPerformanceModalOpen(true)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-left ${
                        isDark
                            ? "border border-white/10 bg-black/40 hover:bg-white/5"
                            : "border border-slate-300 bg-white shadow-sm hover:bg-slate-50"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <div>
                            <p className={`text-[10px] uppercase tracking-wide ${isDark ? "text-white/60" : "text-slate-500"}`}>Performance score</p>
                            <p className={`text-sm font-semibold ${scoreTone}`}>{performanceScore}/100</p>
                        </div>
                        <div className="relative h-9 w-9">
                            <svg
                                height={radialRadius * 2}
                                width={radialRadius * 2}
                                className="-rotate-90"
                            >
                                <circle
                                    stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.18)"}
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
                onChange={(_, option) => handlePeriodChange(option?.value || "week")}
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
                options={accountOptions}
                value={accountOptions.find((item) => item.value === account) || accountOptions[0]}
                onChange={(_, option) => setAccount(option?.value || "all")}
                getOptionLabel={(option) => option.label}
                sx={{ ...fieldSx, width: 200 }}
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
                <FilterDatePicker label="Desde" value={fromDate} onChange={handleFromDateChange} sx={{ width: 150 }} />
                <FilterDatePicker label="Hasta" value={toDate} onChange={handleToDateChange} sx={{ width: 150 }} />
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
                                className={`shrink-0 ${isDark ? "text-white border-white/30" : ""}`}
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
                    usePeriod={usePeriod}
                    period={period}
                    account={account}
                    accountLabel={(accountOptions.find((item) => item.value === account) || accountOptions[0])?.label || "Todas"}
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
