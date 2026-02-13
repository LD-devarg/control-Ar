import { useState } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { useNavigate } from "react-router-dom";
import "../assets/css/Login.css";
import { useTheme } from "@mui/material/styles";
import { login } from "../services/auth";
import { getDefaultPath } from "../services/access";

function Login() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const LogoDark = '/controlar_fondo_blanco.png';
  const LogoLight = '/controlar_fondo_negro.png';
  const color = isDarkMode ? '#e9eef5' : '#000000';
  const labelColor = isDarkMode ? 'rgba(233, 238, 245, 0.8)' : 'rgba(0, 0, 0, 0.7)';
  const borderColor = isDarkMode ? 'rgba(233, 238, 245, 0.4)' : 'rgba(0, 0, 0, 0.35)';
  const borderHoverColor = isDarkMode ? 'rgba(233, 238, 245, 0.7)' : 'rgba(0, 0, 0, 0.6)';
  const fieldSx = {
    '& .MuiInputBase-input': {
      color,
    },
    '& .MuiInputLabel-root': {
      color: labelColor,
    },
    '& .MuiInput-underline:before': {
      borderBottomColor: borderColor,
    },
    '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
      borderBottomColor: borderHoverColor,
    },
    '& .MuiInput-underline:after': {
      borderBottomColor: '#1976d2',
    },
    '& .MuiFormLabel-root.Mui-focused': {
      color: '#1976d2',
    },
  };
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError("");
    try {
      const user = await login(username, password);
      navigate(getDefaultPath(user));
    } catch (err) {
      setError("Usuario o contraseña inválidos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col justify-start items-center min-h-screen h-full bg-white dark:bg-black'>
      <img src={isDarkMode ? LogoLight : LogoDark} className='text-center mb-5 h-50 w-50' alt="Logo Control-AR" />
      <div className='form-login flex flex-col justify-center items-center bg-neutral-100 dark:bg-zinc-900 p-6 rounded-2xl shadow-lg w-80'>
        <Box
          component="form"
          sx={{
            '& .MuiTextField-root': {
              m: 1,
              width: '25ch',
            },
          }}
          noValidate
          autoComplete="off"
          onSubmit={handleSubmit}
        >
          <TextField
            required
            sx={fieldSx}
            id="standard-required"
            label="Ingrese su usuario"
            variant="standard"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            required
            sx={fieldSx}
            id="standard-password-input"
            label="Ingrese su contrasena"
            type="password"
            autoComplete="current-password"
            variant="standard"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? (
            <span className="text-xs text-red-600 mt-2">{error}</span>
          ) : null}
        </Box>
      </div>
      <Stack spacing={2} direction="row" sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={handleSubmit} disabled={loading || !username || !password}>
          {loading ? "Ingresando..." : "Iniciar sesion"}
        </Button>
      </Stack>
      <footer className='absolute bottom-2 w-full text-center flex flex-col gap-1 items-center'>
        <p className='text-sm text-zinc-700 dark:text-gray-500'>&copy; 2026 Control-AR. Todos los derechos reservados.</p>
        <span className='text-sm text-zinc-700 dark:text-gray-500'>Desarrollado por LD.dev</span>
      </footer>
    </div>
  )
}

export default Login
