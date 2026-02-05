import * as React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import "../assets/css/Form.css";
import UploadButton from './UploadButton';
import { useTheme } from '@mui/material/styles';

const usuarios = [
  { label: "Usuario A" },
  { label: "Usuario B" },
  { label: "Usuario C" },
];

export default function FormCompra() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const color = isDarkMode ? '#f4f4f5' : '#000000';
  const fieldSx = {
    '& .MuiInputBase-input': { color },
    '& .MuiInputLabel-root': { color },
    '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '&:hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: color },
    '& .MuiSvgIcon-root': { color },
  };

  return (
    <Stack spacing={2} className="form-stack">
        <Autocomplete
        disablePortal
        id="combo-box-demo"
        options={usuarios}
        className="form-autocomplete"
        renderInput={(params) => <TextField {...params} label="Seleccione el username" sx={fieldSx} />}
      />
        <TextField id="outlined-basic" label="Monto" variant="outlined" fullWidth type='number'
        sx={fieldSx}
        />
        <UploadButton />
        <Button variant="outlined" >Guardar</Button>
    </Stack>
  );
}
