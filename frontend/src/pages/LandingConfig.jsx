import { useMemo, useState } from "react";
import "../assets/css/LandingConfig.css";
import Logo from "../assets/img/logo_meta.png";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import SaveIcon from '@mui/icons-material/Save';


function LandingConfig() {

    return (
        <div className="landing-config-layout">
            <section className="landing-config-container">
                <h1>Landing Pages</h1>
                <div className="landing-selector">
                    <Autocomplete
                        options={["Landing Page 1", "Landing Page 2", "Landing Page 3"]}
                        renderInput={(params) => <TextField {...params} label="Selecciona una landing page"
                        sx={{
                            width: 300,'& .MuiInputLabel-root': { color: 'white' },
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'white',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'white',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: 'white',
                                },
                            },
                            '& .MuiSvgIcon-root': {
                                color: 'white',
                            },
                        }} />}
                    />
                </div>
                <div className="form-config-pixel">
                    <div className="form-config-pixel-content">
                    <div className="title">
                        <img src={Logo} alt="Logo Meta" className="logo-meta"/> 
                        <h2>Configuración de Pixel</h2>
                    </div>
                        <Stack spacing={2} direction="column" className="form-config-pixel-stack">
                            <TextField
                                label="ID de Pixel"
                                variant="outlined"
                                fullWidth
                                size="small"
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        marginBottom: "10px",
                                        borderRadius: "50px",
                                        backgroundColor: "gray",
                                        "& fieldset": {
                                            borderColor: "rgba(9, 9, 9, 0.8)" },
                                        "&:hover fieldset": { borderColor: "#fff" },
                                        "&.Mui-focused fieldset": { borderColor: "#fff" },
                                    },
                                    "& .MuiInputLabel-root": {
                                        textAlign:"center",
                                        fontSize: "small",
                                        fontFamily: "Roboto, sans-serif",
                                        color: "rgba(255,255,255,0.85)" },
                                    "& .MuiInputBase-input": { color: "#fff" },
                                }}
                            />
                            <TextField
                                label="Token de Acceso"
                                type="password"
                                variant="outlined"
                                fullWidth
                                size="small"
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        marginBottom: "10px",
                                        borderRadius: "50px",
                                        backgroundColor: "gray",
                                        "& fieldset": {
                                            borderColor: "rgba(9, 9, 9, 0.8)" },
                                        "&:hover fieldset": { borderColor: "#fff" },
                                        "&.Mui-focused fieldset": { borderColor: "#fff" },
                                    },
                                    "& .MuiInputLabel-root": {
                                        textAlign:"center",
                                        fontSize: "small",
                                        fontFamily: "Roboto, sans-serif",
                                        color: "rgba(255,255,255,0.85)" },
                                    "& .MuiInputBase-input": { color: "#fff" },
                                }}
                            />
                        </Stack>
                        <Button 
                        variant="outlined"
                        startIcon={<SaveIcon />}
                        sx={{
                            marginBottom: "10px",
                        }}
                        >
                            Guardar
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default LandingConfig;
