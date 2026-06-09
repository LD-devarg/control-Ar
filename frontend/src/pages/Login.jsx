import { useState } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useNavigate } from "react-router-dom";
import "../assets/css/Login.css";
import { useTheme } from "@mui/material/styles";
import { login } from "../services/auth";
import { getDefaultPath } from "../services/access";
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import { motion } from "motion/react";

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
  const [loginMode, setLoginMode] = useState("erp"); // 'erp' o 'crm'
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError("");
    try {
      if (loginMode === "crm") {
        sessionStorage.setItem("redirect_after_login", "/crm");
      } else {
        sessionStorage.removeItem("redirect_after_login");
      }
      const user = await login(username, password);
      if (loginMode === "crm") {
        navigate("/crm");
      } else {
        navigate(getDefaultPath(user));
      }
    } catch (err) {
      setError("Usuario o contraseña inválidos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative flex flex-col justify-center items-center min-h-screen w-full px-4 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-black transition-colors duration-500'>
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Main card container */}
      <div className="w-full max-w-[400px] bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        {/* Logo */}
        <img
          src={isDarkMode ? LogoLight : LogoDark}
          className='h-20 w-auto mb-6 object-contain rounded-xl'
          alt="Logo Control-AR"
        />

        {/* Tab Switcher */}
        <div className="relative flex p-1 bg-slate-100 dark:bg-zinc-800/50 rounded-full w-full mb-6 border border-slate-200/50 dark:border-zinc-700/50">
          <button
            type="button"
            onClick={() => setLoginMode("erp")}
            className="relative z-10 w-1/2 py-2 text-sm font-bold rounded-full transition-colors duration-300 cursor-pointer text-center"
            style={{ color: loginMode === "erp" ? "#ffffff" : (isDarkMode ? "#a1a1aa" : "#4b5563") }}
          >
            {loginMode === "erp" && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-[#1976d2] rounded-full -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            ERP
          </button>
          <button
            type="button"
            onClick={() => setLoginMode("crm")}
            className="relative z-10 w-1/2 py-2 text-sm font-bold rounded-full transition-colors duration-300 cursor-pointer text-center"
            style={{ color: loginMode === "crm" ? "#ffffff" : (isDarkMode ? "#a1a1aa" : "#4b5563") }}
          >
            {loginMode === "crm" && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-[#1976d2] rounded-full -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            CRM
          </button>
        </div>

        {/* Dynamic description */}
        <div className="text-center mb-6 h-12 flex items-center justify-center">
          <motion.p
            key={loginMode}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-slate-500 dark:text-zinc-400 font-medium px-4"
          >
            {loginMode === "erp"
              ? "Inicia sesión en la plataforma de gestión empresarial (ERP)"
              : "Inicia sesión y accede directamente al panel de CRM y WhatsApp"}
          </motion.p>
        </div>

        {/* Login Form */}
        <Box
          component="form"
          noValidate
          autoComplete="off"
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-4"
        >
          <TextField
            required
            sx={fieldSx}
            id="standard-required"
            label="Ingrese su usuario"
            variant="standard"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
          />
          <TextField
            required
            sx={fieldSx}
            id="standard-password-input"
            label="Ingrese su contraseña"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            variant="standard"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowPassword((prev) => !prev)}
                    onMouseDown={(event) => event.preventDefault()}
                    sx={{ color }}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {error && (
            <motion.span
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-xs text-red-500 font-medium mt-1 text-center"
            >
              {error}
            </motion.span>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-3 px-4 rounded-xl bg-[#1976d2] hover:bg-[#1565c0] active:scale-[0.98] text-white font-semibold transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none disabled:scale-100 cursor-pointer mt-4"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </Box>
      </div>

      {/* Footer */}
      <footer className='absolute bottom-6 w-full text-center flex flex-col gap-2 items-center px-4'>
        <p className='text-xs text-slate-500 dark:text-zinc-600 font-medium'>
          &copy; 2026 Control-AR. Todos los derechos reservados.
        </p>
        <span className='text-[10px] text-slate-400 dark:text-zinc-700 font-medium uppercase tracking-wider'>
          Desarrollado por LD.dev
        </span>
      </footer>
    </div>
  );
}

export default Login;
