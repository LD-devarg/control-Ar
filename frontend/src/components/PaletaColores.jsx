import { Box } from '@mui/material';
import '../assets/css/PaletaColores.css';

const colors = ['#fffb00', '#17691f', '#fa0000', '#9413bb', '#0d6efd', '#ff6600', '#000000', '#ffffff'];

function PaletaColores({ color, setColor }) {
  return (
        <div className="paleta-colores">
            <h4>Elegí el color</h4>
            <Box sx={{ display: 'flex', gap: 1 }}>
            {colors.map((c) => (
                <Box
                key={c}
                sx={{
                    width: 20,
                    height: 20,
                    bgcolor: c,
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: color === c ? '2px solid black' : '1px solid #ccc'
                }}
                onClick={() => setColor(c)}
                />
            ))}
            </Box>
        </div>
    );
}
export default PaletaColores;