import { useEffect, useState } from "react";
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
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { apiClient, getCurrentUser } from "../services/auth";
import PreviewLanding from "../components/PreviewLanding";

const EMPTY_FORM = {
    nombre: "",
    url: "",
    bonoActivo: "",
    titulo: "",
    subtitulo: "",
    textoBoton: "",
    textoInfo: "",
    mostrarDisclaimer: true,
    colorTitulo: "#ffffff",
    colorSubtitulo: "#ffffff",
    colorKeyword: "#ffe600",
    colorBono: "#ffe600",
    colorInfo: "#ffffff",
    bgType: "gradient",
    bgColor: "#0f172a",
    bgGradient: "linear-gradient(135deg, #0b1f3a 0%, #111827 100%)",
    bgGradientAngle: 135,
    bgGradientFrom: "#0b1f3a",
    bgGradientTo: "#111827",
    backgroundVertical: null,
    backgroundHorizontal: null,
};

const GRADIENT_ANGLES = [
    { angle: 45, label: "↗" },
    { angle: 135, label: "↘" },
    { angle: 225, label: "↙" },
    { angle: 315, label: "↖" },
];

const parseGradient = (value) => {
    if (!value) return null;
    const angleMatch = value.match(/linear-gradient\(([-\d.]+)deg/i);
    const colors = value.match(/#([0-9a-fA-F]{3,8})/g);
    if (!angleMatch || !colors || colors.length < 2) return null;
    return {
        angle: Number(angleMatch[1]),
        from: colors[0],
        to: colors[1],
    };
};

const buildGradient = (angle, from, to) =>
    `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;

function LandingConfig() {
    const [selectedLanding, setSelectedLanding] = useState(null);
    const [landingOptions, setLandingOptions] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [initialForm, setInitialForm] = useState(EMPTY_FORM);
    const [activo, setActivo] = useState(false);
    const [initialActivo, setInitialActivo] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, severity: "success", message: "" });
    const [showPreview, setShowPreview] = useState(false);
    const [previewDevice, setPreviewDevice] = useState("desktop");
    const [previewUrls, setPreviewUrls] = useState({ vertical: "", horizontal: "" });
    const [uploadKey, setUploadKey] = useState(0);
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === "dark";
    const color = isDarkMode ? "rgba(255,255,255,0.85)" : "rgba(9, 9, 9, 0.8)";

    const commonTextFieldSx = {
        "& fieldset": {
            borderColor: "rgba(255,255,255,0.85)",
        },
        "&:hover fieldset": {
            borderColor: "rgba(255, 255, 255, 0.95)",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
        },
        "&.Mui-focused fieldset": { borderColor: "rgba(255,255,255,0.85)" },
        "& .MuiInputLabel-root": {
            textAlign: "center",
            fontSize: "small",
            fontFamily: "Roboto, sans-serif",
            color: "rgba(255,255,255,0.85)",
        },
        "& .MuiInputBase-input": { color: "#fff" },
        "& .MuiOutlinedInput-root": {
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255,255,255,0.85)",
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
        Boolean(form.backgroundVertical) &&
        Boolean(form.backgroundHorizontal);
    const isDirty =
        Object.keys(form).some((key) => form[key] !== initialForm[key]) ||
        activo !== initialActivo;
    const primaryLabel = isEditMode ? "Guardar cambios" : "Crear";
    const primaryDisabled = isEditMode ? !isDirty : !isComplete;
    const previewDisabled =
        !form.titulo.trim() &&
        !form.subtitulo.trim() &&
        !form.textoBoton.trim() &&
        !form.textoInfo.trim();

    const handleSelectLanding = (value) => {
        setSelectedLanding(value);
        setUploadKey((prev) => prev + 1);
        if (!value) {
            setForm(EMPTY_FORM);
            setInitialForm(EMPTY_FORM);
            setActivo(false);
            setInitialActivo(false);
            setPreviewUrls({ vertical: "", horizontal: "" });
            return;
        }
        const nextForm = {
            ...EMPTY_FORM,
            nombre: value.nombre || "",
            url: value.url || "",
            bonoActivo: value.bono || "",
            titulo: value.titulo || "",
            subtitulo: value.subtitulo || "",
            textoBoton: value.texto_boton || "",
            textoInfo: value.texto_info || "",
            mostrarDisclaimer: value.mostrar_disclaimer ?? EMPTY_FORM.mostrarDisclaimer,
            colorTitulo: value.color_titulo || EMPTY_FORM.colorTitulo,
            colorSubtitulo: value.color_subtitulo || EMPTY_FORM.colorSubtitulo,
            colorKeyword: value.color_keyword || EMPTY_FORM.colorKeyword,
            colorBono: value.color_bono || EMPTY_FORM.colorBono,
            colorInfo: value.color_info || EMPTY_FORM.colorInfo,
            bgType: value.bg_type || EMPTY_FORM.bgType,
            bgColor: value.bg_color || EMPTY_FORM.bgColor,
            bgGradient: value.bg_gradient || EMPTY_FORM.bgGradient,
            backgroundVertical: null,
            backgroundHorizontal: null,
        };
        const parsed = parseGradient(nextForm.bgGradient);
        if (parsed) {
            nextForm.bgGradientAngle = parsed.angle;
            nextForm.bgGradientFrom = parsed.from;
            nextForm.bgGradientTo = parsed.to;
        }
        setForm(nextForm);
        setInitialForm(nextForm);
        setActivo(Boolean(value.activo));
        setInitialActivo(Boolean(value.activo));
        setPreviewUrls({
            vertical: value.background_vertical || "",
            horizontal: value.background_horizontal || "",
        });
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
        setPreviewUrls({ vertical: "", horizontal: "" });
        setUploadKey((prev) => prev + 1);
    };

    const showToast = (severity, message) => {
        setToast({ open: true, severity, message });
    };

    const loadLandings = async (keepId = null) => {
        const { data } = await apiClient.get("/landings/");
        const options = (data || []).map((landing) => ({
            ...landing,
            label: landing.nombre,
        }));
        setLandingOptions(options);
        if (keepId) {
            const match = options.find((item) => item.id === keepId);
            if (match) {
                handleSelectLanding(match);
            }
        }
    };

    useEffect(() => {
        loadLandings();
    }, []);

    const handleSubmit = async () => {
        if (primaryDisabled || submitting) return;
        const user = getCurrentUser();
        if (!user?.empresa) {
            showToast("error", "Error (401): usuario sin empresa.");
            return;
        }

        const formData = new FormData();
        const appendIfChanged = (key, value, original) => {
            if (value !== original) {
                formData.append(key, value);
            }
        };

        if (isEditMode) {
            appendIfChanged("nombre", form.nombre.trim(), initialForm.nombre);
            appendIfChanged("url", form.url.trim(), initialForm.url);
            appendIfChanged("bono", form.bonoActivo.trim(), initialForm.bonoActivo);
            appendIfChanged("activo", String(Boolean(activo)), String(Boolean(initialActivo)));
            appendIfChanged("titulo", form.titulo.trim(), initialForm.titulo);
            appendIfChanged("subtitulo", form.subtitulo.trim(), initialForm.subtitulo);
            appendIfChanged("texto_boton", form.textoBoton.trim(), initialForm.textoBoton);
            appendIfChanged("texto_info", form.textoInfo.trim(), initialForm.textoInfo);
            appendIfChanged("mostrar_disclaimer", String(Boolean(form.mostrarDisclaimer)), String(Boolean(initialForm.mostrarDisclaimer)));
            appendIfChanged("color_titulo", form.colorTitulo, initialForm.colorTitulo);
            appendIfChanged("color_subtitulo", form.colorSubtitulo, initialForm.colorSubtitulo);
            appendIfChanged("color_keyword", form.colorKeyword, initialForm.colorKeyword);
            appendIfChanged("color_bono", form.colorBono, initialForm.colorBono);
            appendIfChanged("color_info", form.colorInfo, initialForm.colorInfo);
            appendIfChanged("bg_type", form.bgType, initialForm.bgType);
            appendIfChanged("bg_color", form.bgColor, initialForm.bgColor);
            const nextGradient = buildGradient(form.bgGradientAngle, form.bgGradientFrom, form.bgGradientTo);
            appendIfChanged("bg_gradient", nextGradient, initialForm.bgGradient);
            if (form.backgroundVertical) {
                formData.append("background_vertical", form.backgroundVertical);
            }
            if (form.backgroundHorizontal) {
                formData.append("background_horizontal", form.backgroundHorizontal);
            }
            if ([...formData.keys()].length === 0) {
                showToast("info", "No hay cambios para guardar.");
                return;
            }
        } else {
            formData.append("empresa", user.empresa);
            formData.append("nombre", form.nombre.trim());
            formData.append("url", form.url.trim());
            formData.append("bono", form.bonoActivo.trim());
            formData.append("activo", String(Boolean(activo)));
            formData.append("titulo", form.titulo.trim());
            formData.append("subtitulo", form.subtitulo.trim());
            formData.append("texto_boton", form.textoBoton.trim());
            formData.append("texto_info", form.textoInfo.trim());
            formData.append("mostrar_disclaimer", String(Boolean(form.mostrarDisclaimer)));
            formData.append("color_titulo", form.colorTitulo);
            formData.append("color_subtitulo", form.colorSubtitulo);
            formData.append("color_keyword", form.colorKeyword);
            formData.append("color_bono", form.colorBono);
            formData.append("color_info", form.colorInfo);
            formData.append("bg_type", form.bgType);
            formData.append("bg_color", form.bgColor);
            formData.append("bg_gradient", buildGradient(form.bgGradientAngle, form.bgGradientFrom, form.bgGradientTo));
            if (form.backgroundVertical) {
                formData.append("background_vertical", form.backgroundVertical);
            }
            if (form.backgroundHorizontal) {
                formData.append("background_horizontal", form.backgroundHorizontal);
            }
        }

        setSubmitting(true);
        try {
            if (isEditMode) {
                const { data: updated } = await apiClient.patch(`/landings/${selectedLanding.id}/`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                showToast("success", "Landing actualizada.");
                await loadLandings(updated.id);
            } else {
                const { data: created } = await apiClient.post("/landings/", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                showToast("success", "Landing creada.");
                await loadLandings(created.id);
            }
        } catch (error) {
            const status = error?.response?.status;
            const detail = error?.response?.data?.detail;
            const message = detail ? `${detail}` : "No se pudo guardar la landing.";
            showToast("error", `Error (${status || "?"}): ${message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const previewBackground =
        form.bgType === "gradient"
            ? buildGradient(form.bgGradientAngle, form.bgGradientFrom, form.bgGradientTo)
            : form.bgColor;
    return (
        <Page title="Configuración de Landing Page">
            <div className="flex flex-row w-full p-4 justify-center ">
                <div className="flex flex-col items-center w-full xl:w-9/10 mb-3 rounded-xl pt-1 pb-1 px-5 bg-black shadow-lg shadow-zinc-900 dark:shadow-black/70">
                            <div className="flex flex-col gap-0 items-end w-full mt-2 text-black dark:text-white">
                                <Autocomplete
                                    options={landingOptions}
                                    value={selectedLanding}
                                    onChange={(event, value) => handleSelectLanding(value)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Selecciona una landing page"
                                            size="small"
                                            sx={{
                                                height: 32,
                                                width: 300,
                                                "& .MuiFormControl-root": { height: "100%" },
                                                "& .MuiInputBase-root": {
                                                    height: 32,
                                                    minHeight: 32,
                                                    fontSize: "0.8rem",
                                                    color: "rgba(255,255,255,0.85)",
                                                },
                                                "& .MuiInputBase-input": {
                                                    padding: "4px 10px",
                                                },
                                                "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.85)", fontSize: "0.8rem" },
                                                "& .MuiOutlinedInput-root": {
                                                    "& fieldset": {
                                                        borderColor: "rgba(255,255,255,0.85)",
                                                    },
                                                    "&:hover fieldset": {
                                                        borderColor: "rgba(255,255,255,0.85)",
                                                    },
                                                    "&.Mui-focused fieldset": {
                                                        borderColor: "rgba(255,255,255,0.85)",
                                                    },
                                                },
                                                "& .MuiSvgIcon-root": {
                                                    color: "rgba(255,255,255,0.85)",
                                                },
                                            }}
                                        />
                                    )}
                                />
                            </div>
                    <div className="flex flex-row font-bold text-lg items-center gap-2 ml-0 mt-1 mb-1">
                        <h2 className="text-white font-bold text-lg underline">Datos Generales</h2>
                    </div>
                    <div className="w-full xl:w-9/10 px-5 pb-1 pt-1">
                        <Stack direction="row" spacing={1}
                        sx={{
                            mb: 1,
                        }}>
                            <TextField
                                label="Nombre"
                                variant="outlined"
                                size="small"
                                value={form.nombre}
                                onChange={handleChange("nombre")}
                                sx={{...commonTextFieldSx,
                                    width: "40%",
                                    fontSize: "small",
                                }}
                            />
                            <TextField
                                label="Titulo"
                                variant="outlined"
                                size="small"
                                value={form.titulo}
                                onChange={handleChange("titulo")}
                                sx={{...commonTextFieldSx,
                                    fontSize: "small",
                                    width: "45%",
                                }}
                            />
                            <TextField
                                label="Bono Activo"
                                variant="outlined"
                                size="small"
                                value={form.bonoActivo}
                                onChange={handleChange("bonoActivo")}
                                sx={{...commonTextFieldSx,
                                    width: "15%",
                                    fontSize: "small",
                                }}
                            />
                        </Stack>
                        <Stack direction="row" spacing={1}
                        sx={{
                            mb: 1,
                        }}
                        >
                            <TextField
                                label="Subtitulo"
                                variant="outlined"
                                fullWidth
                                size="small"
                                value={form.subtitulo}
                                onChange={handleChange("subtitulo")}
                                sx={commonTextFieldSx}
                            />
                            <TextField
                                label="Texto Boton"
                                variant="outlined"
                                size="small"
                                value={form.textoBoton}
                                onChange={handleChange("textoBoton")}
                                sx={{...commonTextFieldSx,
                                    width: "25%",
                                    fontSize: "small",
                                }}
                            />
                            <TextField
                                label="Texto Info"
                                variant="outlined"
                                size="small"
                                value={form.textoInfo}
                                onChange={handleChange("textoInfo")}
                                sx={{...commonTextFieldSx,
                                    width: "40%",
                                    fontSize: "small",
                                }}
                            />
                        </Stack>
                        <Stack direction="row" spacing={1}
                        sx={{
                            mb: 1,
                        }}
                        >
                            <TextField
                                label="URL"
                                variant="outlined"
                                size="small"
                                value={form.url}
                                onChange={handleChange("url")}
                                sx={{...commonTextFieldSx,
                                    width: "60%",
                                    fontSize: "",
                                }}
                            />
                            <div className="flex flex-row gap-6 items-center justify-end w-full mt-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <label htmlFor="Activo" className="text-white">Activo</label>
                                    <Checkbox
                                        label="Activo"
                                        checked={activo}
                                        onChange={(event) => setActivo(event.target.checked)}
                                        sx={{
                                            color: "rgba(255,255,255,0.85)",
                                            "&.Mui-checked": {
                                                color: "rgba(255,255,255,0.85)",
                                            },
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="Disclaimer" className="text-white">Disclaimer</label>
                                    <Checkbox
                                        label="Disclaimer"
                                        checked={Boolean(form.mostrarDisclaimer)}
                                        onChange={(event) =>
                                            setForm((prev) => ({ ...prev, mostrarDisclaimer: event.target.checked }))
                                        }
                                        sx={{
                                            color: "rgba(255,255,255,0.85)",
                                            "&.Mui-checked": {
                                                color: "rgba(255,255,255,0.85)",
                                            },
                                        }}
                                    />
                                </div>
                            </div>
                        </Stack>
                            {selectedLanding?.token ? (
                                <div className="w-full mt-2 flex items-center justify-center">
                                    <span className="text-black dark:text-white text-xs ">
                                        URL pública:{" "}
                                        <a
                                            href={`${window.location.origin}/landing?landing_token=${selectedLanding.token}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sky-700 underline"
                                        >
                                            {`${window.location.origin}/landing?landing_token=${selectedLanding.token}`}
                                        </a>
                                    </span>
                                </div>
                            ) : null}
                        <Stack direction="row" spacing={1}
                        sx={{
                            mb: 1,
                        }}
                        >
                        </Stack>
                        <div className="flex w-full text-center justify-center mt-2 mb-2">
                            <h2 className="text-white font-bold text-lg underline">Recursos Visuales</h2>
                        </div>
                        <Stack direction="row" spacing={2} className="mt-1 justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <UploadButton
                                    key={`upload-vertical-${uploadKey}`}
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
                                <Button
                                    variant="outlined"
                                    size="small"
                                    disabled={!previewUrls.vertical}
                                    onClick={() => previewUrls.vertical && window.open(previewUrls.vertical, "_blank", "noopener,noreferrer")}
                                >
                                    Ver Fondo Vertical
                                </Button>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                            <UploadButton
                                key={`upload-horizontal-${uploadKey}`}
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
                            <Button
                                variant="outlined"
                                size="small"
                                disabled={!previewUrls.horizontal}
                                onClick={() => previewUrls.horizontal && window.open(previewUrls.horizontal, "_blank", "noopener,noreferrer")}
                            >
                                Ver Fondo Horizontal
                            </Button>
                            </div>
                        </Stack>
                        <div className="w-full gap-2 mt-4 mb-4 items-end flex justify-end">
                            <Button
                            variant="outlined"
                            className="mr-2"
                            sx={{
                                height: "100%",
                            }}
                            disabled={previewDisabled}
                            onClick={() => setShowPreview((prev) => !prev)}
                            >
                                Vista Previa
                            </Button>
                        </div>
                        <PreviewLanding
                            open={showPreview}
                            onClose={() => setShowPreview(false)}
                            device={previewDevice}
                            onDeviceChange={setPreviewDevice}
                            form={form}
                            previewUrls={previewUrls}
                            previewBackground={previewBackground}
                            onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                        />
                    </div>
                </div>
            </div>
            <div className="flex flex-row gap-2 items-center justify-center w-9/10 bg-black/80 dark:bg-transparent rounded-xl">
                <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    disabled={primaryDisabled || submitting}
                    onClick={handleSubmit}
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
                    {submitting ? "Guardando..." : primaryLabel}
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
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                    severity={toast.severity}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </Page>
    );
}

export default LandingConfig;
