import { useEffect, useMemo, useState } from "react";
import ExecutiveKPIPanel from "./ExecutiveKPIPanel";
import OperativeKPIPanel from "./OperativeKPIPanel";
import { apiClient } from "../services/auth";

const LEVEL_LABELS = {
  campaign: "Campaña",
  adset: "Adset",
  ad: "Ad",
  naming: "Naming",
};

const EMPTY_OPERATIVE_DATA = {
  campaign: [],
  adset: [],
  ad: [],
  naming: [],
};

const percentFormatter = new Intl.NumberFormat("es-AR", {
  style: "percent",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const BASE_COLUMNS = [
  { key: "inversion", label: "Inversion", align: "right", type: "money" },
  { key: "ctr", label: "CTR", align: "right", type: "percent" },
  { key: "cpc", label: "CPC", align: "right", type: "money" },
  { key: "cpl", label: "CPL", align: "right", type: "money" },
  { key: "cpa", label: "CPA", align: "right", type: "money" },
  { key: "roas", label: "ROAS", align: "right", type: "number" },
  { key: "frecuencia", label: "Frecuencia", align: "right", type: "number" },
  { key: "ftd", label: "FTD", align: "right", type: "number" },
  { key: "valor_ftd", label: "Valor FTD", align: "right", type: "money" },
  { key: "leads", label: "Leads", align: "right", type: "number" },
  { key: "contactos", label: "Contactos", align: "right", type: "number" },
  { key: "web_visitors", label: "Web visitors", align: "right", type: "number" },
];

const DEFAULT_VISIBLE_COLUMNS = ["inversion", "leads", "contactos", "ftd", "valor_ftd", "roas"];
const KPI_COLUMNS_STORAGE_KEY = "pauta_kpi_visible_columns";

function compareValues(a, b, key, direction) {
  const left = a?.[key];
  const right = b?.[key];

  if (typeof left === "string" || typeof right === "string") {
    const result = String(left || "").localeCompare(String(right || ""), "es");
    return direction === "asc" ? result : -result;
  }

  const result = Number(left || 0) - Number(right || 0);
  return direction === "asc" ? result : -result;
}

const PERIOD_LABEL = { day: "Dia", week: "Semana", month: "Mes" };
const ACCOUNT_LABEL = { all: "Todas", main: "Principal", scale: "Escala" };

function fmtDate(value) {
  if (!value) return "-";
  if (typeof value?.format === "function") return value.format("DD/MM/YYYY");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("es-AR");
}

function toYmd(value) {
  if (!value) return null;
  if (typeof value?.format === "function") return value.format("YYYY-MM-DD");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toneFromValue(key, value) {
  if (key === "roas") return value >= 3 ? "green" : value >= 2 ? "yellow" : "red";
  if (key === "ctr") return value >= 0.03 ? "green" : value >= 0.02 ? "yellow" : "red";
  if (key === "frecuencia") return value <= 2.8 ? "green" : value <= 3.5 ? "yellow" : "red";
  if (key === "cpa" || key === "cpc" || key === "cpl") return value <= 0 ? "red" : "green";
  return "green";
}

function mapApiToLocalShape(payload) {
  const executiveCards = payload?.executive?.cards || {};
  const footer = payload?.executive?.footer || {};
  const daily = Array.isArray(payload?.executive?.daily_roas) ? payload.executive.daily_roas : [];
  const moneyCurrency = payload?.money_currency === "ARS" ? "ARS" : payload?.money_currency === "USD" ? "USD" : "MIXED";
  const moneyDisplay = moneyCurrency === "MIXED" ? "number" : moneyCurrency;

  const cards = [
    { key: "inversion", label: "Inversion", value: Number(executiveCards.inversion || 0), display: moneyDisplay },
    { key: "ingresos", label: "Ingresos", value: Number(executiveCards.ingresos || 0), display: moneyDisplay },
    { key: "roas", label: "ROAS", value: Number(executiveCards.roas || 0), display: "number" },
    { key: "cpa", label: "CPA", value: Number(executiveCards.cpa || 0), display: moneyDisplay },
    { key: "cpc", label: "CPC", value: Number(executiveCards.cpc || 0), display: moneyDisplay },
    { key: "cpl", label: "CPL", value: Number(executiveCards.cpl || 0), display: moneyDisplay },
    { key: "frecuencia", label: "Frecuencia", value: Number(executiveCards.frecuencia || 0), display: "number" },
    { key: "ctr", label: "CTR", value: Number(executiveCards.ctr || 0), display: "percent" },
  ].map((card) => ({
    ...card,
    variation: "Dato real",
    status: toneFromValue(card.key, card.value),
    trend: daily.map((d) => Number(d.roas || 0)),
  }));

  const footerCards = [
    { key: "web_visitors", label: "Web Visitors", value: Number(footer.web_visitors || 0) },
    { key: "leads", label: "Leads", value: Number(footer.leads || 0) },
    { key: "contactos", label: "Contactos", value: Number(footer.contactos || 0) },
    { key: "ftd", label: "FTD", value: Number(footer.ftd ?? footer.compras ?? 0) },
    { key: "valor_ftd", label: "Valor FTD", value: Number(footer.valor_ftd ?? footer.valor_compras ?? 0), display: moneyDisplay },
    { key: "efectividad", label: "Efectividad FTD", value: Number(footer.efectividad || 0), display: "percent" },
  ];

  return {
    moneyCurrency,
    moneyDisplay,
    executiveCards: cards,
    footerCards,
    dailySeries: daily.map((d) => ({
      day: d.day || "-",
      roas: Number(d.roas || 0),
    })),
    performanceScore: Number(payload?.executive?.performance_score || 0),
    lastSync: payload?.last_sync || {},
    operativeData: {
      campaign: Array.isArray(payload?.operative?.campaign) ? payload.operative.campaign : [],
      adset: Array.isArray(payload?.operative?.adset) ? payload.operative.adset : [],
      ad: Array.isArray(payload?.operative?.ad) ? payload.operative.ad : [],
      naming: Array.isArray(payload?.operative?.naming) ? payload.operative.naming : [],
    },
  };
}

export default function TablaKPI({
  period = "week",
  account = "all",
  fromDate = null,
  toDate = null,
  view = "executiva",
  onScoreChange = null,
  refreshKey = 0,
  headerActions = null,
}) {
  const [level, setLevel] = useState("campaign");
  const [sortBy, setSortBy] = useState("roas");
  const [sortDir, setSortDir] = useState("desc");
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [remoteData, setRemoteData] = useState(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState("");

  const moneyCurrency = remoteData?.moneyCurrency === "ARS" ? "ARS" : remoteData?.moneyCurrency === "USD" ? "USD" : "MIXED";
  const currencyFormatter = useMemo(() => {
    if (moneyCurrency === "MIXED") return null;
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneyCurrency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
  }, [moneyCurrency]);

  const formatMoney = useMemo(() => {
    if (!currencyFormatter) {
      return (value) => numberFormatter.format(Number(value || 0));
    }
    return (value) => currencyFormatter.format(Number(value || 0));
  }, [currencyFormatter]);

  const allColumns = useMemo(
    () =>
      BASE_COLUMNS.map((column) => ({
        ...column,
        format:
          column.type === "money"
            ? formatMoney
            : column.type === "percent"
            ? (v) => percentFormatter.format(Number(v || 0))
            : (v) => numberFormatter.format(Number(v || 0)),
      })),
    [formatMoney]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KPI_COLUMNS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      const allowed = new Set(BASE_COLUMNS.map((col) => col.key));
      const next = parsed.filter((key) => allowed.has(key));
      if (next.length > 0) {
        setVisibleColumnKeys(next);
      }
    } catch {
      // No-op: keep defaults when storage is invalid.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KPI_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumnKeys));
    } catch {
      // No-op: storage may be unavailable.
    }
  }, [visibleColumnKeys]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingRemote(true);
      setRemoteError("");
      try {
        const params = {
          period,
          account,
          from: toYmd(fromDate),
          to: toYmd(toDate),
        };
        const { data } = await apiClient.get("/pauta-kpi/", { params });
        if (!mounted) return;
        const mapped = mapApiToLocalShape(data);
        setRemoteData(mapped);
        if (typeof onScoreChange === "function") {
          onScoreChange(mapped.performanceScore);
        }
      } catch (_err) {
        if (!mounted) return;
        setRemoteError("No se pudieron cargar datos reales de pauta.");
        setRemoteData(null);
        if (typeof onScoreChange === "function") {
          onScoreChange(0);
        }
      } finally {
        if (mounted) setLoadingRemote(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [period, account, fromDate, toDate, onScoreChange, refreshKey]);

  const effectiveOperativeData = remoteData?.operativeData || EMPTY_OPERATIVE_DATA;
  const effectiveExecutiveCards = remoteData?.executiveCards || [];
  const effectiveFooterCards = remoteData?.footerCards || [];
  const effectiveDailySeries = remoteData?.dailySeries || [];

  const currentRows = effectiveOperativeData[level] || [];
  const sortedRows = useMemo(() => [...currentRows].sort((a, b) => compareValues(a, b, sortBy, sortDir)), [currentRows, sortBy, sortDir]);

  const avgRoas = useMemo(() => {
    if (!sortedRows.length) return 0;
    return sortedRows.reduce((acc, row) => acc + Number(row.roas || 0), 0) / sortedRows.length;
  }, [sortedRows]);

  const operativeColumns = useMemo(
    () => allColumns.filter((col) => visibleColumnKeys.includes(col.key)),
    [allColumns, visibleColumnKeys]
  );

  const totals = useMemo(() => {
    const totalInversion = sortedRows.reduce((acc, row) => acc + Number(row.inversion || 0), 0);
    const totalFtd = sortedRows.reduce((acc, row) => acc + Number(row.ftd ?? row.compras ?? 0), 0);
    const totalValorFtd = sortedRows.reduce((acc, row) => acc + Number(row.valor_ftd ?? row.valor_compras ?? 0), 0);
    const totalLeads = sortedRows.reduce((acc, row) => acc + Number(row.leads || 0), 0);
    const totalContactos = sortedRows.reduce((acc, row) => acc + Number(row.contactos || 0), 0);
    const totalWebVisitors = sortedRows.reduce((acc, row) => acc + Number(row.web_visitors || 0), 0);

    const weightedCtr = totalInversion
      ? sortedRows.reduce((acc, row) => acc + Number(row.ctr || 0) * Number(row.inversion || 0), 0) / totalInversion
      : 0;
    const weightedCpc = totalInversion
      ? sortedRows.reduce((acc, row) => acc + Number(row.cpc || 0) * Number(row.inversion || 0), 0) / totalInversion
      : 0;
    const weightedCpl = totalInversion
      ? sortedRows.reduce((acc, row) => acc + Number(row.cpl || 0) * Number(row.inversion || 0), 0) / totalInversion
      : 0;
    const cpa = totalFtd ? totalInversion / totalFtd : 0;
    const weightedRoas = totalInversion
      ? sortedRows.reduce((acc, row) => acc + Number(row.roas || 0) * Number(row.inversion || 0), 0) / totalInversion
      : 0;
    const weightedFreq = totalInversion
      ? sortedRows.reduce((acc, row) => acc + Number(row.frecuencia || 0) * Number(row.inversion || 0), 0) / totalInversion
      : 0;

    return {
      inversion: totalInversion,
      ctr: weightedCtr,
      cpc: weightedCpc,
      cpl: weightedCpl,
      cpa,
      roas: weightedRoas,
      frecuencia: weightedFreq,
      ftd: totalFtd,
      valor_ftd: totalValorFtd,
      leads: totalLeads,
      contactos: totalContactos,
      web_visitors: totalWebVisitors,
    };
  }, [sortedRows]);

  const filterSummary = useMemo(
    () => `${PERIOD_LABEL[period] || "Semana"} | ${ACCOUNT_LABEL[account] || "Todas"} | ${fmtDate(fromDate)} - ${fmtDate(toDate)}`,
    [period, account, fromDate, toDate]
  );

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDir("asc");
  };

  const toggleColumn = (key) => {
    setVisibleColumnKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== key);
      }
      return [...prev, key];
    });
  };

  const showAllColumns = () => {
    setVisibleColumnKeys(BASE_COLUMNS.map((col) => col.key));
  };

  const resetDefaultColumns = () => {
    setVisibleColumnKeys(DEFAULT_VISIBLE_COLUMNS);
  };

  const cardByKey = useMemo(() => Object.fromEntries(effectiveExecutiveCards.map((card) => [card.key, card])), [effectiveExecutiveCards]);
  const topCards = ["inversion", "ingresos", "roas"].map((key) => cardByKey[key]).filter(Boolean);
  const middleCards = ["cpa", "cpc", "cpl"].map((key) => cardByKey[key]).filter(Boolean);
  const lowerCards = ["frecuencia", "ctr"].map((key) => cardByKey[key]).filter(Boolean);

  return (
    <div className="h-full max-h-full w-full overflow-hidden rounded-xl border border-gray-700 bg-neutral-900 px-3 py-3 shadow-lg shadow-black">
      <div className="app-scrollbar h-full w-full min-h-0 space-y-4 overflow-y-auto pr-1">
        <div className="flex w-full items-start justify-between gap-3">
          <div className="app-scrollbar flex min-w-0 flex-nowrap items-center gap-3 overflow-x-auto whitespace-nowrap">
            <span className="text-[11px] text-white/60">{filterSummary}</span>
            {loadingRemote ? <span className="text-xs text-cyan-300">Cargando datos reales...</span> : null}
            {remoteError ? <span className="text-xs text-amber-300">{remoteError}</span> : null}
            {!remoteError ? (
              <span className="text-[11px] text-white/55">Moneda: {moneyCurrency === "MIXED" ? "Mixta" : moneyCurrency}</span>
            ) : null}
            {!loadingRemote && !remoteError && remoteData?.lastSync ? (
              <>
                <span className="text-[11px] text-white/55">
                  KPI sync: {remoteData.lastSync.kpi_last_run_at ? new Date(remoteData.lastSync.kpi_last_run_at).toLocaleString("es-AR") : "-"} ({remoteData.lastSync.kpi_last_status || "n/a"})
                </span>
                <span className="text-[11px] text-white/55">
                  Estado sync: {remoteData.lastSync.estado_last_run_at ? new Date(remoteData.lastSync.estado_last_run_at).toLocaleString("es-AR") : "-"} ({remoteData.lastSync.estado_last_status || "n/a"})
                </span>
              </>
            ) : null}
          </div>
          {headerActions ? <div className="flex shrink-0 items-center gap-2">{headerActions}</div> : null}
        </div>
        {view === "operativa" ? (
          <div className="w-full">
            <OperativeKPIPanel
              level={level}
              levelLabels={LEVEL_LABELS}
              onLevelChange={setLevel}
              allColumns={allColumns}
              columns={operativeColumns}
              visibleColumnKeys={visibleColumnKeys}
              onToggleColumn={toggleColumn}
              onShowAllColumns={showAllColumns}
              onResetDefaultColumns={resetDefaultColumns}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              sortedRows={sortedRows}
              avgRoas={avgRoas}
              totals={totals}
            />
          </div>
        ) : (
          <div className="w-full">
            <ExecutiveKPIPanel
              topCards={topCards}
              middleCards={middleCards}
              lowerCards={lowerCards}
              footerCards={effectiveFooterCards}
              dailySeries={effectiveDailySeries}
              formatters={{ currencyFormatter, percentFormatter, numberFormatter }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
