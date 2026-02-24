import { useEffect, useMemo, useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

const COLUMN_SETS = {
  Bms: [
    { key: 'name', label: 'Nombre' },
    { key: 'metaId', label: 'Meta_ID' },
    { key: 'status', label: 'Estado' },
  ],
  'Ad Accounts': [
    { key: 'name', label: 'Nombre' },
    { key: 'bm', label: 'Bm' },
    { key: 'metaId', label: 'Meta_ID' },
    { key: 'currency', label: 'Moneda' },
    { key: 'status', label: 'Estado' },
  ],
  FanPage: [
    { key: 'name', label: 'Nombre' },
    { key: 'metaId', label: 'Meta_ID' },
    { key: 'status', label: 'Estado' },
  ],
  Campaigns: [
    { key: 'name', label: 'Nombre' },
    { key: 'adAccount', label: 'Ad Account' },
    { key: 'metaId', label: 'Meta_ID' },
    { key: 'createdAt', label: 'Fecha de creación' },
    { key: 'objective', label: 'Objetivo' },
    { key: 'status', label: 'Estado' },
  ],
  Adsets: [
    { key: 'name', label: 'Nombre' },
    { key: 'campaign', label: 'Campaign' },
    { key: 'metaId', label: 'Meta_ID' },
    { key: 'budget', label: 'Presupuesto' },
    { key: 'createdAt', label: 'Fecha de Creación' },
    { key: 'location', label: 'Ubicación' },
    { key: 'region', label: 'Región' },
    { key: 'conversionSite', label: 'Sitio de Conversión' },
    { key: 'ageRange', label: 'Rango Edad' },
    { key: 'gender', label: 'Sexo' },
    { key: 'targeting', label: 'Segmentación' },
    { key: 'status', label: 'Estado' },
  ],
  Assets: [
    { key: 'name', label: 'Nombre' },
    { key: 's3_url', label: 'S3 URL' },
    { key: 'metaAssetId', label: 'Meta_ID' },
    { key: 'type', label: 'Tipo' },
    { key: 'status', label: 'Estado' },
  ],
  Creatives: [
    { key: 'name', label: 'Nombre' },
    { key: 'fanpage', label: 'Fanpage' },
    { key: 'instagram_account', label: 'Cuenta de Instagram' },
    { key: 'primary_text', label: 'Texto' },
    { key: 'headline', label: 'Titulo' },
    { key: 'description', label: 'Descripcion' },
    { key: 'metaId', label: 'Meta_ID' },
    { key: 'url_destino', label: 'URL Destino' },
    { key: 'asset', label: 'Asset_ID' },
    { key: 'cta', label: 'CTA' },
    { key: 'status', label: 'Estado' },
  ],
  Ads: [
    { key: 'name', label: 'Nombre' },
    { key: 'adset', label: 'Adset' },
    { key: 'metaId', label: 'Meta_ID' },
    { key: 'text', label: 'Texto' },
    { key: 'title', label: 'Titulo' },
    { key: 'image', label: 'Imagen' },
    { key: 'status', label: 'Estado' },
  ],
};

export default function TablaPauta({
  view = 'Bms',
  rowsByView,
  visibleColumns,
  hiddenColumns,
  enableColumnPicker = true,
  renderRowActions,
}) {
  const baseColumns = COLUMN_SETS[view] ?? COLUMN_SETS.Bms;
  const rows = rowsByView?.[view] ?? [];
  const [selectedByView, setSelectedByView] = useState({});
  const [targetingDialog, setTargetingDialog] = useState({ open: false, content: '' });

  useEffect(() => {
    setSelectedByView((prev) => {
      if (prev[view]) return prev;
      return {
        ...prev,
        [view]: baseColumns.map((col) => col.key),
      };
    });
  }, [view, baseColumns]);

  const selectedKeys = selectedByView[view] ?? baseColumns.map((col) => col.key);

  const columns = useMemo(() => {
    let cols = baseColumns;
    if (Array.isArray(visibleColumns) && visibleColumns.length > 0) {
      cols = cols.filter((col) => visibleColumns.includes(col.key));
      return cols;
    }
    if (Array.isArray(hiddenColumns) && hiddenColumns.length > 0) {
      cols = cols.filter((col) => !hiddenColumns.includes(col.key));
      return cols;
    }
    if (enableColumnPicker) {
      cols = cols.filter((col) => selectedKeys.includes(col.key));
    }
    return cols;
  }, [baseColumns, enableColumnPicker, hiddenColumns, selectedKeys, visibleColumns]);

  const minWidth = Math.max(columns.length * 160, 640);

  const handleToggle = (key) => {
    setSelectedByView((prev) => {
      const current = prev[view] ?? baseColumns.map((col) => col.key);
      const next = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key];
      if (next.length === 0) {
        return prev;
      }
      return { ...prev, [view]: next };
    });
  };

  const openTargetingDialog = (value) => {
    let parsed = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = value;
      }
    }
    const content = typeof parsed === 'string' ? parsed : JSON.stringify(parsed || {}, null, 2);
    setTargetingDialog({ open: true, content });
  };

  const closeTargetingDialog = () => setTargetingDialog({ open: false, content: '' });

  const getCellValue = (row, columnKey) => {
    if (columnKey === 'budget') {
      return row.budget ?? row.presupuesto_diario ?? '-';
    }
    if (columnKey === 'targeting') {
      const value = row[columnKey];
      if (!value || value === '-') return '-';
      return (
        <Button size="small" variant="outlined" onClick={() => openTargetingDialog(value)}>
          Ver
        </Button>
      );
    }
    return row[columnKey] ?? '-';
  };

  return (
    <div className="flex w-full flex-col items-stretch rounded-xl border border-slate-300/60 bg-white/60 p-3 text-slate-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
      {enableColumnPicker && !visibleColumns && !hiddenColumns ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500 dark:text-zinc-400">
            Columnas:
          </span>
          {baseColumns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/70 px-2 py-1 text-xs text-slate-600 transition hover:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <input
                id={`tabla-pauta-column-${view}-${col.key}`}
                name={`tabla-pauta-column-${view}-${col.key}`}
                type="checkbox"
                className="accent-sky-600"
                checked={selectedKeys.includes(col.key)}
                onChange={() => handleToggle(col.key)}
              />
              {col.label}
            </label>
          ))}
        </div>
      ) : null}
      <div className="app-scrollbar w-full max-h-[52vh] overflow-auto">
        <TableContainer component={Paper} elevation={0} sx={{ background: 'transparent !important' }}>
        <Table
          className="w-full border-collapse-separate border-spacing-0"
          size="small"
          aria-label="tabla de pauta"
          sx={{
            minWidth,
            tableLayout: 'auto',
            '& .MuiTableCell-root': {
              borderBottom: '1px solid rgba(120,120,120,0.25)',
              fontSize: { xs: '0.8rem', md: '0.78rem' },
              padding: '10px 12px',
              whiteSpace: 'nowrap',
            },
            '& .MuiTableHead-root': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              borderBottom: '1px solid rgba(120,120,120,0.35)',
            },
            '& .MuiTableRow-root:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
            },
            '& .MuiTableCell-head': {
              color: 'inherit',
              fontWeight: 700,
              fontSize: { xs: '0.82rem', md: '0.8rem' },
            },
            '& .MuiTableCell-body': {
              color: 'inherit',
              fontSize: { xs: '0.8rem', md: '0.78rem' },
            },
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key}>{col.label}</TableCell>
              ))}
              {renderRowActions ? <TableCell align="right">Acciones</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(columns.length + (renderRowActions ? 1 : 0), 1)} align="center">
                  Sin datos
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={row.id ?? `${view}-${idx}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>{getCellValue(row, col.key)}</TableCell>
                  ))}
                  {renderRowActions ? <TableCell align="right">{renderRowActions(row)}</TableCell> : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </TableContainer>
      </div>
      <Dialog open={targetingDialog.open} onClose={closeTargetingDialog} fullWidth maxWidth="md">
        <DialogTitle>Segmentacion</DialogTitle>
        <DialogContent>
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-slate-100 p-3 text-xs text-slate-800">
            {targetingDialog.content}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
