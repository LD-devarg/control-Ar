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
import { apiClient } from "../services/auth";
import RecentPurchasesTable from "../components/RecentPurchasesTable.jsx";

function Stats() {
  const [period, setPeriod] = useState("week");
  const [desde, setDesde] = useState(dayjs());
  const [hasta, setHasta] = useState(dayjs());
  const [usePeriod, setUsePeriod] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
  }, [usePeriod, period, desde, hasta]);

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
  const formatPct = (value) => percentFormatter.format(Number(value || 0) / 100);

  const webVisitors = data?.web_visitors ?? 0;
  const leads = data?.leads ?? 0;
  const contactos = data?.contactos ?? 0;
  const comprasCount = data?.compras?.count ?? 0;
  const comprasMonto = data?.compras?.monto_total ?? 0;
  const conversionPct = data?.conversion_pct ?? 0;
  const valorCompraProm = data?.valor_compra_prom ?? 0;
  const retencionPct = data?.retencion_pct ?? 0;

  const upperCards = [
    {
      title: "Web Visitors",
      value: loading ? "..." : formatNumber(webVisitors),
      sizeHeight: "h-20",
      sizeWidth: "w-full",
      icon: <PreviewOutlinedIcon fontSize="small" />,
    },
    {
      title: "Leads",
      value: loading ? "..." : formatNumber(leads),
      sizeHeight: "h-20",
      sizeWidth: "w-full",
      icon: <PendingActionsOutlinedIcon fontSize="small" />,
    },
    {
      title: "Contactos",
      value: loading ? "..." : formatNumber(contactos),
      sizeHeight: "h-20",
      sizeWidth: "w-full",
      icon: <ChatBubbleOutlineOutlinedIcon fontSize="small" />,
    },
    {
      title: "Compras",
      subtitle: loading ? "..." : formatNumber(comprasCount),
      value: loading ? "..." : formatCurrency(comprasMonto),
      sizeHeight: "h-20",
      sizeWidth: "w-full",
      icon: <ShoppingCartOutlinedIcon fontSize="small" />,
    },
  ];

  const lowerCards = [
    {
      title: "% Conversion",
      sizeHeight: "h-20",
      sizeWidth: "w-full",
      value: loading ? "..." : formatPct(conversionPct),
      icon: <TrendingUpOutlinedIcon fontSize="small" />,
    },
    {
      title: "Valor % de Compras",
      sizeHeight: "h-20",
      sizeWidth: "w-full",
      value: loading ? "..." : formatCurrency(valorCompraProm),
      icon: <PercentOutlinedIcon fontSize="small" />,
    },
    {
      title: "Tasa de Retencion",
      sizeHeight: "h-20",
      sizeWidth: "w-full",
      value: loading ? "..." : formatPct(retencionPct),
      icon: <TrendingUpOutlinedIcon fontSize="small" />,
    },
    {
      title: "ROAS",
      sizeHeight: "h-20",
      sizeWidth: "w-full",
      value: "--",
      icon: <PercentOutlinedIcon fontSize="small" />,
    },
  ];

  return (
    <Page
      title="Estadisticas"
      actions={
        <Filter
          period={period}
          onPeriodChange={onPeriodChange}
          desde={desde}
          hasta={hasta}
          onDesdeChange={onDesdeChange}
          onHastaChange={onHastaChange}
        />
      }
    >
      {error ? (
        <div className="w-[90%] rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 w-full md:w-[90%] border-b border-t dark:border-zinc-500 pb-4 pt-4">
        {upperCards.map((card) => (
          <Card key={card.title} {...card} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 w-full md:w-[90%] border-b border-t dark:border-zinc-500 pb-4 pt-4">
        {lowerCards.map((card) => (
          <Card key={card.title} {...card} />
        ))}
      </div>
      <div className="flex justify-center items-stretch gap-5 w-full md:w-[90%] mt-2">
        <div className="flex items-center dark:border-zinc-500 flex-col w-full md:w-[90%] min-w-0 mb-0">
          <RecentPurchasesTable
            usePeriod={usePeriod}
            period={period}
            desde={desde}
            hasta={hasta}
          />
        </div>
      </div>
    </Page>
  );
}

export default Stats;
