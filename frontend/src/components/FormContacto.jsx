import * as React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import "../assets/css/Form.css";

const contactos = [
  { label: "Contacto A" },
  { label: "Contacto B" },
  { label: "Contacto C" },
];

export default function FormContacto() {
  return (
    <Stack spacing={2} className="form-stack">
        <Autocomplete
        disablePortal
        id="combo-box-demo"
        options={contactos}
        className="form-autocomplete"
        renderInput={(params) => <TextField {...params} label="Seleccione un contacto" />}
      />
        <Button variant="outlined">Guardar</Button>
    </Stack>
  );
}
