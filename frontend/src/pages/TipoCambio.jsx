import { useEffect, useMemo, useState } from "react";
import Page from "../layouts/Page";
import { apiClient } from "../services/auth";
import Button from "@mui/material/Button";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return numeric.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export default function TipoCambio() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRows = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/tipos-cambio/");
      setRows(Array.isArray(data) ? data : []);
    } catch (_err) {
      setError("No se pudo cargar el historial de tipo de cambio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const dateA = new Date(a?.creado_en || 0).getTime();
      const dateB = new Date(b?.creado_en || 0).getTime();
      return dateB - dateA;
    });
  }, [rows]);

  return (
    <Page
      title="Tipo de Cambio"
      actions={
        <Button
          variant="outlined"
          size="medium"
          color="primary"
          startIcon={<RefreshOutlinedIcon />}
          onClick={loadRows}
          disabled={loading}
        >
          {loading ? "Actualizando..." : "Refresh"}
        </Button>
      }
    >
      <div className="w-full rounded-2xl bg-white p-4 dark:bg-neutral-900 md:p-6">
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-300/60 dark:border-zinc-700">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 dark:bg-zinc-800/90">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-zinc-200">Fecha y hora</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-zinc-200">Valor</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-zinc-200">Fuente</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-zinc-200">Vigente desde</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-zinc-200">Vigente hasta</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-slate-600 dark:text-zinc-300" colSpan={5}>
                    Cargando...
                  </td>
                </tr>
              ) : null}
              {!loading && error ? (
                <tr>
                  <td className="px-3 py-3 text-red-500" colSpan={5}>
                    {error}
                  </td>
                </tr>
              ) : null}
              {!loading && !error && sortedRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-600 dark:text-zinc-300" colSpan={5}>
                    Sin registros.
                  </td>
                </tr>
              ) : null}
              {!loading && !error
                ? sortedRows.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200/70 dark:border-zinc-800">
                      <td className="px-3 py-2 text-slate-700 dark:text-zinc-200">{formatDateTime(item.creado_en)}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-zinc-200">{formatValue(item.valor)}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-zinc-200">{item.fuente || "-"}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-zinc-200">{formatDateTime(item.vigente_desde)}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-zinc-200">{formatDateTime(item.vigente_hasta)}</td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}
