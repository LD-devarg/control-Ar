import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import '../assets/css/TablaPorcentajes.css';

function createData(name, expected, actual, diferences) {
  return { name, expected, actual, diferences };
}

const rows = [
  createData('ROAS', 0.8, 1.2, -0.4),
  createData('Ratio de Conversión', 0.34, 0.4, -0.06),
  createData('CPL', 12.8, 16.0, -3.2),
  createData('CPC', 11.4, 10.5, -0.9),
  createData('Promedio De Compra', 12.3, 9.5, 2.8),
];

export default function TablaKPI() {
  return (
    <div className='table-kpi-container'>
        <h2 className="table-kpi-title">Rendimientos de ventas</h2>
        <TableContainer component={Paper} className="table-kpi-surface" elevation={0}>
        <Table className="table-kpi-table" size="small" aria-label="a dense table">
            <colgroup>
              <col className="table-kpi-col-kpi" />
              <col className="table-kpi-col-num" />
              <col className="table-kpi-col-num" />
              <col className="table-kpi-col-num" />
            </colgroup>
            <TableHead>
            <TableRow>
                <TableCell >KPIs</TableCell>
                <TableCell align="right">Expected</TableCell>
                <TableCell align="right">Actual</TableCell>
                <TableCell align="right">Differences</TableCell>
            </TableRow>
            </TableHead>
            <TableBody>
            {rows.map((row) => (
                <TableRow key={row.name}>
                <TableCell component="th" scope="row">
                    {row.name}
                </TableCell>
                <TableCell align="right" type='number' >{row.expected}</TableCell>
                <TableCell align="right" type='number' >{row.actual}</TableCell>
                <TableCell align="right" type='number' >{row.diferences}</TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </TableContainer>
    </div>
  );
}
