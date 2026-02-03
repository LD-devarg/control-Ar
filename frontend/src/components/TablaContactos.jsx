import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { TableVirtuoso } from 'react-virtuoso';
import Chance from 'chance';
import '../assets/css/TablaContactos.css';

const chance = new Chance(42);

function createData(id) {
  return {
    id,
    firstName: chance.first(),
    lastName: chance.last(),
    age: chance.age(),
    phone: chance.phone(),
    state: chance.state({ full: true }),
  };
}

const columns = [
  {
    width: 100,
    label: 'First Name',
    dataKey: 'firstName',
  },
  {
    width: 100,
    label: 'Last Name',
    dataKey: 'lastName',
  },
  {
    width: 50,
    label: 'Age',
    dataKey: 'age',
    numeric: true,
  },
  {
    width: 110,
    label: 'State',
    dataKey: 'state',
  },
  {
    width: 130,
    label: 'Phone Number',
    dataKey: 'phone',
  },
];

const rows = Array.from({ length: 200 }, (_, index) => createData(index));

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

function rowContent(_index, row) {
  return (
    <React.Fragment>
      {columns.map((column) => (
        <TableCell
          key={column.dataKey}
          align={column.numeric || false ? 'right' : 'left'}
          className="tabla-contactos-cell"
        >
          {row[column.dataKey]}
        </TableCell>
      ))}
    </React.Fragment>
  );
}

export default function ReactVirtualizedTable() {
  const [search, setSearch] = React.useState('');
  const [stateFilter, setStateFilter] = React.useState('');

  const stateOptions = React.useMemo(
    () => Array.from(new Set(rows.map((row) => row.state))).sort((a, b) => a.localeCompare(b)),
    []
  );

  const filteredRows = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesState = stateFilter ? row.state === stateFilter : true;
      if (!matchesState) return false;
      if (!normalizedSearch) return true;

      return (
        row.firstName.toLowerCase().includes(normalizedSearch) ||
        row.lastName.toLowerCase().includes(normalizedSearch) ||
        row.phone.toLowerCase().includes(normalizedSearch) ||
        row.state.toLowerCase().includes(normalizedSearch) ||
        String(row.age).includes(normalizedSearch)
      );
    });
  }, [search, stateFilter]);

  return (
    <Paper elevation={0} style={{ height: 500, width: '100%', color: '#e7e9ef', backgroundColor: 'transparent' }}>
      <div className="tabla-contactos-layout">
        <div className="tabla-contactos-filters">
          <input
            className="tabla-contactos-input"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, telefono, estado o edad..."
          />
          <select
            className="tabla-contactos-select"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
          >
            <option value="">Todos los estados</option>
            {stateOptions.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="tabla-contactos-clear"
            onClick={() => {
              setSearch('');
              setStateFilter('');
            }}
          >
            Limpiar
          </button>
        </div>

        <div className="tabla-contactos-table-wrap">
          <TableVirtuoso
            data={filteredRows}
            components={VirtuosoTableComponents}
            fixedHeaderContent={fixedHeaderContent}
            itemContent={rowContent}
            increaseViewportBy={{ top: 200, bottom: 400 }}
          />
        </div>
      </div>
    </Paper>
  );
}
