import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import Page from "../layouts/Page.jsx";
import Filter from "../components/Filter";
import Card from "../components/Card";
import PreviewOutlinedIcon from "@mui/icons-material/PreviewOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import Button from "@mui/material/Button";
import { apiClient } from "../services/auth";
import { subscribeRealtimeEvents } from "../services/realtime";
import { useTenant } from "../context/TenantContext";

const POLL_MS = 60 * 60 * 1000;
const TABLET_MAX_WIDTH = 1024;
const REALTIME_DEBOUNCE_MS = 700;
const REQUEST_TIMEOUT_MS = 15000;

const CARD_SIZE_PRESETS = {
  medium: {
    sizeHeight: "h-22",
    sizeWidth: "w-full xl:max-w-[200px] xl:max-w-none xl:w-full",
    textSize: "text-lg lg:text-2xl",
  },
  small: {
    sizeHeight: "h-18",
    sizeWidth: "w-full xl:max-w-[200px] xl:max-w-none xl:w-full",
    textSize: "text-md lg:text-lg",
  },
};

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

function Stats() {
  const { tenantId, features: tenantFeatures } = useTenant();
  const [period, setPeriod] = useState("week");
  const [desde, setDesde] = useState(dayjs());
  const [hasta, setHasta] = useState(dayjs());
  const [usePeriod, setUsePeriod] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResponsiveFilters, setShowResponsiveFilters] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    if (isIpadDevice()) return true;
    return window.innerWidth <= TABLET_MAX_WIDTH;
  });

  const activeRequestRef = useRef(null);
  const abortTimerRef = useRef(null);
  const realtimeDebounceRef = useRef(null);

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

  const params = useMemo(
    () =>
      usePeriod
        ? { period }
        : {
            from: desde?.format("YYYY-MM-DD"),
            to: hasta?.format("YYYY-MM-DD"),
          },
    [usePeriod, period, desde, hasta]
  );

  const loadStats = useCallback(
    async (controller) => {
      const { signal } = controller;
      setLoading(true);
      setError("");
      try {
        const { data: response } = await apiClient.get("/stats/", {
          params,
          signal,
        });
        setData(response);
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
    [params]
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
    setUsePeriod(true);
  };

  const onDesdeChange = (value) => {
    setDesde(value);
    setUsePeriod(false);
  };

  const onHastaChange = (value) => {
    setHasta(value);
    setUsePeriod(false);
  };

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }),
    []
  );
  const currencyFormatter = useMemo(
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
  const formatCurrency = useCallback((value) => currencyFormatter.format(safeNumber(value)), [currencyFormatter]);
  const formatUsd = useCallback((value) => usdFormatter.format(safeNumber(value)), [usdFormatter]);
  const formatPct = useCallback((value) => percentFormatter.format(safeNumber(value) / 100), [percentFormatter]);

  const {
    web_visitors: webVisitors = 0,
    leads = 0,
    contactos = 0,
    conversion_pct: conversionPct = 0,
    valor_compra_prom: valorCompraProm = 0,
    retencion_pct: retencionPct = 0,
    roas_ftd: roasFtdRaw,
    roas: roasLegacy = 0,
    roas_neto: roasNeto = 0,
    ganancia_neta_usd: gananciaNetaUsd = 0,
    ltv7_usd: ltv7Usd = 0,
    ltv30_usd: ltv30Usd = 0,
    ltv60_usd: ltv60Usd = 0,
    gasto_usd: gastoUsd = 0,
    features: statsFeatures = null,
    ftd = {},
    compras = {},
    retiros = {},
  } = data ?? {};

  const effectiveFeatures = statsFeatures && typeof statsFeatures === "object"
    ? statsFeatures
    : (tenantFeatures || {});
  const showNetMetrics = Boolean(effectiveFeatures?.net_metrics);
  const showBonos = Boolean(effectiveFeatures?.bonos);
  const showRetiros = Boolean(effectiveFeatures?.retiros);

  const roasFtd = roasFtdRaw ?? roasLegacy;
  const ftdCount = ftd?.count ?? 0;
  const ftdMonto = ftd?.monto_total ?? 0;
  const comprasCount = compras?.count ?? 0;
  const comprasMonto = compras?.monto_total ?? 0;
  const bonosMontoUsd = compras?.bonos_usd ?? 0;
  const retirosCount = retiros?.count ?? 0;
  const retirosMontoUsd = retiros?.monto_total_usd ?? 0;

  const negocioCards = showNetMetrics
    ? [
        {
          title: "Compras",
          subtitle: loading ? "..." : formatNumber(comprasCount),
          value: loading ? "..." : formatCurrency(comprasMonto),
          ...CARD_SIZE_PRESETS.medium,
          icon: <ShoppingCartOutlinedIcon fontSize="extra-small" />,
        },
        {
          title: "Ganancia Neta",
          ...CARD_SIZE_PRESETS.medium,
          value: loading ? "..." : formatUsd(gananciaNetaUsd),
          icon: <TrendingUpOutlinedIcon fontSize="extra-small" />,
        },
        {
          title: "ROAS Neto",
          ...CARD_SIZE_PRESETS.medium,
          value: loading ? "..." : safeNumber(roasNeto).toFixed(2),
          icon: <PercentOutlinedIcon fontSize="extra-small" />,
        },
      ]
    : [
        {
          title: "FTD",
          subtitle: loading ? "..." : formatNumber(ftdCount),
          value: loading ? "..." : formatCurrency(ftdMonto),
          ...CARD_SIZE_PRESETS.medium,
          icon: <ShoppingCartOutlinedIcon fontSize="extra-small" />,
        },
        {
          title: "Gasto Publicitario",
          ...CARD_SIZE_PRESETS.medium,
          value: loading ? "..." : formatUsd(gastoUsd),
          icon: <AttachMoneyOutlinedIcon fontSize="extra-small" />,
        },
        {
          title: "ROAS FTD",
          ...CARD_SIZE_PRESETS.medium,
          value: loading ? "..." : safeNumber(roasFtd).toFixed(2),
          icon: <PercentOutlinedIcon fontSize="extra-small" />,
        },
      ];

  const gastosCards = [
    ...(showBonos
      ? [
          {
            title: "Bonos",
            ...CARD_SIZE_PRESETS.medium,
            value: loading ? "..." : formatUsd(bonosMontoUsd),
            icon: <AttachMoneyOutlinedIcon fontSize="extra-small" />,
          },
        ]
      : []),
    ...(showRetiros
      ? [
          {
            title: "Retiros",
            subtitle: loading ? "..." : formatNumber(retirosCount),
            ...CARD_SIZE_PRESETS.medium,
            value: loading ? "..." : formatUsd(retirosMontoUsd),
            icon: <AttachMoneyOutlinedIcon fontSize="extra-small" />,
          },
        ]
      : []),
    ...(showNetMetrics
      ? [
          {
            title: "Gasto Publicitario",
            ...CARD_SIZE_PRESETS.medium,
            value: loading ? "..." : formatUsd(gastoUsd),
            icon: <AttachMoneyOutlinedIcon fontSize="extra-small" />,
          },
        ]
      : []),
  ];

  const pautaCards = [
    {
      title: "Web Visitors",
      value: loading ? "..." : formatNumber(webVisitors),
      ...CARD_SIZE_PRESETS.small,
      icon: <PreviewOutlinedIcon fontSize="extra-small" />,
    },
    {
      title: "Leads",
      value: loading ? "..." : formatNumber(leads),
      ...CARD_SIZE_PRESETS.small,
      icon: <PendingActionsOutlinedIcon fontSize="extra-small" />,
    },
    {
      title: "Contactos",
      value: loading ? "..." : formatNumber(contactos),
      ...CARD_SIZE_PRESETS.small,
      icon: <ChatBubbleOutlineOutlinedIcon fontSize="extra-small" />,
    },
    ...(showNetMetrics
      ? [
          {
            title: "FTD",
            subtitle: loading ? "..." : formatNumber(ftdCount),
            value: loading ? "..." : formatCurrency(ftdMonto),
            ...CARD_SIZE_PRESETS.small,
            icon: <ShoppingCartOutlinedIcon fontSize="extra-small" />,
          },
          {
            title: "ROAS FTD",
            ...CARD_SIZE_PRESETS.small,
            value: loading ? "..." : safeNumber(roasFtd).toFixed(2),
            icon: <PercentOutlinedIcon fontSize="extra-small" />,
          },
        ]
      : []),
  ];

  const porcentajesCards = [
    {
      title: "Efectividad",
      ...CARD_SIZE_PRESETS.small,
      value: loading ? "..." : formatPct(conversionPct),
      icon: <PercentOutlinedIcon fontSize="extra-small" />,
    },
    {
      title: "Ticket Promedio",
      ...CARD_SIZE_PRESETS.small,
      value: loading ? "..." : formatCurrency(valorCompraProm),
      icon: <AttachMoneyOutlinedIcon fontSize="extra-small" />,
    },
    {
      title: "% Retencion",
      ...CARD_SIZE_PRESETS.small,
      value: loading ? "..." : formatPct(retencionPct),
      icon: <PercentOutlinedIcon fontSize="extra-small" />,
    },
    ...(showNetMetrics
      ? [
          {
            title: "LTV 7",
            ...CARD_SIZE_PRESETS.small,
            value: loading ? "..." : formatUsd(ltv7Usd),
            icon: <AttachMoneyOutlinedIcon fontSize="extra-small" />,
          },
          {
            title: "LTV 30",
            ...CARD_SIZE_PRESETS.small,
            value: loading ? "..." : formatUsd(ltv30Usd),
            icon: <AttachMoneyOutlinedIcon fontSize="extra-small" />,
          },
          {
            title: "LTV 60",
            ...CARD_SIZE_PRESETS.small,
            value: loading ? "..." : formatUsd(ltv60Usd),
            icon: <AttachMoneyOutlinedIcon fontSize="extra-small" />,
          },
        ]
      : []),
  ];

  return (
    <Page
      title="Estadisticas"
      actions={
        <div className="flex items-center gap-2">
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
            {loading ? "Actualizando..." : "Refresh"}
          </Button>
          <div className={isCompactViewport ? "hidden" : "block"}>
            <Filter
              period={period}
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
      {showResponsiveFilters && isCompactViewport ? (
        <div className="w-full">
          <Filter
            period={period}
            onPeriodChange={onPeriodChange}
            desde={desde}
            hasta={hasta}
            onDesdeChange={onDesdeChange}
            onHastaChange={onHastaChange}
          />
        </div>
      ) : null}

      {error ? (
        <div className="w-full rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200 md:w-[90%]">
          {error}
        </div>
      ) : null}
      <div className="mt-2 w-full md:w-[90%]">
        <section className="min-w-0 space-y-4">
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
              {negocioCards.map((card) => (
              <Card key={card.title} {...card} variant="kpi" />
            ))}
          </div>
          {gastosCards.length > 0 ? (
            <div className="grid w-full grid-cols-2 gap-3 pb-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
              {gastosCards.map((card) => (
                <Card key={card.title} {...card} variant="kpi" />
              ))}
            </div>
          ) : null}
          <div
            className={`grid w-full grid-cols-2 gap-3 pt-4 sm:grid-cols-2 md:gap-5 ${
              showNetMetrics ? "md:grid-cols-5 xl:grid-cols-5" : "md:grid-cols-3 xl:grid-cols-3"
            }`}
          >
            {pautaCards.map((card) => (
              <Card key={card.title} {...card} variant="kpi" />
            ))}
          </div>
          <div className="grid w-full grid-cols-2 gap-3 pb-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 md:gap-5">
            {porcentajesCards.map((card) => (
              <Card key={card.title} {...card} variant="kpi" />
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}

export default Stats;
