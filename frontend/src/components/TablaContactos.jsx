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

const columns = [
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
    width: 160,
    label: 'Cantidad de Compras',
    dataKey: 'cant_compras',
    numeric: true,
  },
  {
    width: 180,
    label: 'Monto Compra ARS',
    dataKey: 'total_compras_ars',
    numeric: true,
  },
  {
    width: 180,
    label: 'Monto Compra USD',
    dataKey: 'total_compras_usd',
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

function fixedHeaderContent() {
  return (
    <TableRow>
      {columns.map((column) => (
        <TableCell
          key={column.dataKey}
          variant="head"
          align={column.numeric || false ? 'right' : 'left'}
          style={{ width: column.width }}
          sx={{ backgroundColor: '#111217', color: '#d6d8e0', borderBottom: '1px solid #2f313a' }}
        >
          {column.label}
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function ReactVirtualizedTable() {
  const [search, setSearch] = React.useState('');
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;
  const [sortKey, setSortKey] = React.useState('');
  const [sortDir, setSortDir] = React.useState('desc');

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
  }, [filteredRows, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageSafe = Math.min(page, pageCount);
  const pagedRows = React.useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, pageSafe]);

  const formatValue = (column, value) => {
    if (value == null) return '';
    if (column.dataKey === 'total_compras_ars' || column.dataKey === 'total_compras_usd') {
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

  return (
    <Paper elevation={0} style={{ height: 500, width: '100%', color: '#e7e9ef', backgroundColor: 'transparent' }}>
      <div className="tabla-contactos-layout">
        <div className="tabla-contactos-filters">
          <input
            className="tabla-contactos-input"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, username o contacto..."
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
                    {formatValue(column, row[column.dataKey])}
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
    </Paper>
  );
}
