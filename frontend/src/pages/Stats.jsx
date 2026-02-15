import { useEffect, useMemo, useState } from "react";
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
import Button from "@mui/material/Button";
import { apiClient } from "../services/auth";
import { useTenant } from "../context/TenantContext";

function Stats() {
  const { tenantId } = useTenant();
  const [period, setPeriod] = useState("week");
  const [desde, setDesde] = useState(dayjs());
  const [hasta, setHasta] = useState(dayjs());
  const [usePeriod, setUsePeriod] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const params = usePeriod
    ? { period }
    : {
        from: desde?.format("YYYY-MM-DD"),
        to: hasta?.format("YYYY-MM-DD"),
      };

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data: response } = await apiClient.get("/stats/", {
          params,
          signal: controller.signal,
        });
        setData(response);
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
          return;
        }
        setError("No se pudieron cargar las estadisticas.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      controller.abort();
    };
  }, [usePeriod, period, desde, hasta, tenantId]);

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

  const formatNumber = (value) => numberFormatter.format(Number(value || 0));
  const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));
  const formatUsd = (value) => usdFormatter.format(Number(value || 0));
  const formatPct = (value) => percentFormatter.format(Number(value || 0) / 100);

  const webVisitors = data?.web_visitors ?? 0;
  const leads = data?.leads ?? 0;
  const contactos = data?.contactos ?? 0;
  const comprasCount = data?.compras?.count ?? 0;
  const comprasMonto = data?.compras?.monto_total ?? 0;
  const conversionPct = data?.conversion_pct ?? 0;
  const valorCompraProm = data?.valor_compra_prom ?? 0;
  const retencionPct = data?.retencion_pct ?? 0;
  const roas = data?.roas ?? 0;
  const gastoUsd = data?.gasto_usd ?? 0;

  const upperCards = [
    {
      title: "Gasto Publicitario",
      sizeHeight: "h-25",
      sizeWidth: "w-full xl:max-w-[200px] xl:max-w-none xl:w-full",
      value: loading ? "..." : formatUsd(gastoUsd),
      icon: <PercentOutlinedIcon fontSize="extra-small" />,
    },
    {
      title: "ROAS",
      sizeHeight: "h-25",
      sizeWidth: "w-full xl:max-w-[200px] xl:max-w-none xl:w-full",
      value: loading ? "..." : Number(roas || 0).toFixed(2),
      icon: <PercentOutlinedIcon fontSize="extra-small" />,
    },
    {
      title: "Compras",
      subtitle: loading ? "..." : formatNumber(comprasCount),
      value: loading ? "..." : formatCurrency(comprasMonto),
      sizeHeight: "h-25",
      sizeWidth: "w-full xl:max-w-[200px] xl:max-w-none xl:w-full",
      icon: <ShoppingCartOutlinedIcon fontSize="extra-small" />,
    },
  ];
  
  const lowerCards = [
    {
      title: "Ticket Promedio",
      sizeHeight: "h-20",
      sizeWidth: "w-full xl:max-w-[200px] xl:max-w-none xl:w-full",
      value: loading ? "..." : formatCurrency(valorCompraProm),
      icon: <PercentOutlinedIcon fontSize="extra-small" />,
    },
    {
      title: "Efectividad",
      sizeHeight: "h-20",
      sizeWidth: "w-full xl:max-w-[200px] xl:max-w-none xl:w-full",
      value: loading ? "..." : formatPct(conversionPct),
      icon: <TrendingUpOutlinedIcon fontSize="extra-small" />,
    },
    {
      title: "Web Visitors",
      value: loading ? "..." : formatNumber(webVisitors),
      sizeHeight: "h-20",
      sizeWidth: "w-full xl:max-w-[200px] xl:max-w-none xl:w-full",
      icon: <PreviewOutlinedIcon fontSize="extra-small" />,
    },
    {
      title: "Leads",
      value: loading ? "..." : formatNumber(leads),
      sizeHeight: "h-20",
      sizeWidth: "w-full xl:max-w-[200px] xl:max-w-none xl:w-full",
      icon: <PendingActionsOutlinedIcon fontSize="extra-small" />,
    },
    {
      title: "Contactos",
      value: loading ? "..." : formatNumber(contactos),
      sizeHeight: "h-20",
      sizeWidth: "w-full xl:max-w-[200px] xl:max-w-none xl:w-full",
      icon: <ChatBubbleOutlineOutlinedIcon fontSize="extra-small" />,
    },
    {
      title: "% Retención",
      sizeHeight: "h-20",
      sizeWidth: "w-full xl:max-w-[200px] xl:max-w-none xl:w-full",
      value: loading ? "..." : formatPct(retencionPct),
      icon: <TrendingUpOutlinedIcon fontSize="extra-small" />,
    },

  ];

  return (
    <Page
      title="Estadisticas"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowMobileFilters((prev) => !prev)}
            startIcon={<FilterListOutlinedIcon fontSize="small" />}
            className="sm:hidden"
          >
            {showMobileFilters ? "Ocultar" : "Filtros"}
          </Button>
          <div className="hidden sm:block">
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
      {showMobileFilters ? (
        <div className="w-full sm:hidden">
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
          <div className="grid w-full grid-cols-2 gap-3 pb-4 pt-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
            {upperCards.map((card) => (
              <Card key={card.title} {...card} />
            ))}
          </div>
          <div className="grid w-full grid-cols-2 gap-3 pb-4 pt-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 md:gap-5">
            {lowerCards.map((card) => (
              <Card key={card.title} {...card} />
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}

export default Stats;
