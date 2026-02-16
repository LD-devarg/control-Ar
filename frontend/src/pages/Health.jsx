import { useEffect, useState } from "react";
import Page from "../layouts/Page.jsx";
import Card from "../components/Card";
import { apiClient } from "../services/auth";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";

const POLL_MS = 300000;

function formatStatus(value) {
  if (value === true) return "OK";
  if (value === false) return "FAIL";
  return "N/A";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR");
}

function Health() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data: response } = await apiClient.get("/health/");
        if (mounted) setData(response);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Page title="Health">
      <div className="grid grid-cols-2 xl:grid-cols-4 mt-5 gap-5 w-9/10 justify-between border-t-1 dark:border-zinc-500 pb-4 pt-4">
        <Card
          title="Backend"
          value={loading ? "..." : formatStatus(true)}
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-70"}
          icon={<HealthAndSafetyOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Base de Datos"
          value={loading ? "..." : formatStatus(data?.database?.ok)}
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-70"}
          icon={<StorageOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Celery Broker"
          value={loading ? "..." : formatStatus(data?.celery?.ok)}
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-70"}
          icon={<HubOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Worker"
          value={loading ? "..." : formatStatus(data?.worker?.ok)}
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-70"}
          icon={<DnsOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Beat"
          value={loading ? "..." : formatStatus(data?.beat?.ok)}
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-70"}
          icon={<ScheduleOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Tasks Programadas"
          value={loading ? "..." : formatStatus(data?.tasks?.managed_enabled)}
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-70"}
          icon={<ScheduleOutlinedIcon fontSize="small" />}
        />
        <Card
          title="React"
          value="OK"
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-70"}
          icon={<HealthAndSafetyOutlinedIcon fontSize="small" />}
        />
      </div>

      <div className="w-9/10 mt-2 grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="text-sm font-semibold text-white mb-2">Debug tareas Beat</div>
          <div className="overflow-auto max-h-72">
            <table className="min-w-full text-xs">
              <thead className="text-white/70">
                <tr>
                  <th className="text-left py-1 pr-2">Tarea</th>
                  <th className="text-left py-1 pr-2">Enabled</th>
                  <th className="text-left py-1 pr-2">Ultima corrida</th>
                  <th className="text-left py-1 pr-2">Runs</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {(data?.periodic_tasks || []).map((task) => (
                  <tr key={task.name} className="border-t border-white/10">
                    <td className="py-1 pr-2">{task.name}</td>
                    <td className="py-1 pr-2">{task.enabled ? "ON" : "OFF"}</td>
                    <td className="py-1 pr-2">{formatDateTime(task.last_run_at)}</td>
                    <td className="py-1 pr-2">{task.total_run_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="text-sm font-semibold text-white mb-2">Debug sync por empresa</div>
          <div className="text-xs text-white/60 mb-2">
            KPI OK: {data?.debug?.sync?.summary?.kpi_ok ?? 0} | KPI ERROR: {data?.debug?.sync?.summary?.kpi_error ?? 0} | Estado OK: {data?.debug?.sync?.summary?.estado_ok ?? 0} | Estado ERROR: {data?.debug?.sync?.summary?.estado_error ?? 0}
          </div>
          <div className="overflow-auto max-h-72">
            <table className="min-w-full text-xs">
              <thead className="text-white/70">
                <tr>
                  <th className="text-left py-1 pr-2">Empresa</th>
                  <th className="text-left py-1 pr-2">KPI sync</th>
                  <th className="text-left py-1 pr-2">Estado sync</th>
                  <th className="text-left py-1 pr-2">Errores</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {(data?.debug?.sync?.rows || []).map((row) => (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="py-1 pr-2">{row.nombre}</td>
                    <td className="py-1 pr-2">
                      {formatDateTime(row.kpi_sync_last_run_at)} ({row.kpi_sync_last_status || "n/a"})
                    </td>
                    <td className="py-1 pr-2">
                      {formatDateTime(row.estado_sync_last_run_at)} ({row.estado_sync_last_status || "n/a"})
                    </td>
                    <td className="py-1 pr-2 text-[11px] text-amber-300">
                      {row.kpi_sync_last_error || row.estado_sync_last_error || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Page>
  );
}

export default Health;
