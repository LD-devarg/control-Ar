import { useCallback, useEffect, useMemo, useState } from "react";
import "../assets/css/LandingConfig.css";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import SaveIcon from "@mui/icons-material/Save";
import Page from "../layouts/Page";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import UploadButton from "../components/UploadButton";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { apiClient } from "../services/auth";
import PreviewLanding from "../components/PreviewLanding";
import { useTenant } from "../context/TenantContext";

const EMPTY_FORM = {
    nombre: "",
    url: "",
    bonoActivo: "",
    titulo: "",
    subtitulo: "",
    textoBoton: "",
    textoInfo: "",
    textoWhatsapp: "",
    mostrarDisclaimer: true,
    mostrarTicker: true,
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

const cloneEmptyForm = () => ({ ...EMPTY_FORM });

const FIELD_MAP = [
    { formKey: "nombre", apiKey: "nombre", normalize: (value) => value.trim() },
    { formKey: "url", apiKey: "url", normalize: (value) => value.trim() },
    { formKey: "bonoActivo", apiKey: "bono", normalize: (value) => value.trim() },
    { formKey: "titulo", apiKey: "titulo", normalize: (value) => value.trim() },
    { formKey: "subtitulo", apiKey: "subtitulo", normalize: (value) => value.trim() },
    { formKey: "textoBoton", apiKey: "texto_boton", normalize: (value) => value.trim() },
    { formKey: "textoInfo", apiKey: "texto_info", normalize: (value) => value.trim() },
    { formKey: "textoWhatsapp", apiKey: "texto_whatsapp", normalize: (value) => value.trim() },
    {
        formKey: "mostrarDisclaimer",
        apiKey: "mostrar_disclaimer",
        normalize: (value) => String(Boolean(value)),
    },
    {
        formKey: "mostrarTicker",
        apiKey: "mostrar_ticker",
        normalize: (value) => String(Boolean(value)),
    },
    { formKey: "colorTitulo", apiKey: "color_titulo" },
    { formKey: "colorSubtitulo", apiKey: "color_subtitulo" },
    { formKey: "colorKeyword", apiKey: "color_keyword" },
    { formKey: "colorBono", apiKey: "color_bono" },
    { formKey: "colorInfo", apiKey: "color_info" },
    { formKey: "bgType", apiKey: "bg_type" },
    { formKey: "bgColor", apiKey: "bg_color" },
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

const ensureAbsoluteUrl = (value) => {
    const raw = (value || "").trim();
    if (!raw) return "";
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

const resolvePublicBaseUrl = (inputUrl, fallbackOrigin) => {
    const normalized = ensureAbsoluteUrl(inputUrl);
    if (!normalized) return fallbackOrigin;
    try {
        const parsed = new URL(normalized);
        return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");
    } catch {
        return fallbackOrigin;
    }
};

function LandingConfig() {
    const { tenantId } = useTenant();
    const [selectedLanding, setSelectedLanding] = useState(null);
    const [landingOptions, setLandingOptions] = useState([]);
    const [form, setForm] = useState(() => cloneEmptyForm());
    const [initialForm, setInitialForm] = useState(() => cloneEmptyForm());
    const [activo, setActivo] = useState(false);
    const [initialActivo, setInitialActivo] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, severity: "success", message: "" });
    const [showPreview, setShowPreview] = useState(false);
    const [previewDevice, setPreviewDevice] = useState("desktop");
    const [previewUrls, setPreviewUrls] = useState({ vertical: "", horizontal: "" });
    const [uploadKey, setUploadKey] = useState(0);
    const origin = typeof window !== "undefined" ? window.location.origin : "";

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

    const showToast = useCallback((severity, message) => {
        setToast({ open: true, severity, message });
    }, []);

    const handleSelectLanding = useCallback((value) => {
        setSelectedLanding(value);
        setUploadKey((prev) => prev + 1);
        if (!value) {
            const empty = cloneEmptyForm();
            setForm(empty);
            setInitialForm(empty);
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
            textoWhatsapp: value.texto_whatsapp || "",
            mostrarDisclaimer: value.mostrar_disclaimer ?? EMPTY_FORM.mostrarDisclaimer,
            mostrarTicker: value.mostrar_ticker ?? EMPTY_FORM.mostrarTicker,
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
    }, []);

    const loadLandings = useCallback(async (keepId = null) => {
        try {
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
        } catch (error) {
            const status = error?.response?.status;
            const detail = error?.response?.data?.detail;
            showToast("error", `Error (${status || "?"}): ${detail || "No se pudieron cargar las landings."}`);
        }
    }, [handleSelectLanding, showToast]);

    useEffect(() => {
        loadLandings();
    }, [loadLandings, tenantId]);

    const isEditMode = Boolean(selectedLanding);
    const currentGradient = useMemo(
        () => buildGradient(form.bgGradientAngle, form.bgGradientFrom, form.bgGradientTo),
        [form.bgGradientAngle, form.bgGradientFrom, form.bgGradientTo]
    );
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
    const isDirty = useMemo(() => {
        const hasNewFiles = Boolean(form.backgroundVertical) || Boolean(form.backgroundHorizontal);
        if (hasNewFiles) return true;
        if (activo !== initialActivo) return true;
        if (currentGradient !== initialForm.bgGradient) return true;
        return FIELD_MAP.some(({ formKey, normalize }) => {
            const toValue = normalize || ((value) => value);
            return toValue(form[formKey]) !== toValue(initialForm[formKey]);
        });
    }, [form, initialForm, activo, initialActivo, currentGradient]);
    const primaryLabel = isEditMode ? "Guardar cambios" : "Crear";
    const primaryDisabled = isEditMode ? !isDirty : !isComplete;
    const previewDisabled =
        !form.titulo.trim() &&
        !form.subtitulo.trim() &&
        !form.textoBoton.trim() &&
        !form.textoInfo.trim();

    const handleChange = (key) => (event) => {
        const nextValue = event.target.value;
        setForm((prev) => ({ ...prev, [key]: nextValue }));
    };

    const handleCancel = () => {
        setSelectedLanding(null);
        const empty = cloneEmptyForm();
        setForm(empty);
        setInitialForm(empty);
        setActivo(false);
        setInitialActivo(false);
        setPreviewUrls({ vertical: "", horizontal: "" });
        setUploadKey((prev) => prev + 1);
    };

    const handleSubmit = async () => {
        if (primaryDisabled || submitting) return;
        if (!tenantId) {
            showToast("error", "Error (401): usuario sin empresa.");
            return;
        }

        const formData = new FormData();
        const appendFields = ({ includeOnlyChanged }) => {
            FIELD_MAP.forEach(({ formKey, apiKey, normalize }) => {
                const toValue = normalize || ((value) => value);
                const nextValue = toValue(form[formKey]);
                if (!includeOnlyChanged) {
                    formData.append(apiKey, nextValue);
                    return;
                }
                const initialValue = toValue(initialForm[formKey]);
                if (nextValue !== initialValue) {
                    formData.append(apiKey, nextValue);
                }
            });
        };
        const appendFiles = () => {
            if (form.backgroundVertical) {
                formData.append("background_vertical", form.backgroundVertical);
            }
            if (form.backgroundHorizontal) {
                formData.append("background_horizontal", form.backgroundHorizontal);
            }
        };

        if (isEditMode) {
            appendFields({ includeOnlyChanged: true });
            const nextActivo = String(Boolean(activo));
            const prevActivo = String(Boolean(initialActivo));
            if (nextActivo !== prevActivo) {
                formData.append("activo", nextActivo);
            }
            if (currentGradient !== initialForm.bgGradient) {
                formData.append("bg_gradient", currentGradient);
            }
            appendFiles();
            if ([...formData.keys()].length === 0) {
                showToast("info", "No hay cambios para guardar.");
                return;
            }
        } else {
            formData.append("empresa", tenantId);
            appendFields({ includeOnlyChanged: false });
            formData.append("activo", String(Boolean(activo)));
            formData.append("bg_gradient", currentGradient);
            appendFiles();
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
        form.bgType === "gradient" ? currentGradient : form.bgColor;
    const publicBaseUrl = useMemo(
        () => resolvePublicBaseUrl(form.url, origin),
        [form.url, origin]
    );
    const publicLandingUrl = selectedLanding?.token
        ? `${publicBaseUrl}/landing?landing_token=${selectedLanding.token}`
        : "";

    return (
        <Page title="Configuración de Landing Page">
            <div className="flex flex-row w-full p-2 sm:p-4 justify-center ">
                <div className="flex flex-col items-center w-full xl:w-9/10 mb-3 rounded-xl pt-1 pb-1 px-3 sm:px-5 bg-black shadow-lg shadow-zinc-900 dark:shadow-black/70">
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
                    <div className="w-full xl:w-9/10 px-2 sm:px-5 pb-1 pt-1">
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1}
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
                                    width: { xs: "100%", md: "40%" },
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
                                    width: { xs: "100%", md: "45%" },
                                }}
                            />
                            <TextField
                                label="Bono Activo"
                                variant="outlined"
                                size="small"
                                value={form.bonoActivo}
                                onChange={handleChange("bonoActivo")}
                                sx={{...commonTextFieldSx,
                                    width: { xs: "100%", md: "15%" },
                                    fontSize: "small",
                                }}
                            />
                        </Stack>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1}
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
                                    width: { xs: "100%", md: "25%" },
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
                                    width: { xs: "100%", md: "40%" },
                                    fontSize: "small",
                                }}
                            />
                        </Stack>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1}
                        sx={{
                            mb: 1,
                        }}
                        >
                            <TextField
                                label="Texto WhatsApp"
                                variant="outlined"
                                size="small"
                                fullWidth
                                value={form.textoWhatsapp}
                                onChange={handleChange("textoWhatsapp")}
                                helperText="Variables permitidas: {{bono}}, {{username}}, {{nombre}}, {{contacto}}"
                                sx={{
                                    ...commonTextFieldSx,
                                    "& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.65)" },
                                }}
                            />
                        </Stack>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1}
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
                                    width: { xs: "100%", md: "60%" },
                                    fontSize: "",
                                }}
                            />
                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center justify-end w-full mt-1 sm:mt-2 mb-2">
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={activo}
                                            onChange={(event) => setActivo(event.target.checked)}
                                            inputProps={{ id: "landing-activo", name: "landing-activo" }}
                                            sx={{
                                                color: "rgba(255,255,255,0.85)",
                                                "&.Mui-checked": {
                                                    color: "rgba(255,255,255,0.85)",
                                                },
                                            }}
                                        />
                                    }
                                    label="Activo"
                                    sx={{ color: "#fff", m: 0 }}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={Boolean(form.mostrarDisclaimer)}
                                            onChange={(event) =>
                                                setForm((prev) => ({ ...prev, mostrarDisclaimer: event.target.checked }))
                                            }
                                            inputProps={{ id: "landing-disclaimer", name: "landing-disclaimer" }}
                                            sx={{
                                                color: "rgba(255,255,255,0.85)",
                                                "&.Mui-checked": {
                                                    color: "rgba(255,255,255,0.85)",
                                                },
                                            }}
                                        />
                                    }
                                    label="Disclaimer"
                                    sx={{ color: "#fff", m: 0 }}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={Boolean(form.mostrarTicker)}
                                            onChange={(event) =>
                                                setForm((prev) => ({ ...prev, mostrarTicker: event.target.checked }))
                                            }
                                            inputProps={{ id: "landing-ticker", name: "landing-ticker" }}
                                            sx={{
                                                color: "rgba(255,255,255,0.85)",
                                                "&.Mui-checked": {
                                                    color: "rgba(255,255,255,0.85)",
                                                },
                                            }}
                                        />
                                    }
                                    label="Barra ganadores"
                                    sx={{ color: "#fff", m: 0 }}
                                />
                            </div>
                        </Stack>
                            {publicLandingUrl ? (
                                <div className="w-full mt-2 flex items-center justify-center">
                                    <span className="text-black dark:text-white text-xs ">
                                        URL pública:{" "}
                                        <a
                                            href={publicLandingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sky-700 underline"
                                        >
                                            {publicLandingUrl}
                                        </a>
                                    </span>
                                </div>
                            ) : null}
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1}
                        sx={{
                            mb: 1,
                        }}
                        >
                        </Stack>
                        <div className="flex w-full text-center justify-center mt-2 mb-2">
                            <h2 className="text-white font-bold text-lg underline">Recursos Visuales</h2>
                        </div>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} className="mt-1 justify-center">
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
