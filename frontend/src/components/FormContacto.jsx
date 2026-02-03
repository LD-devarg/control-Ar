import * as React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import "../assets/css/Form.css";

const usuarios = [
  { label: "Usuario A" },
  { label: "Usuario B" },
  { label: "Usuario C" },
];

export default function FormContacto() {
  return (
    <Stack spacing={2} className="form-stack">
        <Autocomplete
        disablePortal
        id="combo-box-demo"
        options={usuarios}
        className="form-autocomplete"
        renderInput={(params) => <TextField {...params} label="Seleccione el username" />}
      />
        <Button variant="outlined">Guardar</Button>
    </Stack>
  );
}
