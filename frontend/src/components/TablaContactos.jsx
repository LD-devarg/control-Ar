import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { TableVirtuoso } from 'react-virtuoso';
import '../assets/css/TablaContactos.css';
import { clearClientesCache, fetchClientes } from '../services/operativo/clientes';
import TableSortLabel from '@mui/material/TableSortLabel';
import Pagination from '@mui/material/Pagination';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useTenant } from '../context/TenantContext';
import { apiClient } from '../services/auth';

const baseColumns = [
  {
    width: 120,
    label: 'Codigo',
    dataKey: 'codigo',
  },
  {
    width: 180,
    label: 'Nombre',
    dataKey: 'nombre',
  },
  {
    width: 140,
    label: 'Contacto',
    dataKey: 'contacto',
  },
  {
    width: 160,
    label: 'Username',
    dataKey: 'username',
  },
  {
    width: 150,
    label: 'Cant. Compras',
    dataKey: 'cant_compras',
    numeric: true,
  },
  {
    width: 160,
    label: 'Compras USD',
    dataKey: 'total_compras_usd',
    numeric: true,
  },
  {
    width: 140,
    label: 'Bonos USD',
    dataKey: 'total_bonos_usd',
    numeric: true,
  },
  {
    width: 150,
    label: 'Cant. Retiros',
    dataKey: 'cant_retiros',
    numeric: true,
  },
  {
    width: 160,
    label: 'Retiros USD',
    dataKey: 'total_retiros_usd',
    numeric: true,
  },
];

const VirtuosoTableComponents = {
  Scroller: React.forwardRef((props, ref) => (
    <TableContainer
      component={Paper}
      className="tabla-contactos"
      elevation={0}
      sx={{ backgroundColor: 'transparent', backgroundImage: 'none' }}
      {...props}
      ref={ref}
    />
  )),
  Table: (props) => (
    <Table
      {...props}
      sx={{
        borderCollapse: 'separate',
        tableLayout: 'fixed',
      }}
    />
  ),
  TableHead: React.forwardRef((props, ref) => <TableHead {...props} ref={ref} />),
  TableRow,
  TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
};

export default function TablaContactos() {
  const { features } = useTenant();
  const showWalletColumns = Boolean(features?.net_metrics);
  const editableKeys = React.useMemo(() => new Set(['nombre', 'contacto', 'username']), []);
  const [search, setSearch] = React.useState('');
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;
  const [sortKey, setSortKey] = React.useState('');
  const [sortDir, setSortDir] = React.useState('desc');
  const [editingCell, setEditingCell] = React.useState(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [toast, setToast] = React.useState({ open: false, severity: 'success', message: '' });

  const columns = React.useMemo(() => {
    if (showWalletColumns) return baseColumns;
    return baseColumns.filter(
      (column) =>
        !["cant_compras", "total_bonos_usd", "cant_retiros", "total_retiros_usd"].includes(column.dataKey)
    );
  }, [showWalletColumns]);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchClientes();
        if (mounted) setRows(data || []);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (!normalizedSearch) return true;

        return (
        row.codigo?.toLowerCase().includes(normalizedSearch) ||
        row.nombre?.toLowerCase().includes(normalizedSearch) ||
        row.username?.toLowerCase().includes(normalizedSearch) ||
        row.contacto?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [search, rows]);

  const sortedRows = React.useMemo(() => {
    if (!sortKey) return filteredRows;
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      const col = columns.find((c) => c.dataKey === sortKey);
      const isNumeric = Boolean(col?.numeric);
      const aVal = a?.[sortKey];
      const bVal = b?.[sortKey];
      if (isNumeric) {
        const aNum = Number(aVal ?? 0);
        const bNum = Number(bVal ?? 0);
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      }
      const aStr = String(aVal ?? '').toLowerCase();
      const bStr = String(bVal ?? '').toLowerCase();
      if (aStr === bStr) return 0;
      if (sortDir === 'asc') return aStr > bStr ? 1 : -1;
      return aStr < bStr ? 1 : -1;
    });
    return sorted;
  }, [filteredRows, sortKey, sortDir, columns]);

  React.useEffect(() => {
    if (!sortKey) return;
    const exists = columns.some((column) => column.dataKey === sortKey);
    if (!exists) {
      setSortKey('');
    }
  }, [columns, sortKey]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageSafe = Math.min(page, pageCount);
  const pagedRows = React.useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, pageSafe]);

  const formatValue = (column, value) => {
    if (value == null) return '';
    if (column.dataKey === 'cant_compras' || column.dataKey === 'cant_retiros') {
      const num = Number(value);
      if (Number.isNaN(num)) return value;
      return String(Math.trunc(num));
    }
    if (
      column.dataKey === 'total_compras_usd' ||
      column.dataKey === 'total_bonos_usd' ||
      column.dataKey === 'total_retiros_usd'
    ) {
      const num = Number(value);
      if (Number.isNaN(num)) return value;
      return num.toFixed(2);
    }
    return value;
  };

  const handleSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('desc');
      return;
    }
    setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleRefresh = async () => {
    clearClientesCache();
    setLoading(true);
    try {
      const data = await fetchClientes();
      setRows(data || []);
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity, message) => {
    setToast({ open: true, severity, message });
  };

  const startEdit = (row, key) => {
    if (!editableKeys.has(key)) return;
    setEditingCell({ rowId: row.id, key });
    setEditingValue(String(row?.[key] ?? ''));
  };

  const cancelEdit = React.useCallback(() => {
    setEditingCell(null);
    setEditingValue('');
  }, []);

  const saveEdit = React.useCallback(async () => {
    if (!editingCell) return;
    const row = rows.find((item) => item.id === editingCell.rowId);
    if (!row) {
      cancelEdit();
      return;
    }

    const nextValue = editingValue.trim();
    const currentValue = String(row?.[editingCell.key] ?? '').trim();
    if (nextValue === currentValue) {
      cancelEdit();
      return;
    }

    setSaving(true);
    try {
      const { data } = await apiClient.patch(`/clientes/${row.id}/`, {
        [editingCell.key]: nextValue,
      });
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...data } : item)));
      clearClientesCache();
      showToast('success', 'Cliente actualizado.');
      cancelEdit();
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        Object.values(error?.response?.data || {}).flat().find((value) => typeof value === 'string') ||
        'No se pudo actualizar el cliente.';
      showToast('error', detail);
    } finally {
      setSaving(false);
    }
  }, [cancelEdit, editingCell, editingValue, rows]);

  const renderCellContent = (row, column) => {
    const isEditable = editableKeys.has(column.dataKey);
    const isEditing = editingCell?.rowId === row.id && editingCell?.key === column.dataKey;
    const value = formatValue(column, row[column.dataKey]);

    if (!isEditable) {
      return value;
    }

    if (isEditing) {
      return (
        <input
          autoFocus
          className="tabla-contactos-inline-input"
          value={editingValue}
          onChange={(event) => setEditingValue(event.target.value)}
          onBlur={saveEdit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              saveEdit();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              cancelEdit();
            }
          }}
          disabled={saving}
        />
      );
    }

    return (
      <button
        type="button"
        className="tabla-contactos-inline-button"
        onClick={() => startEdit(row, column.dataKey)}
        title="Click para editar"
      >
        {value || <span className="tabla-contactos-empty">Completar</span>}
      </button>
    );
  };

  return (
    <Paper elevation={0} style={{ height: 550, width: '100%', padding: '16px', color: '#e7e9ef', backgroundColor: 'transparent' }}>
      <div className="tabla-contactos-layout">
        <div className="tabla-contactos-filters">
          <input
            id="tabla-contactos-search"
            name="tabla-contactos-search"
            aria-label="Buscar contactos"
            className="tabla-contactos-input"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por codigo, nombre, username o contacto..."
          />
          <button
            type="button"
            className="tabla-contactos-clear"
            onClick={() => {
              setSearch('');
            }}
          >
            Limpiar
          </button>
          <button
            type="button"
            className="tabla-contactos-clear"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Actualizando...' : 'Refresh'}
          </button>
        </div>

        <div className="tabla-contactos-table-wrap">
          <TableVirtuoso
            data={pagedRows}
            components={VirtuosoTableComponents}
            fixedHeaderContent={() => (
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.dataKey}
                    variant="head"
                    align={column.numeric || false ? 'right' : 'left'}
                    style={{ width: column.width }}
                    sx={{ backgroundColor: '#111217', color: '#d6d8e0', borderBottom: '1px solid #2f313a' }}
                  >
                    <TableSortLabel
                      active={sortKey === column.dataKey}
                      direction={sortKey === column.dataKey ? sortDir : 'asc'}
                      onClick={() => handleSort(column.dataKey)}
                      sx={{ color: 'inherit' }}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            )}
            itemContent={(_index, row) => (
              <React.Fragment>
                {columns.map((column) => (
                  <TableCell
                    key={column.dataKey}
                    align={column.numeric || false ? 'right' : 'left'}
                    className="tabla-contactos-cell"
                  >
                    {renderCellContent(row, column)}
                  </TableCell>
                ))}
              </React.Fragment>
            )}
            increaseViewportBy={{ top: 200, bottom: 400 }}
          />
        </div>
        <div className="tabla-contactos-pagination">
          <span className="tabla-contactos-count">
            Mostrando {(pageSafe - 1) * pageSize + 1}-{Math.min(pageSafe * pageSize, sortedRows.length)} de {sortedRows.length}
          </span>
          <Pagination
            count={pageCount}
            page={pageSafe}
            onChange={(_e, value) => setPage(value)}
            color="primary"
            size="small"
          />
        </div>
        {loading ? <div className="tabla-contactos-loading">Cargando...</div> : null}
      </div>
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
