import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useTenant } from "../context/TenantContext";
import { LANDING_TEXT_STYLE_DEFAULTS } from "../constants/landingTypography";

const PREVIEW_MESSAGE_TYPE = "landing-preview:update";
const PREVIEW_READY_TYPE = "landing-preview:ready";
const PREVIEW_STORAGE_KEY = "landing_preview_payload_v1";

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
    mostrarFormulario: true,
    mostrarMediosPago: false,
    mostrarComunidad: false,
    textoComunidad: "",
    mostrarPasos: false,
    textoPasos: "",
    colorTitulo: "#ffffff",
    colorSubtitulo: "#ffffff",
    colorKeyword: "#ffe600",
    colorBono: "#ffe600",
    colorInfo: "#ffffff",
    formBgColor: LANDING_TEXT_STYLE_DEFAULTS.formBgColor,
    formBgOpacity: LANDING_TEXT_STYLE_DEFAULTS.formBgOpacity,
    formFieldBorderColor: LANDING_TEXT_STYLE_DEFAULTS.formFieldBorderColor,
    fontTitulo: LANDING_TEXT_STYLE_DEFAULTS.fontTitulo,
    fontSubtitulo: LANDING_TEXT_STYLE_DEFAULTS.fontSubtitulo,
    fontKeyword: LANDING_TEXT_STYLE_DEFAULTS.fontKeyword,
    fontBono: LANDING_TEXT_STYLE_DEFAULTS.fontBono,
    fontInfo: LANDING_TEXT_STYLE_DEFAULTS.fontInfo,
    fontBoton: LANDING_TEXT_STYLE_DEFAULTS.fontBoton,
    fontForm: LANDING_TEXT_STYLE_DEFAULTS.fontForm,
    sizeTitulo: LANDING_TEXT_STYLE_DEFAULTS.sizeTitulo,
    sizeSubtitulo: LANDING_TEXT_STYLE_DEFAULTS.sizeSubtitulo,
    sizeKeyword: LANDING_TEXT_STYLE_DEFAULTS.sizeKeyword,
    sizeBono: LANDING_TEXT_STYLE_DEFAULTS.sizeBono,
    sizeInfo: LANDING_TEXT_STYLE_DEFAULTS.sizeInfo,
    sizeBoton: LANDING_TEXT_STYLE_DEFAULTS.sizeBoton,
    sizeForm: LANDING_TEXT_STYLE_DEFAULTS.sizeForm,
    weightTitulo: LANDING_TEXT_STYLE_DEFAULTS.weightTitulo,
    weightSubtitulo: LANDING_TEXT_STYLE_DEFAULTS.weightSubtitulo,
    weightKeyword: LANDING_TEXT_STYLE_DEFAULTS.weightKeyword,
    weightBono: LANDING_TEXT_STYLE_DEFAULTS.weightBono,
    weightInfo: LANDING_TEXT_STYLE_DEFAULTS.weightInfo,
    weightBoton: LANDING_TEXT_STYLE_DEFAULTS.weightBoton,
    weightForm: LANDING_TEXT_STYLE_DEFAULTS.weightForm,
    bgType: "gradient",
    bgColor: "#0f172a",
    bgGradient: "linear-gradient(135deg, #0b1f3a 0%, #111827 100%)",
    bgGradientAngle: 135,
    bgGradientFrom: "#0b1f3a",
    bgGradientTo: "#111827",
    credencialMetaId: "",
    enviarCapiPixelExtra: false,
    credencialMetaExtraId: "",
    backgroundVertical: null,
    backgroundHorizontal: null,
    imagenReemplazoForm: null,
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
    {
        formKey: "mostrarFormulario",
        apiKey: "mostrar_formulario",
        normalize: (value) => String(Boolean(value)),
    },
    {
        formKey: "mostrarMediosPago",
        apiKey: "mostrar_medios_pago",
        normalize: (value) => String(Boolean(value)),
    },
    {
        formKey: "mostrarComunidad",
        apiKey: "mostrar_comunidad",
        normalize: (value) => String(Boolean(value)),
    },
    { formKey: "textoComunidad", apiKey: "texto_comunidad" },
    {
        formKey: "mostrarPasos",
        apiKey: "mostrar_pasos",
        normalize: (value) => String(Boolean(value)),
    },
    { formKey: "textoPasos", apiKey: "texto_pasos" },
    { formKey: "colorTitulo", apiKey: "color_titulo" },
    { formKey: "colorSubtitulo", apiKey: "color_subtitulo" },
    { formKey: "colorKeyword", apiKey: "color_keyword" },
    { formKey: "colorBono", apiKey: "color_bono" },
    { formKey: "colorInfo", apiKey: "color_info" },
    { formKey: "formBgColor", apiKey: "form_bg_color" },
    { formKey: "formBgOpacity", apiKey: "form_bg_opacity", normalize: (value) => String(Number(value || 0.7).toFixed(2)) },
    { formKey: "formFieldBorderColor", apiKey: "form_field_border_color" },
    { formKey: "fontTitulo", apiKey: "font_titulo" },
    { formKey: "fontSubtitulo", apiKey: "font_subtitulo" },
    { formKey: "fontKeyword", apiKey: "font_keyword" },
    { formKey: "fontBono", apiKey: "font_bono" },
    { formKey: "fontInfo", apiKey: "font_info" },
    { formKey: "fontBoton", apiKey: "font_boton" },
    { formKey: "fontForm", apiKey: "font_form" },
    { formKey: "sizeTitulo", apiKey: "size_titulo", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.sizeTitulo).toFixed(2)) },
    { formKey: "sizeSubtitulo", apiKey: "size_subtitulo", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.sizeSubtitulo).toFixed(2)) },
    { formKey: "sizeKeyword", apiKey: "size_keyword", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.sizeKeyword).toFixed(2)) },
    { formKey: "sizeBono", apiKey: "size_bono", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.sizeBono).toFixed(2)) },
    { formKey: "sizeInfo", apiKey: "size_info", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.sizeInfo).toFixed(2)) },
    { formKey: "sizeBoton", apiKey: "size_boton", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.sizeBoton).toFixed(2)) },
    { formKey: "sizeForm", apiKey: "size_form", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.sizeForm).toFixed(2)) },
    { formKey: "weightTitulo", apiKey: "weight_titulo", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.weightTitulo)) },
    { formKey: "weightSubtitulo", apiKey: "weight_subtitulo", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.weightSubtitulo)) },
    { formKey: "weightKeyword", apiKey: "weight_keyword", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.weightKeyword)) },
    { formKey: "weightBono", apiKey: "weight_bono", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.weightBono)) },
    { formKey: "weightInfo", apiKey: "weight_info", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.weightInfo)) },
    { formKey: "weightBoton", apiKey: "weight_boton", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.weightBoton)) },
    { formKey: "weightForm", apiKey: "weight_form", normalize: (value) => String(Number(value || LANDING_TEXT_STYLE_DEFAULTS.weightForm)) },
    { formKey: "bgType", apiKey: "bg_type" },
    { formKey: "bgColor", apiKey: "bg_color" },
    {
        formKey: "enviarCapiPixelExtra",
        apiKey: "enviar_capi_pixel_extra",
        normalize: (value) => String(Boolean(value)),
    },
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

const toColorInputValue = (value, fallback) => (
    /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? value : fallback
);

const toNumberValue = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

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

const extractApiErrorMessage = (error, fallbackMessage) => {
    const data = error?.response?.data;
    if (!data) return fallbackMessage;
    if (typeof data === "string") return data;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data)) {
        const first = data.find((item) => typeof item === "string");
        return first || fallbackMessage;
    }
    if (typeof data === "object") {
        const values = Object.values(data).flat();
        const firstText = values.find((value) => typeof value === "string");
        if (firstText) return firstText;
    }
    return fallbackMessage;
};

const buildPreviewPayload = (form, previewUrls, currentGradient) => ({
    titulo: form?.titulo || "",
    bono: form?.bonoActivo || "",
    subtitulo: form?.subtitulo || "",
    texto_boton: form?.textoBoton || "",
    texto_info: form?.textoInfo || "",
    texto_whatsapp: form?.textoWhatsapp || "",
    mostrar_disclaimer: form?.mostrarDisclaimer !== false,
    mostrar_ticker: form?.mostrarTicker !== false,
    mostrar_formulario: form?.mostrarFormulario !== false,
    mostrar_medios_pago: form?.mostrarMediosPago === true,
    mostrar_comunidad: form?.mostrarComunidad === true,
    texto_comunidad: form?.textoComunidad || "",
    mostrar_pasos: form?.mostrarPasos === true,
    texto_pasos: form?.textoPasos || "",
    color_titulo: form?.colorTitulo || "#ffffff",
    color_subtitulo: form?.colorSubtitulo || "#ffffff",
    color_keyword: form?.colorKeyword || "#ffe600",
    color_bono: form?.colorBono || "#ffe600",
    color_info: form?.colorInfo || "#ffffff",
    form_bg_color: toColorInputValue(form?.formBgColor, "#000000"),
    form_bg_opacity: toNumberValue(form?.formBgOpacity, LANDING_TEXT_STYLE_DEFAULTS.formBgOpacity),
    form_field_border_color: toColorInputValue(form?.formFieldBorderColor, "#e014ff"),
    font_titulo: form?.fontTitulo || LANDING_TEXT_STYLE_DEFAULTS.fontTitulo,
    font_subtitulo: form?.fontSubtitulo || LANDING_TEXT_STYLE_DEFAULTS.fontSubtitulo,
    font_keyword: form?.fontKeyword || LANDING_TEXT_STYLE_DEFAULTS.fontKeyword,
    font_bono: form?.fontBono || LANDING_TEXT_STYLE_DEFAULTS.fontBono,
    font_info: form?.fontInfo || LANDING_TEXT_STYLE_DEFAULTS.fontInfo,
    font_boton: form?.fontBoton || LANDING_TEXT_STYLE_DEFAULTS.fontBoton,
    font_form: form?.fontForm || LANDING_TEXT_STYLE_DEFAULTS.fontForm,
    size_titulo: toNumberValue(form?.sizeTitulo, LANDING_TEXT_STYLE_DEFAULTS.sizeTitulo),
    size_subtitulo: toNumberValue(form?.sizeSubtitulo, LANDING_TEXT_STYLE_DEFAULTS.sizeSubtitulo),
    size_keyword: toNumberValue(form?.sizeKeyword, LANDING_TEXT_STYLE_DEFAULTS.sizeKeyword),
    size_bono: toNumberValue(form?.sizeBono, LANDING_TEXT_STYLE_DEFAULTS.sizeBono),
    size_info: toNumberValue(form?.sizeInfo, LANDING_TEXT_STYLE_DEFAULTS.sizeInfo),
    size_boton: toNumberValue(form?.sizeBoton, LANDING_TEXT_STYLE_DEFAULTS.sizeBoton),
    size_form: toNumberValue(form?.sizeForm, LANDING_TEXT_STYLE_DEFAULTS.sizeForm),
    weight_titulo: toNumberValue(form?.weightTitulo, LANDING_TEXT_STYLE_DEFAULTS.weightTitulo),
    weight_subtitulo: toNumberValue(form?.weightSubtitulo, LANDING_TEXT_STYLE_DEFAULTS.weightSubtitulo),
    weight_keyword: toNumberValue(form?.weightKeyword, LANDING_TEXT_STYLE_DEFAULTS.weightKeyword),
    weight_bono: toNumberValue(form?.weightBono, LANDING_TEXT_STYLE_DEFAULTS.weightBono),
    weight_info: toNumberValue(form?.weightInfo, LANDING_TEXT_STYLE_DEFAULTS.weightInfo),
    weight_boton: toNumberValue(form?.weightBoton, LANDING_TEXT_STYLE_DEFAULTS.weightBoton),
    weight_form: toNumberValue(form?.weightForm, LANDING_TEXT_STYLE_DEFAULTS.weightForm),
    bg_type: form?.bgType || "gradient",
    bg_color: form?.bgColor || "#0f172a",
    bg_gradient:
        form?.bgGradient ||
        currentGradient ||
        "linear-gradient(135deg, #0b1f3a 0%, #111827 100%)",
    background_vertical: previewUrls?.vertical || "",
    background_horizontal: previewUrls?.horizontal || "",
    imagen_reemplazo_form: previewUrls?.reemplazoForm || "",
    footer_text: "© 2026 ControlAR. Todos los derechos reservados.",
});

function LandingConfig() {
    const { tenantId } = useTenant();
    const [selectedLanding, setSelectedLanding] = useState(null);
    const [landingOptions, setLandingOptions] = useState([]);
    const [credencialesMetaOptions, setCredencialesMetaOptions] = useState([]);
    const [form, setForm] = useState(() => cloneEmptyForm());
    const [initialForm, setInitialForm] = useState(() => cloneEmptyForm());
    const [activo, setActivo] = useState(true);
    const [initialActivo, setInitialActivo] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, severity: "success", message: "" });
    const [previewUrls, setPreviewUrls] = useState({ vertical: "", horizontal: "", reemplazoForm: "" });
    const [uploadKey, setUploadKey] = useState(0);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const previewWindowRef = useRef(null);

    const clearPreviewObjectUrls = useCallback(() => { }, []);

    const setPreviewUrlFromFile = useCallback(async (key, file) => {
        if (!file) return;
        try {
            const dataUrl = await fileToDataUrl(file);
            setPreviewUrls((prev) => ({ ...prev, [key]: dataUrl }));
        } catch {
            // ignore preview file read errors
        }
    }, []);

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

    useEffect(() => () => clearPreviewObjectUrls(), [clearPreviewObjectUrls]);

    const handleSelectLanding = useCallback((value) => {
        setSelectedLanding(value);
        setUploadKey((prev) => prev + 1);
        clearPreviewObjectUrls();
        if (!value) {
            const empty = cloneEmptyForm();
            setForm(empty);
            setInitialForm(empty);
            setActivo(true);
            setInitialActivo(true);
            setPreviewUrls({ vertical: "", horizontal: "", reemplazoForm: "" });
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
            mostrarFormulario: value.mostrar_formulario ?? EMPTY_FORM.mostrarFormulario,
            mostrarMediosPago: value.mostrar_medios_pago ?? EMPTY_FORM.mostrarMediosPago,
            mostrarComunidad: value.mostrar_comunidad ?? EMPTY_FORM.mostrarComunidad,
            textoComunidad: value.texto_comunidad || "",
            mostrarPasos: value.mostrar_pasos ?? EMPTY_FORM.mostrarPasos,
            textoPasos: value.texto_pasos || "",
            colorTitulo: value.color_titulo || EMPTY_FORM.colorTitulo,
            colorSubtitulo: value.color_subtitulo || EMPTY_FORM.colorSubtitulo,
            colorKeyword: value.color_keyword || EMPTY_FORM.colorKeyword,
            colorBono: value.color_bono || EMPTY_FORM.colorBono,
            colorInfo: value.color_info || EMPTY_FORM.colorInfo,
            formBgColor: toColorInputValue(value.form_bg_color, EMPTY_FORM.formBgColor),
            formBgOpacity: toNumberValue(value.form_bg_opacity, EMPTY_FORM.formBgOpacity),
            formFieldBorderColor: toColorInputValue(
                value.form_field_border_color,
                EMPTY_FORM.formFieldBorderColor
            ),
            fontTitulo: value.font_titulo || value.font_family || EMPTY_FORM.fontTitulo,
            fontSubtitulo: value.font_subtitulo || value.font_family || EMPTY_FORM.fontSubtitulo,
            fontKeyword: value.font_keyword || value.font_family || EMPTY_FORM.fontKeyword,
            fontBono: value.font_bono || value.font_family || EMPTY_FORM.fontBono,
            fontInfo: value.font_info || value.font_family || EMPTY_FORM.fontInfo,
            fontBoton: value.font_boton || value.font_family || EMPTY_FORM.fontBoton,
            fontForm: value.font_form || value.font_family || EMPTY_FORM.fontForm,
            sizeTitulo: toNumberValue(value.size_titulo, EMPTY_FORM.sizeTitulo),
            sizeSubtitulo: toNumberValue(value.size_subtitulo, EMPTY_FORM.sizeSubtitulo),
            sizeKeyword: toNumberValue(value.size_keyword, EMPTY_FORM.sizeKeyword),
            sizeBono: toNumberValue(value.size_bono, EMPTY_FORM.sizeBono),
            sizeInfo: toNumberValue(value.size_info, EMPTY_FORM.sizeInfo),
            sizeBoton: toNumberValue(value.size_boton, EMPTY_FORM.sizeBoton),
            sizeForm: toNumberValue(value.size_form, EMPTY_FORM.sizeForm),
            weightTitulo: toNumberValue(value.weight_titulo, EMPTY_FORM.weightTitulo),
            weightSubtitulo: toNumberValue(value.weight_subtitulo, EMPTY_FORM.weightSubtitulo),
            weightKeyword: toNumberValue(value.weight_keyword, EMPTY_FORM.weightKeyword),
            weightBono: toNumberValue(value.weight_bono, EMPTY_FORM.weightBono),
            weightInfo: toNumberValue(value.weight_info, EMPTY_FORM.weightInfo),
            weightBoton: toNumberValue(value.weight_boton, EMPTY_FORM.weightBoton),
            weightForm: toNumberValue(value.weight_form, EMPTY_FORM.weightForm),
            bgType: value.bg_type || EMPTY_FORM.bgType,
            bgColor: value.bg_color || EMPTY_FORM.bgColor,
            bgGradient: value.bg_gradient || EMPTY_FORM.bgGradient,
            credencialMetaId: value.credencial_meta || "",
            enviarCapiPixelExtra: value.enviar_capi_pixel_extra ?? EMPTY_FORM.enviarCapiPixelExtra,
            credencialMetaExtraId: value.credencial_meta_extra || "",
            backgroundVertical: null,
            backgroundHorizontal: null,
            imagenReemplazoForm: null,
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
            reemplazoForm: value.imagen_reemplazo_form || "",
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
            const detail = extractApiErrorMessage(error, "No se pudieron cargar las landings.");
            showToast("error", `Error (${status || "?"}): ${detail}`);
        }
    }, [handleSelectLanding, showToast]);

    const loadCredencialesMeta = useCallback(async () => {
        try {
            const { data } = await apiClient.get("/credenciales-meta/");
            const options = (data || []).map((credencial) => ({
                ...credencial,
                label: credencial.nombre
                    ? `${credencial.nombre} (${credencial.pixel_id || "sin pixel"})`
                    : credencial.pixel_id || `Credencial #${credencial.id}`,
            }));
            setCredencialesMetaOptions(options);
        } catch (error) {
            const status = error?.response?.status;
            const detail = extractApiErrorMessage(error, "No se pudieron cargar las credenciales Meta.");
            showToast("error", `Error (${status || "?"}): ${detail}`);
        }
    }, [showToast]);

    useEffect(() => {
        loadLandings();
    }, [loadLandings, tenantId]);

    useEffect(() => {
        loadCredencialesMeta();
    }, [loadCredencialesMeta, tenantId]);

    const isEditMode = Boolean(selectedLanding);
    const selectedCredencialMeta = useMemo(() => {
        if (!form.credencialMetaId) return null;
        return (
            credencialesMetaOptions.find((item) => Number(item.id) === Number(form.credencialMetaId))
            || null
        );
    }, [credencialesMetaOptions, form.credencialMetaId]);
    const selectedCredencialMetaExtra = useMemo(() => {
        if (!form.credencialMetaExtraId) return null;
        return (
            credencialesMetaOptions.find((item) => Number(item.id) === Number(form.credencialMetaExtraId))
            || null
        );
    }, [credencialesMetaOptions, form.credencialMetaExtraId]);
    const currentGradient = useMemo(
        () => buildGradient(form.bgGradientAngle, form.bgGradientFrom, form.bgGradientTo),
        [form.bgGradientAngle, form.bgGradientFrom, form.bgGradientTo]
    );
    const previewPayload = useMemo(
        () => buildPreviewPayload(form, previewUrls, currentGradient),
        [form, previewUrls, currentGradient]
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
        const hasNewFiles = Boolean(form.backgroundVertical) || Boolean(form.backgroundHorizontal) || Boolean(form.imagenReemplazoForm);
        if (hasNewFiles) return true;
        if (activo !== initialActivo) return true;
        if (currentGradient !== initialForm.bgGradient) return true;
        if (String(form.credencialMetaId || "") !== String(initialForm.credencialMetaId || "")) return true;
        if (String(form.credencialMetaExtraId || "") !== String(initialForm.credencialMetaExtraId || "")) return true;
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
        clearPreviewObjectUrls();
        const empty = cloneEmptyForm();
        setForm(empty);
        setInitialForm(empty);
        setActivo(true);
        setInitialActivo(true);
        setPreviewUrls({ vertical: "", horizontal: "", reemplazoForm: "" });
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
            if (form.imagenReemplazoForm) {
                formData.append("imagen_reemplazo_form", form.imagenReemplazoForm);
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
            const nextCredencial = String(form.credencialMetaId || "");
            const prevCredencial = String(initialForm.credencialMetaId || "");
            if (nextCredencial !== prevCredencial) {
                formData.append("credencial_meta", nextCredencial);
            }
            const nextCredencialExtra = String(form.credencialMetaExtraId || "");
            const prevCredencialExtra = String(initialForm.credencialMetaExtraId || "");
            if (nextCredencialExtra !== prevCredencialExtra) {
                formData.append("credencial_meta_extra", nextCredencialExtra);
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
            if (form.credencialMetaId) {
                formData.append("credencial_meta", String(form.credencialMetaId));
            }
            if (form.credencialMetaExtraId) {
                formData.append("credencial_meta_extra", String(form.credencialMetaExtraId));
            }
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
            const message = extractApiErrorMessage(error, "No se pudo guardar la landing.");
            console.error("Landing save error", error?.response?.data || error);
            showToast("error", `Error (${status || "?"}): ${message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const publicBaseUrl = useMemo(
        () => resolvePublicBaseUrl(form.url, origin),
        [form.url, origin]
    );
    const publicLandingUrl = selectedLanding?.token
        ? `${publicBaseUrl}/landing?landing_token=${selectedLanding.token}`
        : "";
    const publicLandingTestUrl = selectedLanding?.token
        ? `${publicBaseUrl}/landing?landing_token=${selectedLanding.token}&test=1`
        : "";
    const previewUrl = `${origin}/landing?preview=1`;

    const sendPreviewUpdate = useCallback(() => {
        try {
            localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(previewPayload));
        } catch {
            // ignore storage errors
        }
        const win = previewWindowRef.current;
        if (!win || win.closed) return;
        win.postMessage({ type: PREVIEW_MESSAGE_TYPE, payload: previewPayload }, window.location.origin);
    }, [previewPayload]);

    const openPreviewWindow = useCallback(() => {
        const existing = previewWindowRef.current;
        if (existing && !existing.closed) {
            existing.focus();
            sendPreviewUpdate();
            return;
        }
        const opened = window.open(previewUrl, "landing-preview-window");
        if (!opened) {
            showToast("error", "No se pudo abrir la ventana de preview. Revisá el bloqueador de popups.");
            return;
        }
        previewWindowRef.current = opened;
    }, [previewUrl, sendPreviewUpdate, showToast]);

    useEffect(() => {
        sendPreviewUpdate();
    }, [sendPreviewUpdate]);

    useEffect(() => {
        const onMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            if (previewWindowRef.current && event.source !== previewWindowRef.current) {
                return;
            }
            const messageType = event?.data?.type;
            if (messageType === PREVIEW_READY_TYPE) {
                sendPreviewUpdate();
                return;
            }
            if (messageType !== PREVIEW_MESSAGE_TYPE) return;
            const payload = event?.data?.payload || {};
            setForm((prev) => ({
                ...prev,
                bgType: payload.bg_type || prev.bgType,
                bgColor: payload.bg_color || prev.bgColor,
                colorTitulo: payload.color_titulo || prev.colorTitulo,
                colorSubtitulo: payload.color_subtitulo || prev.colorSubtitulo,
                colorKeyword: payload.color_keyword || prev.colorKeyword,
                colorBono: payload.color_bono || prev.colorBono,
                colorInfo: payload.color_info || prev.colorInfo,
                mostrarMediosPago: payload.mostrar_medios_pago ?? prev.mostrarMediosPago,
                mostrarComunidad: payload.mostrar_comunidad ?? prev.mostrarComunidad,
                textoComunidad: payload.texto_comunidad ?? prev.textoComunidad,
                mostrarPasos: payload.mostrar_pasos ?? prev.mostrarPasos,
                textoPasos: payload.texto_pasos ?? prev.textoPasos,
                formBgColor: toColorInputValue(payload.form_bg_color, prev.formBgColor),
                formBgOpacity: toNumberValue(payload.form_bg_opacity, prev.formBgOpacity),
                formFieldBorderColor: toColorInputValue(
                    payload.form_field_border_color,
                    prev.formFieldBorderColor
                ),
                fontTitulo: payload.font_titulo || prev.fontTitulo,
                fontSubtitulo: payload.font_subtitulo || prev.fontSubtitulo,
                fontKeyword: payload.font_keyword || prev.fontKeyword,
                fontBono: payload.font_bono || prev.fontBono,
                fontInfo: payload.font_info || prev.fontInfo,
                fontBoton: payload.font_boton || prev.fontBoton,
                fontForm: payload.font_form || prev.fontForm,
                sizeTitulo: toNumberValue(payload.size_titulo, prev.sizeTitulo),
                sizeSubtitulo: toNumberValue(payload.size_subtitulo, prev.sizeSubtitulo),
                sizeKeyword: toNumberValue(payload.size_keyword, prev.sizeKeyword),
                sizeBono: toNumberValue(payload.size_bono, prev.sizeBono),
                sizeInfo: toNumberValue(payload.size_info, prev.sizeInfo),
                sizeBoton: toNumberValue(payload.size_boton, prev.sizeBoton),
                sizeForm: toNumberValue(payload.size_form, prev.sizeForm),
                weightTitulo: toNumberValue(payload.weight_titulo, prev.weightTitulo),
                weightSubtitulo: toNumberValue(payload.weight_subtitulo, prev.weightSubtitulo),
                weightKeyword: toNumberValue(payload.weight_keyword, prev.weightKeyword),
                weightBono: toNumberValue(payload.weight_bono, prev.weightBono),
                weightInfo: toNumberValue(payload.weight_info, prev.weightInfo),
                weightBoton: toNumberValue(payload.weight_boton, prev.weightBoton),
                weightForm: toNumberValue(payload.weight_form, prev.weightForm),
                bgGradient: payload.bg_gradient || prev.bgGradient,
            }));
            const parsed = parseGradient(payload.bg_gradient || "");
            if (parsed) {
                setForm((prev) => ({
                    ...prev,
                    bgGradientAngle: parsed.angle,
                    bgGradientFrom: parsed.from,
                    bgGradientTo: parsed.to,
                }));
            }
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [sendPreviewUpdate]);

    return (
        <Page title="Configuración de Landing Page"
            actions={
                <div className="flex flex-row items-center justify-between w-full max-w-[98%] 2xl:max-w-[1600px] rounded-xl py-2 px-2 sm:px-4 bg-black shadow-lg shadow-zinc-900 dark:shadow-black/70">
                    <div className="flex w-full text-black dark:text-white">
                        {publicLandingUrl ? (
                            <div className="w-full flex  justify-start">
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
                                    {publicLandingTestUrl ? (
                                        <>
                                            {" · "}
                                            <a
                                                href={publicLandingTestUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-amber-500 underline"
                                            >
                                                Modo test
                                            </a>
                                        </>
                                    ) : null}
                                </span>
                            </div>
                        ) : null}
                    </div>
                    <div className="flex flex-row font-bold text-lg items-center justify-start gap-2 ml-0 mt-1 mb-1">
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
                </div>
            }>
            <div className="flex flex-col w-full px-1 sm:px-2 py-2 justify-center">
                <div className="flex flex-row flex-wrap gap-2 sm:gap-4 items-center justify-center w-full mt-1 mb-1 border-b border-white/10">
                    <FormControlLabel control={<Checkbox checked={activo} onChange={(e) => setActivo(e.target.checked)} sx={{ color: "rgba(255,255,255,0.85)", "&.Mui-checked": { color: "rgba(255,255,255,0.85)" } }} />} label="Activo" sx={{ color: "#fff", m: 0 }} />
                    <FormControlLabel control={<Checkbox checked={Boolean(form.mostrarDisclaimer)} onChange={(e) => setForm(p => ({ ...p, mostrarDisclaimer: e.target.checked }))} sx={{ color: "rgba(255,255,255,0.85)", "&.Mui-checked": { color: "rgba(255,255,255,0.85)" } }} />} label="Disclaimer" sx={{ color: "#fff", m: 0 }} />
                    <FormControlLabel control={<Checkbox checked={Boolean(form.mostrarTicker)} onChange={(e) => setForm(p => ({ ...p, mostrarTicker: e.target.checked }))} sx={{ color: "rgba(255,255,255,0.85)", "&.Mui-checked": { color: "rgba(255,255,255,0.85)" } }} />} label="Barra ganadores" sx={{ color: "#fff", m: 0 }} />
                    <FormControlLabel control={<Checkbox checked={Boolean(form.mostrarFormulario)} onChange={(e) => setForm(p => ({ ...p, mostrarFormulario: e.target.checked }))} sx={{ color: "rgba(255,255,255,0.85)", "&.Mui-checked": { color: "rgba(255,255,255,0.85)" } }} />} label="Formulario" sx={{ color: "#fff", m: 0 }} />
                    <FormControlLabel control={<Checkbox checked={Boolean(form.mostrarMediosPago)} onChange={(e) => setForm(p => ({ ...p, mostrarMediosPago: e.target.checked }))} sx={{ color: "rgba(255,255,255,0.85)", "&.Mui-checked": { color: "rgba(255,255,255,0.85)" } }} />} label="Medios de Pago" sx={{ color: "#fff", m: 0 }} />
                    <FormControlLabel control={<Checkbox checked={Boolean(form.mostrarComunidad)} onChange={(e) => setForm(p => ({ ...p, mostrarComunidad: e.target.checked }))} sx={{ color: "rgba(255,255,255,0.85)", "&.Mui-checked": { color: "rgba(255,255,255,0.85)" } }} />} label="Testimonio Comunidad" sx={{ color: "#fff", m: 0 }} />
                    <FormControlLabel control={<Checkbox checked={Boolean(form.mostrarPasos)} onChange={(e) => setForm(p => ({ ...p, mostrarPasos: e.target.checked }))} sx={{ color: "rgba(255,255,255,0.85)", "&.Mui-checked": { color: "rgba(255,255,255,0.85)" } }} />} label="Paso a Paso" sx={{ color: "#fff", m: 0 }} />
                </div>
                <div className="grid grid-cols-[50%_50%] gap-4 lg:gap-8 items-start">
                    {/* Columna Izquierda: Datos */}
                    <div className="flex flex-col w-full overflow-y-auto max-h-[60vh] lg:max-h-[55vh] pr-2 xl:pr-4 lg:border-r lg:border-white/10" style={{ scrollbarWidth: 'thin', scrollbarColor: '#444 transparent' }}>
                        <div className="flex flex-row font-bold items-center gap-2 mb-2">
                            <h2 className="text-white font-bold text-base underline">Datos Generales</h2>
                        </div>
                        <div className="w-full pb-1 pt-1">
                            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
                                <TextField
                                    label="Nombre"
                                    variant="outlined"
                                    size="small"
                                    value={form.nombre}
                                    onChange={handleChange("nombre")}
                                    sx={{
                                        ...commonTextFieldSx,
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
                                    sx={{
                                        ...commonTextFieldSx,
                                        fontSize: "small",
                                        width: { xs: "100%", md: "60%" },
                                    }}
                                />
                            </Stack>
                            <Stack direction={{ xs: "column", md: "row" }} spacing={1}
                                sx={{
                                    mb: 1,
                                }}
                            >
                                <TextField
                                    label="Texto Boton"
                                    variant="outlined"
                                    size="small"
                                    value={form.textoBoton}
                                    onChange={handleChange("textoBoton")}
                                    sx={{
                                        ...commonTextFieldSx,
                                        width: { xs: "100%", md: "30%" },
                                        fontSize: "small",
                                    }}
                                />
                                <TextField
                                    label="Bono Activo"
                                    variant="outlined"
                                    size="small"
                                    value={form.bonoActivo}
                                    onChange={handleChange("bonoActivo")}
                                    sx={{
                                        ...commonTextFieldSx,
                                        width: { xs: "100%", md: "20%" },
                                        fontSize: "small",
                                    }}
                                />
                                <TextField
                                    label="Texto Info"
                                    variant="outlined"
                                    size="small"
                                    value={form.textoInfo}
                                    onChange={handleChange("textoInfo")}
                                    sx={{
                                        ...commonTextFieldSx,
                                        width: { xs: "100%", md: "50%" },
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
                                    multiline
                                    rows={2}
                                    size="small"
                                    value={form.subtitulo}
                                    onChange={handleChange("subtitulo")}
                                    sx={commonTextFieldSx}
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
                                    multiline
                                    rows={2}
                                    value={form.textoWhatsapp}
                                    onChange={handleChange("textoWhatsapp")}
                                    helperText="Variables permitidas: {{bono}}, {{username}}, {{nombre}}, {{contacto}}, {{codigo}}"
                                    sx={{
                                        ...commonTextFieldSx,
                                        "& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.65)" },
                                    }}
                                />
                            </Stack>
                            <Stack direction={{ xs: "column", md: "row" }} spacing={1}
                                sx={{
                                    mb: 1,
                                    width: "100%",
                                }}
                            >
                                <TextField
                                    label="URL"
                                    variant="outlined"
                                    size="small"
                                    value={form.url}
                                    onChange={handleChange("url")}
                                    sx={{
                                        ...commonTextFieldSx,
                                        width: { xs: "100%", md: "100%" },
                                        fontSize: "",
                                    }}
                                />
                            </Stack>

                            <Stack direction={{ xs: "column", md: "row" }} spacing={1}
                                sx={{
                                    mb: 1,
                                    width: "full",
                                }}
                            >
                                <Autocomplete
                                    options={credencialesMetaOptions}
                                    value={selectedCredencialMeta}
                                    onChange={(_, value) =>
                                        setForm((prev) => ({ ...prev, credencialMetaId: value?.id || "" }))
                                    }
                                    getOptionLabel={(option) => option?.label || ""}
                                    isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Pixel vinculado"
                                            variant="outlined"
                                            size="small"
                                            sx={{ ...commonTextFieldSx, width: "500%" }}
                                        />
                                    )}
                                />
                            </Stack>

                            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1, width: "full" }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={Boolean(form.enviarCapiPixelExtra)}
                                            onChange={(e) =>
                                                setForm((prev) => ({ ...prev, enviarCapiPixelExtra: e.target.checked }))
                                            }
                                            sx={{
                                                color: "rgba(255,255,255,0.85)",
                                                "&.Mui-checked": { color: "rgba(255,255,255,0.85)" },
                                            }}
                                        />
                                    }
                                    label="Pixel extra por CAPI"
                                    sx={{ color: "#fff", m: 0 }}
                                />
                            </Stack>

                            {form.enviarCapiPixelExtra && (
                                <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1, width: "full" }}>
                                    <Autocomplete
                                        options={credencialesMetaOptions}
                                        value={selectedCredencialMetaExtra}
                                        onChange={(_, value) =>
                                            setForm((prev) => ({ ...prev, credencialMetaExtraId: value?.id || "" }))
                                        }
                                        getOptionLabel={(option) => option?.label || ""}
                                        isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Credencial Meta extra"
                                                variant="outlined"
                                                size="small"
                                                sx={{ ...commonTextFieldSx, width: "500%" }}
                                            />
                                        )}
                                    />
                                </Stack>
                            )}

                            {(form.mostrarComunidad || form.mostrarPasos) && (
                                <Stack direction={{ xs: "column", md: "column" }} spacing={1} sx={{ mb: 1, mt: 1 }}>
                                    {form.mostrarComunidad && (
                                        <TextField
                                            label="Texto Testimonio Comunidad"
                                            variant="outlined"
                                            size="small"
                                            rows={2}
                                            value={form.textoComunidad}
                                            onChange={handleChange("textoComunidad")}
                                            sx={{ ...commonTextFieldSx, width: { xs: "100%", md: "100%" } }}
                                        />
                                    )}
                                    {form.mostrarPasos && (
                                        <TextField
                                            label="Texto Paso a Paso (ej: 1.Clic 2.Msj 3.Carga)"
                                            variant="outlined"
                                            size="small"
                                            value={form.textoPasos}
                                            onChange={handleChange("textoPasos")}
                                            sx={{ ...commonTextFieldSx, width: { xs: "100%", md: "100%" } }}
                                        />
                                    )}
                                </Stack>
                            )}
                        </div>
                    </div>
                    {/* Right column */}
                    <div className="flex flex-col w-full border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0 lg:pr-6">
                        <div className="flex w-full justify-center lg:justify-start mb-3">
                            <h2 className="text-white font-bold text-base underline">Recursos Visuales</h2>
                        </div>
                        <Stack direction="row" spacing={3} className="w-full items-center">
                            <div className="flex flex-col items-center gap-2">
                                <UploadButton
                                    key={`upload-vertical-${uploadKey}`}
                                    label="Fondo Vertical (Mobile)"
                                    onUpload={(file) => {
                                        setForm((prev) => ({ ...prev, backgroundVertical: file }));
                                        setPreviewUrlFromFile("vertical", file);
                                    }}
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
                                    onUpload={(file) => {
                                        setForm((prev) => ({ ...prev, backgroundHorizontal: file }));
                                        setPreviewUrlFromFile("horizontal", file);
                                    }}
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
                        <div className="flex flex-col w-full mt-2 pt-2 items-center gap-2">
                            <UploadButton
                                key={`upload-reemplazoForm-${uploadKey}`}
                                label="Imagen Formulario (Opcional)"
                                onUpload={(file) => {
                                    setForm((prev) => ({ ...prev, imagenReemplazoForm: file }));
                                    setPreviewUrlFromFile("reemplazoForm", file);
                                }}
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
                                disabled={!previewUrls.reemplazoForm}
                                onClick={() => previewUrls.reemplazoForm && window.open(previewUrls.reemplazoForm, "_blank", "noopener,noreferrer")}
                            >
                                Ver Imagen Formulario
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="w-full gap-2 mb-2 mt-2 items-center flex justify-center lg:justify-end border-t border-white/10 pt-3">
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
                        onClick={openPreviewWindow}
                    >
                        Vista Previa
                    </Button>
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






