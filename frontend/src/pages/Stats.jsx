import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import Page from "../layouts/Page.jsx";
import Filter from "../components/Filter";
import PreviewOutlinedIcon from "@mui/icons-material/PreviewOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../services/auth";
import { subscribeRealtimeEvents } from "../services/realtime";
import { useTenant } from "../context/TenantContext";
import { getUISettings, subscribeUISettings } from "../services/uiSettings";
import RecentPurchasesTable from "../components/RecentPurchasesTable.jsx";
import "../assets/css/RecentPurchasesTable.css";

const POLL_MS = 60 * 60 * 1000;
const TABLET_MAX_WIDTH = 1024;
const REALTIME_DEBOUNCE_MS = 700;
const REQUEST_TIMEOUT_MS = 15000;

const FAQ_ITEMS = [
  {
    title: "Que es FTD",
    content: "FTD (First Time Deposit) se refiere a la primera compra realizada por un usuario.",
  },
  {
    title: "Como se calcula el ROAS FTD",
    content: "ROAS FTD se calcula dividiendo los ingresos generados por los FTD entre la inversion publicitaria.",
  },
  {
    title: "Que es la efectividad",
    content: "La efectividad es el porcentaje de usuarios que pasan a conversion luego de contactarse.",
  },
  {
    title: "Que significa un ROAS de 1",
    content: "Un ROAS de 1 significa que se recupera el 100% de la inversion con los clientes nuevos.",
  },
];

function isIpadDevice() {
  const userAgent = navigator.userAgent || "";
  const isiPadUA = /iPad/i.test(userAgent);
  const isiPadOSDesktopUA = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isiPadUA || isiPadOSDesktopUA;
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSparklinePoints(seed = 0, trend = 0, length = 12) {
  const safeSeed = Math.max(1, safeNumber(seed));
  const safeTrend = safeNumber(trend);
  const values = [];
  let current = Math.max(8, (safeSeed % 23) + 10);

  for (let index = 0; index < length; index += 1) {
    const wave = Math.sin((index + 1) * 0.85 + safeSeed) * 4;
    const growth = safeTrend * index * 0.35;
    current = Math.max(6, current + wave * 0.35 + growth + (index % 3 === 0 ? 1.4 : -0.3));
    values.push(Number(current.toFixed(2)));
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((value, index) => {
    const x = (index / (length - 1)) * 100;
    const y = max === min ? 50 : 100 - (((value - min) / (max - min)) * 76 + 12);
    return [x, y];
  });
}

function Sparkline({ seed, trend, colorClass = "text-emerald-300" }) {
  const points = useMemo(() => buildSparklinePoints(seed, trend), [seed, trend]);
  const path = points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const area = `${path} L 100 100 L 0 100 Z`;
  return (
    <svg viewBox="0 0 100 100" className={`h-14 w-28 ${colorClass}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill="currentColor" opacity="0.08" />
      <path
        d="M 0 86 L 100 86"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.14"
        strokeWidth="1.5"
        strokeDasharray="3 4"
      />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      {points.length ? <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="3" fill="currentColor" /> : null}
    </svg>
  );
}

function deltaMeta(current, previous) {
  const cur = safeNumber(current);
  const prev = safeNumber(previous);
  if (!prev) {
    return { value: cur > 0 ? 100 : 0, direction: cur > 0 ? "up" : "flat" };
  }
  const ratio = ((cur - prev) / Math.abs(prev)) * 100;
  if (Math.abs(ratio) < 0.05) return { value: 0, direction: "flat" };
  return { value: Math.abs(ratio), direction: ratio > 0 ? "up" : "down" };
}

function deltaClass(direction) {
  if (direction === "up") return "text-emerald-300";
  if (direction === "down") return "text-rose-300";
  return "text-white/45";
}

function DeltaPill({ meta }) {
  const arrow = meta.direction === "up" ? "▲" : meta.direction === "down" ? "▼" : "•";
  const prefix = meta.direction === "up" ? "+" : meta.direction === "down" ? "-" : "";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${deltaClass(meta.direction)}`}>
      <span>{arrow}</span>
      <span>{prefix}{meta.value.toFixed(0)}%</span>
    </span>
  );
}

function DashboardCard({
  title,
  value,
  delta,
  subtitle,
  icon,
  accentClass = "text-white",
  sparkSeed = 1,
  sparkTrend = 0,
  large = false,
}) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-[#101012] ${large ? "p-5" : "p-4"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-white/72">
            {icon}
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</span>
          </div>
          <div className={`truncate font-semibold ${large ? "text-[2rem] leading-none" : "text-[1.35rem] leading-none"} ${accentClass}`}>
            {value}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
            {delta ? <DeltaPill meta={delta} /> : null}
            {subtitle ? <span className="text-sm text-white/60">{subtitle}</span> : null}
          </div>
        </div>
        <div className="shrink-0 self-end">
          <Sparkline seed={sparkSeed} trend={delta?.direction === "up" ? 1 : delta?.direction === "down" ? -1 : 0} colorClass={accentClass} />
        </div>
      </div>
    </div>
  );
}

function buildRangeFromPeriod(period) {
  const today = dayjs();
  if (period === "day") {
    return { desde: today, hasta: today };
  }
  if (period === "month") {
    return { desde: today.subtract(29, "day"), hasta: today };
  }
  return { desde: today.subtract(6, "day"), hasta: today };
}

function parseStatsFilters(searchParams) {
  const rawPeriod = searchParams.get("period");
  const rawFrom = searchParams.get("from");
  const rawTo = searchParams.get("to");
  const validPeriod = ["day", "week", "month"].includes(rawPeriod) ? rawPeriod : "week";
  const fromDate = rawFrom ? dayjs(rawFrom) : null;
  const toDate = rawTo ? dayjs(rawTo) : null;
  const hasCustomRange = Boolean(fromDate?.isValid() && toDate?.isValid());

  return {
    period: validPeriod,
    usePeriod: !hasCustomRange,
    ...(hasCustomRange ? { desde: fromDate, hasta: toDate } : buildRangeFromPeriod(validPeriod)),
  };
}

function buildMockStatsData() {
  const tcVigente = 1220;
  return {
    web_visitors: 3129,
    leads: 2790,
    contactos: 2041,
    conversion_pct: 30.03,
    valor_compra_prom_ars: 15144,
    valor_compra_prom_usd: 12.41,
    retencion_pct: 28.4,
    roas_ftd: 1.29,
    roas: 2.0,
    roas_neto: 2.35,
    ganancia_neta_ars: 301340000,
    ganancia_neta_usd: 247000,
    ltv7_ars: 231800,
    ltv7_usd: 190.0,
    ltv30_ars: 414800,
    ltv30_usd: 340.0,
    ltv60_ars: 628300,
    ltv60_usd: 515.0,
    gasto_ars: 7212520,
    gasto_usd: 5911.90,
    tc_vigente: tcVigente,
    ftd: {
      count: 613,
      monto_total_ars: 9279680,
      monto_total_usd: 7606.29,
    },
    compras: {
      count: 1050,
      monto_total_ars: 448350000,
      monto_total_usd: 367500,
      bonos_ars: 27450000,
      bonos_usd: 22500,
    },
    retiros: {
      count: 520,
      monto_total_ars: 119560000,
      monto_total_usd: 98000,
    },
  };
}

function Stats() {
  const { tenantId, features: tenantFeatures, isSuperuser } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = useMemo(() => parseStatsFilters(searchParams), [searchParams]);
  const [uiSettings, setUiSettings] = useState(() => getUISettings());
  const [period, setPeriod] = useState(initialFilters.period);
  const [desde, setDesde] = useState(initialFilters.desde);
  const [hasta, setHasta] = useState(initialFilters.hasta);
  const [usePeriod, setUsePeriod] = useState(initialFilters.usePeriod);
  const [data, setData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResponsiveFilters, setShowResponsiveFilters] = useState(false);
  const [faqAnchorEl, setFaqAnchorEl] = useState(null);
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    if (isIpadDevice()) return true;
    return window.innerWidth <= TABLET_MAX_WIDTH;
  });

  const activeRequestRef = useRef(null);
  const abortTimerRef = useRef(null);
  const realtimeDebounceRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeUISettings((next) => setUiSettings(next));
    return unsubscribe;
  }, []);

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
    const nextFilters = parseStatsFilters(searchParams);
    setPeriod(nextFilters.period);
    setUsePeriod(nextFilters.usePeriod);
    setDesde(nextFilters.desde);
    setHasta(nextFilters.hasta);
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (usePeriod) {
      nextParams.set("period", period);
      nextParams.delete("from");
      nextParams.delete("to");
    } else {
      const safeDesde = desde?.isValid?.() ? desde : dayjs();
      const safeHasta = hasta?.isValid?.() ? hasta : safeDesde;
      const normalizedDesde = safeDesde.isAfter(safeHasta, "day") ? safeHasta : safeDesde;
      const normalizedHasta = safeHasta.isBefore(safeDesde, "day") ? safeDesde : safeHasta;
      nextParams.delete("period");
      nextParams.set("from", normalizedDesde.format("YYYY-MM-DD"));
      nextParams.set("to", normalizedHasta.format("YYYY-MM-DD"));
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [usePeriod, period, desde, hasta, searchParams, setSearchParams]);

  const params = useMemo(
    () => ({
      from: desde?.format("YYYY-MM-DD"),
      to: hasta?.format("YYYY-MM-DD"),
    }),
    [desde, hasta]
  );

  const comparisonParams = useMemo(() => {
    const safeDesde = desde?.isValid?.() ? desde : dayjs();
    const safeHasta = hasta?.isValid?.() ? hasta : safeDesde;
    const totalDays = Math.max(safeHasta.diff(safeDesde, "day"), 0) + 1;
    const previousHasta = safeDesde.subtract(1, "day");
    const previousDesde = previousHasta.subtract(totalDays - 1, "day");
    return {
      from: previousDesde.format("YYYY-MM-DD"),
      to: previousHasta.format("YYYY-MM-DD"),
    };
  }, [desde, hasta]);

  const loadStats = useCallback(
    async (controller) => {
      const { signal } = controller;
      setLoading(true);
      setError("");
      try {
        const [currentResponse, previousResponse] = await Promise.all([
          apiClient.get("/stats/", {
            params,
            signal,
          }),
          apiClient.get("/stats/", {
            params: comparisonParams,
            signal,
          }),
        ]);
        const response = currentResponse.data;
        setData(response);
        setComparisonData(previousResponse.data);
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
          return;
        }
        setError("No se pudieron cargar las estadisticas.");
      } finally {
        if (activeRequestRef.current === controller) {
          if (abortTimerRef.current) {
            clearTimeout(abortTimerRef.current);
            abortTimerRef.current = null;
          }
          activeRequestRef.current = null;
          setLoading(false);
        }
      }
    },
    [comparisonParams, params]
  );

  const triggerRefresh = useCallback(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    if (abortTimerRef.current) {
      clearTimeout(abortTimerRef.current);
      abortTimerRef.current = null;
    }

    const controller = new AbortController();
    activeRequestRef.current = controller;

    abortTimerRef.current = setTimeout(() => {
      if (activeRequestRef.current === controller) {
        controller.abort();
      }
    }, REQUEST_TIMEOUT_MS);

    loadStats(controller);
  }, [loadStats]);

  useEffect(() => {
    triggerRefresh();
    const pollId = setInterval(() => triggerRefresh(), POLL_MS);

    return () => {
      clearInterval(pollId);
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
      if (abortTimerRef.current) {
        clearTimeout(abortTimerRef.current);
      }
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
    };
  }, [triggerRefresh]);

  useEffect(() => {
    if (!tenantId) return;
    triggerRefresh();
  }, [tenantId, triggerRefresh]);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvents((message) => {
      const messageTenantId = message?.empresa_id ?? message?.payload?.empresa_id ?? null;
      if (messageTenantId && tenantId && Number(messageTenantId) !== Number(tenantId)) {
        return;
      }

      if (
        message?.type === "lead_created" ||
        message?.type === "compra_created" ||
        message?.type === "retiro_created" ||
        message?.type === "landing_visit_created"
      ) {
        if (realtimeDebounceRef.current) {
          clearTimeout(realtimeDebounceRef.current);
        }
        realtimeDebounceRef.current = setTimeout(() => {
          triggerRefresh();
        }, REALTIME_DEBOUNCE_MS);
      }
    });

    return () => {
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
      unsubscribe();
    };
  }, [triggerRefresh, tenantId]);

  const onPeriodChange = (value) => {
    setPeriod(value);
    const nextRange = buildRangeFromPeriod(value);
    setDesde(nextRange.desde);
    setHasta(nextRange.hasta);
    setUsePeriod(true);
  };

  const onDesdeChange = (value) => {
    setDesde(value);
    if (value?.isValid?.() && hasta?.isValid?.() && value.isAfter(hasta, "day")) {
      setHasta(value);
    }
    setUsePeriod(false);
  };

  const onHastaChange = (value) => {
    setHasta(value);
    if (value?.isValid?.() && desde?.isValid?.() && value.isBefore(desde, "day")) {
      setDesde(value);
    }
    setUsePeriod(false);
  };

  const handleOpenFaq = (event) => {
    setFaqAnchorEl(event.currentTarget);
  };

  const handleCloseFaq = () => {
    setFaqAnchorEl(null);
  };

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }),
    []
  );
  const arsFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }),
    []
  );
  const usdFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }),
    []
  );
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        style: "percent",
        maximumFractionDigits: 1,
      }),
    []
  );

  const formatNumber = useCallback((value) => numberFormatter.format(safeNumber(value)), [numberFormatter]);
  const formatArs = useCallback((value) => arsFormatter.format(safeNumber(value)), [arsFormatter]);
  const formatUsd = useCallback((value) => usdFormatter.format(safeNumber(value)), [usdFormatter]);
  const formatPct = useCallback((value) => percentFormatter.format(safeNumber(value) / 100), [percentFormatter]);

  const shouldUseMockStats = Boolean(isSuperuser && uiSettings?.statsMockMode);
  const sourceData = useMemo(() => (shouldUseMockStats ? buildMockStatsData() : data), [shouldUseMockStats, data]);
  const sourceComparisonData = useMemo(
    () => (shouldUseMockStats ? buildMockStatsData() : comparisonData),
    [shouldUseMockStats, comparisonData]
  );

  const {
    web_visitors: webVisitors = 0,
    leads = 0,
    contactos = 0,
    conversion_pct: conversionPct = 0,
    valor_compra_prom_ars: valorCompraPromArsRaw = null,
    valor_compra_prom_usd: valorCompraPromUsdRaw = null,
    retencion_pct: retencionPct = 0,
    roas_ftd: roasFtdRaw,
    roas: roasLegacy = 0,
    roas_neto: roasNeto = 0,
    ganancia_neta_ars: gananciaNetaArs = 0,
    ganancia_neta_usd: gananciaNetaUsd = 0,
    ltv7_ars: ltv7Ars = 0,
    ltv7_usd: ltv7Usd = 0,
    ltv30_ars: ltv30Ars = 0,
    ltv30_usd: ltv30Usd = 0,
    ltv60_ars: ltv60Ars = 0,
    ltv60_usd: ltv60Usd = 0,
    gasto_ars: gastoArs = 0,
    gasto_usd: gastoUsd = 0,
    tc_vigente: tcVigente = null,
    features: statsFeatures = null,
    ftd = {},
    compras = {},
    retiros = {},
  } = sourceData ?? {};

  const effectiveFeatures = statsFeatures && typeof statsFeatures === "object"
    ? statsFeatures
    : (tenantFeatures || {});
  const showNetMetrics = Boolean(effectiveFeatures?.net_metrics);
  const showBonos = Boolean(effectiveFeatures?.bonos);
  const showRetiros = Boolean(effectiveFeatures?.retiros);

  const roasFtd = roasFtdRaw ?? roasLegacy;
  const ftdCount = ftd?.count ?? 0;
  const ftdMontoArs = ftd?.monto_total_ars ?? ftd?.monto_total ?? 0;
  const ftdMontoUsd = ftd?.monto_total_usd ?? 0;
  const comprasCount = compras?.count ?? 0;
  const comprasMontoArs = compras?.monto_total_ars ?? compras?.monto_total ?? 0;
  const comprasMontoUsd = compras?.monto_total_usd ?? 0;
  const bonosMontoArs = compras?.bonos_ars ?? 0;
  const bonosMontoUsd = compras?.bonos_usd ?? 0;
  const retirosCount = retiros?.count ?? 0;
  const retirosMontoArs = retiros?.monto_total_ars ?? 0;
  const retirosMontoUsd = retiros?.monto_total_usd ?? 0;
  const valorCompraPromUsd = valorCompraPromUsdRaw ?? (comprasCount ? comprasMontoUsd / comprasCount : 0);
  const valorCompraPromArs = valorCompraPromArsRaw ?? (comprasCount ? comprasMontoArs / comprasCount : 0);
  const useArs = uiSettings?.currency === "ARS";

  const resolveArsValue = useCallback(
    (arsValue, usdValue) => {
      const hasArs = arsValue !== null && arsValue !== undefined;
      if (hasArs) return safeNumber(arsValue);
      const tc = safeNumber(tcVigente);
      if (tc > 0) return safeNumber(usdValue) * tc;
      return 0;
    },
    [tcVigente]
  );

  const formatMoney = useCallback(
    ({ arsValue = null, usdValue = null }) => {
      if (useArs) {
        return formatArs(resolveArsValue(arsValue, usdValue));
      }
      return formatUsd(usdValue);
    },
    [useArs, formatArs, formatUsd, resolveArsValue]
  );
  const previousWebVisitors = sourceComparisonData?.web_visitors ?? 0;
  const previousLeads = sourceComparisonData?.leads ?? 0;
  const previousContactos = sourceComparisonData?.contactos ?? 0;
  const previousFtdCount = sourceComparisonData?.ftd?.count ?? 0;
  const previousFtdUsd = sourceComparisonData?.ftd?.monto_total_usd ?? 0;
  const previousGastoUsd = sourceComparisonData?.gasto_usd ?? 0;
  const previousRoasFtd = sourceComparisonData?.roas_ftd ?? sourceComparisonData?.roas ?? 0;
  const previousConversionPct = sourceComparisonData?.conversion_pct ?? 0;

  const kpiDeltas = useMemo(
    () => ({
      webVisitors: deltaMeta(webVisitors, previousWebVisitors),
      leads: deltaMeta(leads, previousLeads),
      contactos: deltaMeta(contactos, previousContactos),
      ftdCount: deltaMeta(ftdCount, previousFtdCount),
      ftdUsd: deltaMeta(ftdMontoUsd, previousFtdUsd),
      gastoUsd: deltaMeta(gastoUsd, previousGastoUsd),
      roas: deltaMeta(roasFtd, previousRoasFtd),
      conversion: deltaMeta(conversionPct, previousConversionPct),
    }),
    [
      contactos,
      conversionPct,
      ftdCount,
      ftdMontoUsd,
      gastoUsd,
      leads,
      previousContactos,
      previousConversionPct,
      previousFtdCount,
      previousFtdUsd,
      previousGastoUsd,
      previousLeads,
      previousRoasFtd,
      previousWebVisitors,
      roasFtd,
      webVisitors,
    ]
  );

  const insightSummary = useMemo(() => {
    const ftdDelta = kpiDeltas.ftdUsd;
    const roasDeltaAbs = Math.abs(safeNumber(roasFtd) - safeNumber(previousRoasFtd));
    const hourHints = [
      { hour: "10:00 - 11:00", value: webVisitors },
      { hour: "14:00 - 15:00", value: leads * 0.8 },
      { hour: "18:00 - 19:00", value: contactos * 1.2 + ftdCount * 5 },
      { hour: "20:00 - 21:00", value: ftdCount * 4 + roasFtd * 10 },
    ];
    const bestHour = hourHints.sort((a, b) => b.value - a.value)[0]?.hour || "18:00 - 19:00";
    const trendText =
      ftdDelta.direction === "flat"
        ? "Hoy está estable vs anterior"
        : `Hoy está ${ftdDelta.direction === "up" ? "+" : "-"}${ftdDelta.value.toFixed(0)}% vs anterior`;
    return `${trendText} • ROAS ${roasDeltaAbs > 0 ? `${safeNumber(roasFtd) >= safeNumber(previousRoasFtd) ? "subió" : "bajó"} ${roasDeltaAbs.toFixed(2)}` : "sin cambios"} • Mejor franja: ${bestHour}`;
  }, [contactos, ftdCount, kpiDeltas.ftdUsd, leads, previousRoasFtd, roasFtd, webVisitors]);

  const quickRangeOptions = [
    { key: "day", label: "Hoy" },
    { key: "yesterday", label: "Ayer" },
    { key: "week", label: "7D" },
    { key: "month", label: "30D" },
  ];

  const handleQuickRange = (key) => {
    const today = dayjs();
    if (key === "yesterday") {
      const date = today.subtract(1, "day");
      setDesde(date);
      setHasta(date);
      setUsePeriod(false);
      return;
    }
    onPeriodChange(key);
  };

  return (
    <Page
      title="Estadisticas"
      actions={
        <div className="flex items-center gap-2">
          {!showNetMetrics ? (
            <IconButton
              size="small"
              onClick={handleOpenFaq}
              sx={{
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#67e8f9",
                backgroundColor: "rgba(0,0,0,0.28)",
                "&:hover": {
                  backgroundColor: "rgba(34,211,238,0.12)",
                },
              }}
            >
              <HelpOutlineOutlinedIcon fontSize="inherit" />
            </IconButton>
          ) : null}
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowResponsiveFilters((prev) => !prev)}
            startIcon={<FilterListOutlinedIcon fontSize="small" />}
            sx={{ display: isCompactViewport ? "inline-flex" : "none" }}
          >
            {showResponsiveFilters ? "Ocultar" : "Filtros"}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={triggerRefresh}
            startIcon={<RefreshOutlinedIcon fontSize="small" />}
            disabled={loading}
          >
            {loading ? "Actualizando..." : "LIVE"}
          </Button>
          <div className={isCompactViewport ? "hidden" : "block"}>
            <Filter
              period={period}
              usePeriod={usePeriod}
              onPeriodChange={onPeriodChange}
              desde={desde}
              hasta={hasta}
              onDesdeChange={onDesdeChange}
              onHastaChange={onHastaChange}
            />
          </div>
        </div>
      }
    >
      <div className="flex h-full min-h-0 w-full flex-col items-center">
        {showResponsiveFilters && isCompactViewport ? (
          <div className="w-full">
            <Filter
              period={period}
              usePeriod={usePeriod}
              onPeriodChange={onPeriodChange}
              desde={desde}
              hasta={hasta}
              onDesdeChange={onDesdeChange}
              onHastaChange={onHastaChange}
            />
          </div>
        ) : null}

        {error ? (
          <div className="w-full rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200 md:w-[95%]">
            {error}
          </div>
        ) : null}
        <Popover
          open={Boolean(faqAnchorEl)}
          anchorEl={faqAnchorEl}
          onClose={handleCloseFaq}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{
            sx: {
              mt: 1,
              width: 360,
              maxWidth: "calc(100vw - 2rem)",
              borderRadius: 2,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(10,10,10,0.96)",
              color: "#fff",
              p: 2,
            },
          }}
        >
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">Ayuda</p>
              <p className="text-[11px] text-white/60">Referencias rapidas de los KPI principales.</p>
            </div>
            {FAQ_ITEMS.map((item) => (
              <div key={item.title} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/80">{item.content}</p>
              </div>
            ))}
          </div>
        </Popover>
        <div className="mt-2 flex w-full min-h-0 flex-1 flex-col md:w-[95%] lg:w-full">
          <section className="recent-compras-scroll min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="rounded-2xl border border-white/8 bg-[#111214] px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 text-sm text-white/80">
                  <span className="font-medium">{insightSummary}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {quickRangeOptions.map((item) => {
                    const isActive =
                      item.key === "yesterday"
                        ? !usePeriod && desde?.isSame?.(hasta, "day") && desde?.isSame?.(dayjs().subtract(1, "day"), "day")
                        : usePeriod && period === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleQuickRange(item.key)}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                          isActive
                            ? "bg-sky-500/12 text-sky-300 ring-1 ring-sky-400/35"
                            : "bg-white/5 text-white/65 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setUsePeriod(false)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                      !usePeriod
                        ? "bg-white/10 text-white ring-1 ring-white/10"
                        : "bg-white/5 text-white/65 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr_1fr]">
              <DashboardCard
                title="FTD"
                icon={<ShoppingCartOutlinedIcon sx={{ fontSize: 16 }} />}
                value={loading ? "..." : formatMoney({ arsValue: ftdMontoArs, usdValue: ftdMontoUsd })}
                subtitle={loading ? "..." : `${formatNumber(ftdCount)} FTD`}
                delta={kpiDeltas.ftdUsd}
                accentClass="text-emerald-200"
                sparkSeed={ftdMontoUsd || ftdCount || 1}
                large
              />
              <DashboardCard
                title={showNetMetrics ? "ROAS Neto" : "ROAS FTD"}
                icon={<PercentOutlinedIcon sx={{ fontSize: 16 }} />}
                value={loading ? "..." : safeNumber(showNetMetrics ? roasNeto : roasFtd).toFixed(2)}
                subtitle={showNetMetrics ? "Rentabilidad actual" : "Retorno sobre FTD"}
                delta={kpiDeltas.roas}
                accentClass="text-white"
                sparkSeed={roasFtd * 10 || 1}
              />
              <DashboardCard
                title="Gasto"
                icon={<AttachMoneyOutlinedIcon sx={{ fontSize: 16 }} />}
                value={loading ? "..." : formatMoney({ arsValue: gastoArs, usdValue: gastoUsd })}
                subtitle="Inversión publicitaria"
                delta={kpiDeltas.gastoUsd}
                accentClass="text-rose-200"
                sparkSeed={gastoUsd || 1}
              />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[1.8fr_1fr]">
              <div className="min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-[#101012] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Funnel</p>
                    <p className="mt-1 text-sm text-white/60">Gasto → Leads → Contactos → FTD</p>
                  </div>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    {
                      title: "Web Visitors",
                      icon: <PreviewOutlinedIcon sx={{ fontSize: 14 }} />,
                      value: loading ? "..." : formatNumber(webVisitors),
                      delta: kpiDeltas.webVisitors,
                      accent: "text-white",
                    },
                    {
                      title: "Leads",
                      icon: <PendingActionsOutlinedIcon sx={{ fontSize: 14 }} />,
                      value: loading ? "..." : formatNumber(leads),
                      delta: kpiDeltas.leads,
                      accent: "text-sky-200",
                    },
                    {
                      title: "Contactos",
                      icon: <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 14 }} />,
                      value: loading ? "..." : formatNumber(contactos),
                      delta: kpiDeltas.contactos,
                      accent: "text-yellow-200",
                    },
                    {
                      title: "FTD",
                      icon: <ShoppingCartOutlinedIcon sx={{ fontSize: 14 }} />,
                      value: loading ? "..." : formatNumber(ftdCount),
                      delta: kpiDeltas.ftdCount,
                      accent: "text-emerald-200",
                    },
                  ].map((item) => (
                    <div key={item.title} className="min-w-0 rounded-xl border border-white/7 bg-white/[0.02] px-4 py-4">
                      <div className="mb-2 flex items-center gap-2 text-white/55">
                        {item.icon}
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{item.title}</span>
                      </div>
                      <div className={`truncate text-[2rem] font-semibold leading-none ${item.accent}`}>
                        {item.value}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <DeltaPill meta={item.delta} />
                        <div className="h-px flex-1 bg-white/8" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4">
                <DashboardCard
                  title="Efectividad"
                  icon={<PercentOutlinedIcon sx={{ fontSize: 16 }} />}
                  value={loading ? "..." : formatPct(conversionPct)}
                  subtitle="Leads que convierten"
                  delta={kpiDeltas.conversion}
                  accentClass="text-sky-200"
                  sparkSeed={conversionPct || 1}
                />
                <DashboardCard
                  title="Ticket promedio"
                  icon={<AttachMoneyOutlinedIcon sx={{ fontSize: 16 }} />}
                  value={loading ? "..." : formatMoney({ arsValue: valorCompraPromArs, usdValue: valorCompraPromUsd })}
                  subtitle="Valor por compra"
                  delta={null}
                  accentClass="text-white"
                  sparkSeed={valorCompraPromUsd || valorCompraPromArs || 1}
                />
              </div>
            </div>

            <RecentPurchasesTable
              usePeriod={usePeriod}
              period={period}
              desde={desde}
              hasta={hasta}
            />
          </section>
        </div>
      </div>
    </Page>
  );
}

export default Stats;
