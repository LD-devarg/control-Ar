import * as React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import "../assets/css/Form.css";
import UploadButton from './UploadButton';

const usuarios = [
  { label: "Usuario A" },
  { label: "Usuario B" },
  { label: "Usuario C" },
];

export default function FormCompra() {
  return (
    <Stack spacing={2} className="form-stack">
        <Autocomplete
        disablePortal
        id="combo-box-demo"
        options={usuarios}
        className="form-autocomplete"
        renderInput={(params) => <TextField {...params} label="Seleccione el username" />}
      />
        <TextField id="outlined-basic" label="Monto" variant="outlined" fullWidth type='number'/>
        <UploadButton />
        <Button variant="outlined">Guardar</Button>
    </Stack>
  );
}
