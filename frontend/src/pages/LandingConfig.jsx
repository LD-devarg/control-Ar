import { useState } from "react";
import "../assets/css/LandingConfig.css";
import Logo from "../assets/img/logo_meta.png";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import SaveIcon from "@mui/icons-material/Save";
import Page from "../layouts/Page";
import { useTheme } from "@mui/material/styles";
import Checkbox from "@mui/material/Checkbox";
import UploadButton from "../components/UploadButton";

const LANDING_OPTIONS = ["Landing Page 1", "Landing Page 2", "Landing Page 3"];
const EMPTY_FORM = {
    nombre: "",
    url: "",
    bonoActivo: "",
    titulo: "",
    subtitulo: "",
    textoBoton: "",
    textoInfo: "",
    pixelId: "",
    tokenAcceso: "",
    backgroundVertical: null,
    backgroundHorizontal: null,
};

function LandingConfig() {
    const [selectedLanding, setSelectedLanding] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [initialForm, setInitialForm] = useState(EMPTY_FORM);
    const [activo, setActivo] = useState(false);
    const [initialActivo, setInitialActivo] = useState(false);
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === "dark";
    const color = isDarkMode ? "rgba(255,255,255,0.85)" : "rgba(9, 9, 9, 0.8)";

    const commonTextFieldSx = {
        marginBottom: "0px",
        borderRadius: "50px",
        backgroundColor: "gray",
        "& fieldset": {
            borderColor: "rgba(9, 9, 9, 0.8)",
        },
        "&:hover fieldset": { borderColor: "rgba(9, 9, 9, 0.8)",
            borderRadius: "50px",
        },
        "&.Mui-focused fieldset": { borderColor: "rgba(9, 9, 9, 0.8)" },
        "& .MuiInputLabel-root": {
            textAlign: "center",
            fontSize: "small",
            fontFamily: "Roboto, sans-serif",
            color: "rgba(255,255,255,0.85)",
        },
        "& .MuiInputBase-input": { color: "#fff" },
        "& .MuiOutlinedInput-root": {
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(9, 9, 9, 0.8)",
            },
        },
    };

    const isEditMode = Boolean(selectedLanding);
    const isComplete =
        form.nombre.trim() !== "" &&
        form.url.trim() !== "" &&
        form.bonoActivo.trim() !== "" &&
        form.titulo.trim() !== "" &&
        form.subtitulo.trim() !== "" &&
        form.textoBoton.trim() !== "" &&
        form.textoInfo.trim() !== "" &&
        form.pixelId.trim() !== "" &&
        form.tokenAcceso.trim() !== "" &&
        Boolean(form.backgroundVertical) &&
        Boolean(form.backgroundHorizontal);
    const isDirty =
        Object.keys(form).some((key) => form[key] !== initialForm[key]) ||
        activo !== initialActivo;
    const primaryLabel = isEditMode ? "Guardar cambios" : "Crear";
    const primaryDisabled = isEditMode ? !isDirty : !isComplete;

    const handleSelectLanding = (value) => {
        setSelectedLanding(value);
        if (!value) {
            setForm(EMPTY_FORM);
            setInitialForm(EMPTY_FORM);
            setActivo(false);
            setInitialActivo(false);
            return;
        }
        setForm(EMPTY_FORM);
        setInitialForm(EMPTY_FORM);
        setActivo(false);
        setInitialActivo(false);
    };

    const handleChange = (key) => (event) => {
        const nextValue = event.target.value;
        setForm((prev) => ({ ...prev, [key]: nextValue }));
    };

    const handleCancel = () => {
        setSelectedLanding(null);
        setForm(EMPTY_FORM);
        setInitialForm(EMPTY_FORM);
        setActivo(false);
        setInitialActivo(false);
    };

    return (
        <Page title="Configuración de Landing Page">
            <div className="flex flex-col gap-0 items-center w-80 text-black dark:text-white">
                <Autocomplete
                    options={LANDING_OPTIONS}
                    value={selectedLanding}
                    onChange={(event, value) => handleSelectLanding(value)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Selecciona una landing page"
                            sx={{
                                width: 300,
                                '& .MuiInputLabel-root': { color },
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: color,
                                    },
                                    '&:hover fieldset': {
                                        borderColor: color,
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: color,
                                    },
                                },
                                '& .MuiSvgIcon-root': {
                                    color: color,
                                },
                            }}
                        />
                    )}
                />
            </div>
            <div className="flex flex-row w-full p-4 gap-4">
                    <div className="flex flex-col items-center w-8/10 mt-1 mb-3 rounded-xl pt-1 pb-1 px-5 bg-black shadow-lg shadow-zinc-900 dark:shadow-black/70">
                        <div className="flex flex-row font-bold text-lg items-center gap-2 ml-0 mt-1 mb-1 text-white title">
                            <h2>Datos Generales</h2>
                        </div>
                        <div className="w-9/10 gap-3 px-5 pb-1 pt-1">
                        <Stack direction="row" spacing={1}>
                            <TextField
                                label="Nombre"
                                variant="outlined"
                                fullWidth
                                size="small"
                                value={form.nombre}
                                onChange={handleChange("nombre")}
                                sx={commonTextFieldSx}
                            />
                            <TextField
                                label="Bono Activo"
                                variant="outlined"
                                fullWidth
                                size="small"
                                value={form.bonoActivo}
                                onChange={handleChange("bonoActivo")}
                                sx={commonTextFieldSx}
                            />
 
                        </Stack>
                        <Stack direction="row" spacing={1}>
                            <TextField
                                label="URL"
                                variant="outlined"
                                fullWidth
                                size="small"
                                value={form.url}
                                onChange={handleChange("url")}
                                sx={commonTextFieldSx}
                            />
                        </Stack>
                        <Stack direction="row" spacing={1}>
                            <TextField
                                label="Titulo"
                                variant="outlined"
                                fullWidth
                                size="small"
                                value={form.titulo}
                                onChange={handleChange("titulo")}
                                sx={commonTextFieldSx}
                            />
                            <TextField
                                label="Subtitulo"
                                variant="outlined"
                                fullWidth
                                size="small"
                                value={form.subtitulo}
                                onChange={handleChange("subtitulo")}
                                sx={commonTextFieldSx}
                            />
                        </Stack>
                        <Stack direction="row" spacing={1}>
                            <TextField
                                label="Texto Boton"
                                variant="outlined"
                                fullWidth
                                size="small"
                                value={form.textoBoton}
                                onChange={handleChange("textoBoton")}
                                sx={commonTextFieldSx}
                            />
                            <TextField
                                label="Texto Info"
                                variant="outlined"
                                fullWidth
                                size="small"
                                value={form.textoInfo}
                                onChange={handleChange("textoInfo")}
                                sx={commonTextFieldSx}
                            />
                        </Stack>    
                        <div className="flex flex-row gap-2 items-center justify-center w-full">
                            <label htmlFor="Activo" className="text-white">Activo</label>
                            <Checkbox
                                label="Activo"
                                checked={activo}
                                onChange={(event) => setActivo(event.target.checked)}
                                sx={{
                                    color: "rgba(255,255,255,0.85)",
                                    '&.Mui-checked': {
                                        color: "rgba(255,255,255,0.85)",
                                    },
                                }}
                            />
                        </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center w-8/10 mt-1 mb-3 rounded-xl pt-1 pb-1 px-5 bg-black shadow-lg shadow-zinc-900 dark:shadow-black/70">
                        <div className="flex flex-row font-bold text-lg items-center gap-2 ml-0 mb-1 text-white title">
                            <img src={Logo} alt="Logo Meta" className="w-12 h-auto mb-0 mr-1" />
                            <h2>Configuración de Pixel</h2>
                        </div>
                        <div className="w-9/10 gap-3 px-5 pb-1 pt-1">
                            <TextField
                                label="ID de Pixel"
                                variant="outlined"
                                fullWidth
                                size="small"
                                value={form.pixelId}
                                onChange={handleChange("pixelId")}
                                sx={commonTextFieldSx}
                            />
                            <TextField
                                label="Token de Acceso"
                                type="password"
                                variant="outlined"
                                fullWidth
                                size="small"
                                value={form.tokenAcceso}
                                onChange={handleChange("tokenAcceso")}
                                sx={{
                                    ...commonTextFieldSx,
                                    '&:hover fieldset': { borderColor: '#fff',
                                        borderRadius: "50px" },
                                    '&.Mui-focused fieldset': { borderColor: '#fff', borderRadius: "50px" },
                                }}
                            />
                            <Stack direction="row" spacing={2} className="mt-1">
                            <UploadButton
                                label="Fondo Vertical (Mobile)"
                                onUpload={(file) => setForm((prev) => ({ ...prev, backgroundVertical: file }))}
                                sx={{
                                    gridColumn: "span 2",
                                    width: "100%",
                                    borderRadius: "50px",
                                    backgroundColor: "rgba(217, 221, 88, 0.12)",
                                    color: "rgba(255,255,255,0.85)",
                                    "&:hover": { backgroundColor: "rgba(217, 221, 88, 0.2)" },
                                    "& .MuiButton-startIcon": { marginRight: "8px" },
                                }}
                            />
                            <UploadButton
                                label="Fondo Horizontal (Desktop)"
                                onUpload={(file) => setForm((prev) => ({ ...prev, backgroundHorizontal: file }))}
                                sx={{
                                    gridColumn: "span 2",
                                    width: "100%",
                                    borderRadius: "50px",
                                    backgroundColor: "rgba(217, 221, 88, 0.12)",
                                    color: "rgba(255,255,255,0.85)",
                                    "&:hover": { backgroundColor: "rgba(217, 221, 88, 0.2)" },
                                    "& .MuiButton-startIcon": { marginRight: "8px" },
                                }}
                            />
                        </Stack>
                        </div>
                    </div>
                </div>
                <div className="flex flex-row gap-2 items-center justify-center w-9/10 pb-4 bg-black/80 dark:bg-transparent rounded-xl px-4 py-3">
                    <Button
                            variant="outlined"
                            startIcon={<SaveIcon />}
                            disabled={primaryDisabled}
                            sx={{
                            borderColor: "#fff",
                            color: "#fff",
                            "&:hover": {
                                borderColor: "#fff",
                            },
                            "&.Mui-disabled": {
                                borderColor: "rgba(255,255,255,0.4)",
                                color: "rgba(255,255,255,0.4)",
                            },
                        }}
                    >
                    {primaryLabel}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handleCancel}
                        sx={{
                            borderColor: "#ef4444",
                            color: "#ef4444",
                            "&:hover": {
                                borderColor: "#dc2626",
                                color: "#dc2626",
                                backgroundColor: "rgba(239, 68, 68, 0.08)",
                            },
                            "&.Mui-disabled": {
                                borderColor: "rgba(239, 68, 68, 0.4)",
                                color: "rgba(239, 68, 68, 0.4)",
                            },
                        }}
                    >
                        Cancelar
                    </Button>
                </div>
        </Page>
    );
}

export default LandingConfig;
