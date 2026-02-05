import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

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
    <div className='flex flex-col w-full items-stretch pt-0 pb-5 px-5 border-1 border-gray-700 bg-neutral-900 rounded-xl shadow-lg shadow-black'>
        <h2 className="font-bold text-md my-2 text-white">Rendimientos de ventas</h2>
        <TableContainer component={Paper} elevation={0}
        sx={{
          background: "transparent !important"
        }}
        >
        <Table className="w-full border-collapse-separate border-spacing-0 table-fixed" size="small" aria-label="a dense table"
        sx={{
          '& .MuiTableCell-root': {
            borderBottom: '1px solid rgb(41, 41, 41)',
            fontSize: {xs: '0.875rem', md: '0.8rem'},
          },
          '& .MuiTableHead-root': { 
            backgroundColor: 'rgb(0, 0, 0)',
            borderBottom: '2px solid rgb(41, 41, 41)',
            fontSize: {xs: '0.92rem', md: '0.875rem'},
           },
          '& .MuiTableRow-root:hover': { 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
           },
          '& .MuiTableCell-head': {
            color: 'white',
            fontWeight: 'bold',
            fontSize: {xs: '0.92rem', md: '0.875rem'},
          },
          '& .MuiTableCell-body': {
            color: 'white',
            fontSize: {xs: '0.875rem', md: '0.8rem'},
          },

        }}
        >
            <colgroup>
              <col className="w-1/2 md:w-1/3" />
              <col className="w-1/6" />
              <col className="w-1/6" />
              <col className="w-1/6" />
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
