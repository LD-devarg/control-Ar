import React, { useEffect, useRef, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import TableSortLabel from "@mui/material/TableSortLabel";

function cpaTone(value) {
  if (value <= 7000) return "bg-emerald-500/12 text-emerald-300";
  if (value <= 8500) return "bg-amber-500/12 text-amber-200";
  return "bg-rose-500/12 text-rose-300";
}

function roasTone(value) {
  if (value >= 3.5) return "bg-emerald-500/12 text-emerald-300";
  if (value >= 2.8) return "bg-amber-500/12 text-amber-200";
  return "bg-rose-500/12 text-rose-300";
}

export default function OperativeKPIPanel({
  level,
  levelLabels,
  onLevelChange,
  allColumns,
  columns,
  visibleColumnKeys,
  onToggleColumn,
  onShowAllColumns,
  onResetDefaultColumns,
  sortBy,
  sortDir,
  onSort,
  sortedRows,
  avgRoas,
  totals,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [pickerOpen]);

  const minWidth = Math.max((columns.length + 1) * 140, 720);

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {Object.entries(levelLabels).map(([key, label]) => (
            <Button key={key} variant={level === key ? "contained" : "outlined"} size="small" onClick={() => onLevelChange(key)}>
              {label}
            </Button>
          ))}
        </div>

        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen((open) => !open)}
            className="rounded-full border border-slate-300/40 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Columnas
          </button>
          {pickerOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-[360px] rounded-xl border border-slate-300/30 bg-neutral-900/95 p-3 shadow-lg">
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onShowAllColumns}
                  className="rounded-md border border-slate-300/40 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  Mostrar todo
                </button>
                <button
                  type="button"
                  onClick={onResetDefaultColumns}
                  className="rounded-md border border-slate-300/40 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  Restaurar default
                </button>
              </div>
              <div className="flex max-h-56 flex-wrap gap-2 overflow-auto pr-1 text-xs">
                {allColumns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-1 rounded-full border border-slate-300/30 bg-white/5 px-2 py-1 text-xs text-slate-200 transition hover:bg-white/10"
                  >
                    <input
                      id={`kpi-column-${col.key}`}
                      name={`kpi-column-${col.key}`}
                      type="checkbox"
                      className="accent-sky-600"
                      checked={visibleColumnKeys.includes(col.key)}
                      onChange={() => onToggleColumn(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="app-scrollbar w-full flex-1 min-h-[55vh] max-h-[55vh] overflow-x-auto overflow-y-auto">
        <TableContainer component={Paper} elevation={0} sx={{ background: "transparent !important" }}>
          <Table
            size="small"
            sx={{
              minWidth,
              "& .MuiTableCell-root": { borderBottom: "1px solid rgb(41, 41, 41)", fontSize: { xs: "0.82rem", md: "0.8rem" } },
              "& .MuiTableHead-root": { backgroundColor: "rgb(0, 0, 0)", borderBottom: "2px solid rgb(41, 41, 41)" },
              "& .MuiTableRow-root:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
              "& .MuiTableCell-head": { color: "white", fontWeight: "bold" },
              "& .MuiTableCell-body": { color: "white" },
              "& .MuiTableSortLabel-root": { color: "white !important" },
              "& .MuiTableSortLabel-icon": { color: "white !important" },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: sortBy === "nombre" ? "rgba(255,255,255,0.08)" : "transparent" }}>
                  <TableSortLabel active={sortBy === "nombre"} direction={sortBy === "nombre" ? sortDir : "asc"} onClick={() => onSort("nombre")}>
                    {levelLabels[level]}
                  </TableSortLabel>
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align || "left"} sx={{ backgroundColor: sortBy === col.key ? "rgba(255,255,255,0.08)" : "transparent" }}>
                    <TableSortLabel active={sortBy === col.key} direction={sortBy === col.key ? sortDir : "asc"} onClick={() => onSort(col.key)}>
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.nombre}</TableCell>
                  {columns.map((col) => {
                    if (col.key === "roas") {
                      const pct = avgRoas ? Math.min(100, (Number(row.roas || 0) / avgRoas) * 50) : 0;
                      return (
                        <TableCell key={`${row.id}-${col.key}`} align={col.align || "left"}>
                          <div className={`rounded px-2 py-1 ${roasTone(Number(row.roas || 0))}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span>{col.format(row[col.key])}</span>
                              <span className="text-[10px] opacity-80">vs avg</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full rounded bg-white/10">
                              <div className="h-1.5 rounded bg-cyan-400" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </TableCell>
                      );
                    }
                    if (col.key === "cpa") {
                      return (
                        <TableCell key={`${row.id}-${col.key}`} align={col.align || "left"}>
                          <div className={`rounded px-2 py-1 ${cpaTone(Number(row.cpa || 0))}`}>{col.format(row[col.key])}</div>
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell key={`${row.id}-${col.key}`} align={col.align || "left"}>
                        {col.format ? col.format(row[col.key]) : row[col.key]}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}

              <TableRow sx={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                <TableCell sx={{ fontWeight: 700 }}>Total general</TableCell>
                {columns.map((col) => (
                  <TableCell key={`total-${col.key}`} align={col.align || "left"} sx={{ fontWeight: 700 }}>
                    {col.format ? col.format(totals[col.key]) : totals[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </section>
  );
}
