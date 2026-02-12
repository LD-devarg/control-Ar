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

function Stats() {
  const [period, setPeriod] = useState("week");
  const [desde, setDesde] = useState(dayjs());
  const [hasta, setHasta] = useState(dayjs());
  const [usePeriod, setUsePeriod] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const params = useMemo(() => {
    if (usePeriod) {
      return { period };
    }
    return {
      from: desde?.format("YYYY-MM-DD"),
      to: hasta?.format("YYYY-MM-DD"),
    };
  }, [usePeriod, period, desde, hasta]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data: response } = await apiClient.get("/stats/", { params });
        if (mounted) setData(response);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [params]);

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

  const formatNumber = (value) =>
    new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Number(value || 0));
  const formatCurrency = (value) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(Number(value || 0));
  const formatPct = (value) =>
    new Intl.NumberFormat("es-AR", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(Number(value || 0) / 100);

  const webVisitors = data?.web_visitors ?? 0;
  const leads = data?.leads ?? 0;
  const contactos = data?.contactos ?? 0;
  const comprasCount = data?.compras?.count ?? 0;
  const comprasMonto = data?.compras?.monto_total ?? 0;
  const conversionPct = data?.conversion_pct ?? 0;
  const valorCompraProm = data?.valor_compra_prom ?? 0;
  const retencionPct = data?.retencion_pct ?? 0;

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
      <div className="flex gap-5 w-9/10 border-b-1 justify-between border-t-1 dark:border-zinc-500 pb-4 pt-4">
        <Card
          title="Web Visitors"
          value={loading ? "..." : formatNumber(webVisitors)}
          sizeHeight={"h-20"}
          sizeWidth={"w-45 lg:w-70"}
          icon={<PreviewOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Leads"
          value={loading ? "..." : formatNumber(leads)}
          sizeHeight={"h-20"}
          sizeWidth={"w-45 lg:w-70"}
          icon={<PendingActionsOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Contactos"
          value={loading ? "..." : formatNumber(contactos)}
          sizeHeight={"h-20"}
          sizeWidth={"w-45 lg:w-70"}
          icon={<ChatBubbleOutlineOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Compras"
          subtitle={loading ? "..." : formatNumber(comprasCount)}
          value={loading ? "..." : formatCurrency(comprasMonto)}
          sizeHeight={"h-20"}
          sizeWidth={"w-45 lg:w-70"}
          icon={<ShoppingCartOutlinedIcon fontSize="small" />}
        />
      </div>
      <div className="flex gap-5 w-9/10 border-b-1 justify-evenly border-t-1 dark:border-zinc-500 pb-4 pt-4">
        <Card
          title="% Conversion"
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-50"}
          value={loading ? "..." : formatPct(conversionPct)}
          icon={<TrendingUpOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Valor % de Compras"
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-50"}
          value={loading ? "..." : formatCurrency(valorCompraProm)}
          icon={<PercentOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Tasa de Retencion"
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-50"}
          value={loading ? "..." : formatPct(retencionPct)}
          icon={<TrendingUpOutlinedIcon fontSize="small" />}
        />
        <Card
          title="ROAS"
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-50"}
          value="--"
          icon={<PercentOutlinedIcon fontSize="small" />}
        />
      </div>
      <div className="flex justify-center items-stretch gap-5 w-9/10 mt-2">
        <div className="flex items-center dark:border-zinc-500 flex-col w-full md:w-9/10 min-w-0 mb-0">
          <div className="w-full"></div>
        </div>
      </div>
    </Page>
  );
}

export default Stats;
