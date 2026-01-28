import logo from '../assets/img/controlar_fondo_negro.png';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { useNavigate } from 'react-router-dom';
import '../assets/css/Login.css';

function Login() {
  const navigate = useNavigate();

  return (
    <div className='login-page'>
        <img src={logo} className='logo' alt="Logo Control-AR" />
        <div className='form-login'>
            <Box
            component="form"
            sx={{ '& .MuiTextField-root': { m: 1, width: '25ch' } }}
            noValidate
            autoComplete="off"
            >
            <TextField
                className='field'
                required
                id="standard-required"
                label="Ingrese su usuario"
                variant="standard"
            />
            <TextField
                required
                className='field'
                id="standard-password-input"
                label="Ingrese su contrasena"
                type="password"
                autoComplete="current-password"
                variant="standard"
            />
            </Box>
        </div>
        <Stack spacing={2} direction="row" sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={() => navigate('/home')}>
            Iniciar sesion
          </Button>
        </Stack>
    </div>
  )
}

export default Login
