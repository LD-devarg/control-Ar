import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import "../assets/css/FormLeads.css";
import { motion } from "motion/react";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';


export default function NuevoCliente() {
    return (
        <div className="form-leads-container">
            <h3>Contactanos</h3>
            <Stack spacing={3} direction="column" className="form-leads-stack">
                <TextField
                className='textfield'
                required
                id="nombre"
                label="Nombre"
                variant="outlined"
                fullWidth
                sx={{
                    "& .MuiOutlinedInput-root": {
                        marginBottom: "10px",
                    borderRadius: "50px",
                    backgroundColor: "rgba(217, 221, 88, 0.12)",
                    "& fieldset": { borderColor: "rgba(251, 255, 20, 0.8)" },
                    "&:hover fieldset": { borderColor: "#fff" },
                    "&.Mui-focused fieldset": { borderColor: "#fff" },
                    },
                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.85)" },
                    "& .MuiInputBase-input": { color: "#fff" },
                }}
                />
                <TextField
                    required
                    helperText="No compartiremos tu número con nadie."
                    id="celular"
                    label="Celular"
                    fullWidth
                    sx={{
                        "& .MuiOutlinedInput-root": {
                        marginBottom: "10px",
                            borderRadius: "50px",
                            backgroundColor: "rgba(217, 221, 88, 0.12)",
                            "& fieldset": { borderColor: "rgba(251, 255, 20, 0.8)",
                             },
                        "&:hover fieldset": { borderColor: "#fff" },
                        "&.Mui-focused fieldset": { borderColor: "#fff" },
                        },
                        "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.85)" },
                        "& .MuiInputBase-input": { color: "#fff" },
                        "& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.6)" },
                    }}
                    />
            </Stack>
            <motion.div
                className=""
                animate={{ 
                    scale: [1, 1.5, 1], }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
                startIcon="🚀"
                >
                <Button variant="contained" startIcon={<WhatsAppIcon />}
                sx={{
                    backgroundColor: "transparent",
                    marginTop: "10px",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "50px",
                    padding: "10px 30px",
                    fontWeight: "bold",
                    fontSize: "1rem",
                    background: "linear-gradient(90deg, #09671f 0%, #6aff65 100%)",
                    boxShadow: "0 4px 15px rgba(255, 203, 13, 0.4), 0 2px 5px rgba(0, 0, 0, 0.2)",
                    "&:hover": {
                        backgroundColor: "transparent",
                    },
                }}
                >
                    JUGÁ AHORA
                </Button>
            </motion.div>
            <span className='subtext'>🤳Atención personalizada las 24hs.</span>
        </div>);
}