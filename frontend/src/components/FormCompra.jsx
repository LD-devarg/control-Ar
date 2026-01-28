import * as React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import "../assets/css/Form.css";

const productos = [
  { label: "Producto A" },
  { label: "Producto B" },
  { label: "Producto C" },
];

export default function FormCompra() {
  return (
    <Stack spacing={2} className="form-stack">
        <Autocomplete
        disablePortal
        id="combo-box-demo"
        options={productos}
        className="form-autocomplete"
        renderInput={(params) => <TextField {...params} label="Seleccione un producto" />}
      />
        <TextField id="outlined-basic" label="Cantidad" variant="outlined" />
        <TextField id="outlined-basic" label="Precio Unitario" variant="outlined" />
        <Button variant="outlined">Guardar</Button>
    </Stack>
  );
}
