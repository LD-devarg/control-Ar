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
  const [bots, setBots] = useState([]);
  const [botForm, setBotForm] = useState({
    id: null,
    nombre: "",
    tipo: "BOT",
    token: "",
    activo: true,
  });
  const [savingBot, setSavingBot] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: response }, { data: botsResponse }] = await Promise.all([
          apiClient.get("/health/"),
          apiClient.get("/health/telegram-bots/"),
        ]);
        if (mounted) {
          setData(response);
          setBots(Array.isArray(botsResponse?.results) ? botsResponse.results : []);
        }
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

  const handleBotEdit = (bot) => {
    setBotForm({
      id: bot?.id || null,
      nombre: bot?.nombre || "",
      tipo: bot?.tipo || "BOT",
      token: "",
      activo: Boolean(bot?.activo),
    });
  };

  const resetBotForm = () => {
    setBotForm({ id: null, nombre: "", tipo: "BOT", token: "", activo: true });
  };

  const saveBot = async () => {
    if (!botForm.nombre.trim()) return;
    if (!botForm.id && !botForm.token.trim()) return;
    setSavingBot(true);
    try {
      const payload = {
        ...(botForm.id ? { id: botForm.id } : {}),
        nombre: botForm.nombre.trim(),
        tipo: botForm.tipo || "BOT",
        activo: Boolean(botForm.activo),
        ...(botForm.token.trim() ? { token: botForm.token.trim() } : {}),
      };
      const { data: response } = botForm.id
        ? await apiClient.patch("/health/telegram-bots/", payload)
        : await apiClient.post("/health/telegram-bots/", payload);

      setBots((prev) => {
        const exists = prev.some((item) => item.id === response.id);
        if (exists) return prev.map((item) => (item.id === response.id ? response : item));
        return [response, ...prev];
      });
      resetBotForm();
    } finally {
      setSavingBot(false);
    }
  };

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

      <div className="w-full mt-2 grid grid-cols-1 xl:grid-cols-3 gap-4 pb-4">
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

        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="text-sm font-semibold text-white mb-2">Telegram bots</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <input
              value={botForm.nombre}
              onChange={(event) => setBotForm((prev) => ({ ...prev, nombre: event.target.value }))}
              className="rounded border border-white/20 bg-black/30 px-2 py-1 text-sm text-white"
              placeholder="Nombre del bot"
            />
            <select
              value={botForm.tipo}
              onChange={(event) => setBotForm((prev) => ({ ...prev, tipo: event.target.value }))}
              className="rounded border border-white/20 bg-black/30 px-2 py-1 text-sm text-white"
            >
              <option value="BOT">BOT</option>
            </select>
            <input
              value={botForm.token}
              onChange={(event) => setBotForm((prev) => ({ ...prev, token: event.target.value }))}
              className="rounded border border-white/20 bg-black/30 px-2 py-1 text-sm text-white md:col-span-2"
              placeholder={botForm.id ? "Nuevo token (opcional)" : "Token del bot"}
            />
            <label className="text-xs text-white/80 flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(botForm.activo)}
                onChange={(event) => setBotForm((prev) => ({ ...prev, activo: event.target.checked }))}
              />
              Activo
            </label>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={saveBot}
              disabled={savingBot}
              className="rounded border border-cyan-400/70 px-2 py-1 text-xs font-semibold text-cyan-300 disabled:opacity-50"
            >
              {savingBot ? "Guardando..." : botForm.id ? "Actualizar bot" : "Crear bot"}
            </button>
            <button
              type="button"
              onClick={resetBotForm}
              disabled={savingBot}
              className="rounded border border-white/30 px-2 py-1 text-xs font-semibold text-white/80 disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
          <div className="overflow-auto max-h-72">
            <table className="min-w-full text-xs">
              <thead className="text-white/70">
                <tr>
                  <th className="text-left py-1 pr-2">Nombre</th>
                  <th className="text-left py-1 pr-2">Tipo</th>
                  <th className="text-left py-1 pr-2">Activo</th>
                  <th className="text-left py-1 pr-2">Token</th>
                  <th className="text-left py-1 pr-2">Accion</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {bots.map((bot) => (
                  <tr key={bot.id} className="border-t border-white/10">
                    <td className="py-1 pr-2">{bot.nombre}</td>
                    <td className="py-1 pr-2">{bot.tipo}</td>
                    <td className="py-1 pr-2">{bot.activo ? "ON" : "OFF"}</td>
                    <td className="py-1 pr-2">{bot.has_token ? "OK" : "NO"}</td>
                    <td className="py-1 pr-2">
                      <button
                        type="button"
                        onClick={() => handleBotEdit(bot)}
                        className="rounded border border-white/30 px-2 py-0.5 text-[11px] text-white/80"
                      >
                        Editar
                      </button>
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
