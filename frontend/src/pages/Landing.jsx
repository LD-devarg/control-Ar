import "../assets/css/Landing.css";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import PreviewControls from "../components/PreviewControls";
import { getLandingFontStack, LANDING_TEXT_STYLE_DEFAULTS } from "../constants/landingTypography";
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import WalletIcon from '@mui/icons-material/Wallet';
import PaymentIcon from '@mui/icons-material/Payment';
import CurrencyBitcoinIcon from '@mui/icons-material/CurrencyBitcoin';

const NuevoLead = lazy(() => import("../components/FormLeads"));
const DisclaimerLanding = lazy(() => import("../components/DisclaimerLanding"));

const PREVIEW_MESSAGE_TYPE = "landing-preview:update";
const PREVIEW_READY_TYPE = "landing-preview:ready";
const PREVIEW_STORAGE_KEY = "landing_preview_payload_v1";

function toNumberValue(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function normalizeWhatsappNumber(rawNumber) {
    if (!rawNumber) return "";
    const digits = String(rawNumber).replace(/\D/g, "");
    if (digits.length === 10) return `549${digits}`;
    if (digits.startsWith("54") && digits.length === 12) return `549${digits.slice(2)}`;
    if (digits.startsWith("0") && digits.length === 11) return `549${digits.slice(1)}`;
    return digits;
}

function buildFakeWinner() {
    const names = [
        "Juan", "Analia", "Carlos", "Micaela", "Diego", "Lucia", "Facundo", "Rocio",
        "Marcos", "Sofia", "Nicolas", "Camila", "Matias", "Florencia", "Gonzalo", "Valentina", "Federico", "Vanesa", "Cristian", "Agustina", "Alejandro", "Natalia",
    ];
    const surnames = ["S", "P", "R", "M", "G", "T", "L", "F", "V", "C", "A", "N"];
    const name = names[Math.floor(Math.random() * names.length)];
    const surnameInitial = surnames[Math.floor(Math.random() * surnames.length)];
    const amount = Math.floor(Math.random() * 700000) + 30000;
    const formattedAmount = new Intl.NumberFormat("es-AR").format(amount);
    return `🎉 ${name} ${surnameInitial}. ganó $${formattedAmount} 🎉`;
}

function normalizePreviewLanding(payload = {}) {
    return {
        titulo: payload.titulo || "BONO DE BIENVENIDA",
        bono: payload.bono || "🎁 100% 🎉",
        subtitulo: payload.subtitulo || "REGISTRATE AHORA Y DUPLICAMOS TU PRIMER DEPÓSITO",
        texto_boton: payload.texto_boton || "JUGÁ AHORA",
        texto_info: payload.texto_info || "💬 Atención personalizada las 24hs.",
        texto_whatsapp: payload.texto_whatsapp || "",
        mostrar_formulario: payload.mostrar_formulario !== false,
        mostrar_campo_nombre: payload.mostrar_campo_nombre !== false,
        mostrar_campo_telefono: payload.mostrar_campo_telefono === true,
        mostrar_disclaimer: payload.mostrar_disclaimer !== false,
        mostrar_ticker: payload.mostrar_ticker !== false,
        mostrar_medios_pago: payload.mostrar_medios_pago === true,
        mostrar_comunidad: payload.mostrar_comunidad === true,
        texto_comunidad: payload.texto_comunidad || "",
        mostrar_pasos: payload.mostrar_pasos === true,
        texto_pasos: payload.texto_pasos || "",
        color_titulo: payload.color_titulo || "#ffffff",
        color_subtitulo: payload.color_subtitulo || "#ffffff",
        color_keyword: payload.color_keyword || "#ffe600",
        color_bono: payload.color_bono || "#ffe600",
        color_info: payload.color_info || "#ffffff",
        form_bg_color: payload.form_bg_color || LANDING_TEXT_STYLE_DEFAULTS.formBgColor,
        form_bg_opacity: toNumberValue(payload.form_bg_opacity, LANDING_TEXT_STYLE_DEFAULTS.formBgOpacity),
        form_field_border_color: payload.form_field_border_color || LANDING_TEXT_STYLE_DEFAULTS.formFieldBorderColor,
        font_titulo: payload.font_titulo || payload.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontTitulo,
        font_subtitulo: payload.font_subtitulo || payload.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontSubtitulo,
        font_keyword: payload.font_keyword || payload.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontKeyword,
        font_bono: payload.font_bono || payload.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontBono,
        font_info: payload.font_info || payload.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontInfo,
        font_boton: payload.font_boton || payload.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontBoton,
        font_form: payload.font_form || payload.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontForm,
        size_titulo: toNumberValue(payload.size_titulo, LANDING_TEXT_STYLE_DEFAULTS.sizeTitulo),
        size_subtitulo: toNumberValue(payload.size_subtitulo, LANDING_TEXT_STYLE_DEFAULTS.sizeSubtitulo),
        size_keyword: toNumberValue(payload.size_keyword, LANDING_TEXT_STYLE_DEFAULTS.sizeKeyword),
        size_bono: toNumberValue(payload.size_bono, LANDING_TEXT_STYLE_DEFAULTS.sizeBono),
        size_info: toNumberValue(payload.size_info, LANDING_TEXT_STYLE_DEFAULTS.sizeInfo),
        size_boton: toNumberValue(payload.size_boton, LANDING_TEXT_STYLE_DEFAULTS.sizeBoton),
        size_form: toNumberValue(payload.size_form, LANDING_TEXT_STYLE_DEFAULTS.sizeForm),
        weight_titulo: toNumberValue(payload.weight_titulo, LANDING_TEXT_STYLE_DEFAULTS.weightTitulo),
        weight_subtitulo: toNumberValue(payload.weight_subtitulo, LANDING_TEXT_STYLE_DEFAULTS.weightSubtitulo),
        weight_keyword: toNumberValue(payload.weight_keyword, LANDING_TEXT_STYLE_DEFAULTS.weightKeyword),
        weight_bono: toNumberValue(payload.weight_bono, LANDING_TEXT_STYLE_DEFAULTS.weightBono),
        weight_info: toNumberValue(payload.weight_info, LANDING_TEXT_STYLE_DEFAULTS.weightInfo),
        weight_boton: toNumberValue(payload.weight_boton, LANDING_TEXT_STYLE_DEFAULTS.weightBoton),
        weight_form: toNumberValue(payload.weight_form, LANDING_TEXT_STYLE_DEFAULTS.weightForm),
        bg_type: payload.bg_type || "gradient",
        bg_color: payload.bg_color || "#0f172a",
        bg_gradient: payload.bg_gradient || "linear-gradient(135deg, #0b1f3a 0%, #0f172a 40%, #111827 100%)",
        background_vertical: payload.background_vertical || "",
        background_horizontal: payload.background_horizontal || "",
        imagen_reemplazo_form: payload.imagen_reemplazo_form || "",
        footer_text: payload.footer_text || "© 2026 ControlAR. Todos los derechos reservados.",
    };
}

function parseGradient(gradient) {
    if (!gradient || typeof gradient !== "string") return null;
    const match = gradient.match(
        /linear-gradient\(\s*([0-9.]+)deg\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*(?:[0-9.]+%?)?\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/
    );
    if (!match) return null;
    return {
        angle: Number(match[1]),
        from: match[2],
        to: match[3],
    };
}

function buildGradient(angle, from, to) {
    return `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
}

function getTextStyle(colorValue, baseStyle = {}) {
    if (colorValue && colorValue.includes("gradient")) {
        return {
            ...baseStyle,
            backgroundImage: colorValue,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent"
        };
    }
    return { ...baseStyle, color: colorValue };
}

export default function Landing() {
    const [landing, setLanding] = useState(null);
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [reservedCode, setReservedCode] = useState("");
    const [reservationToken, setReservationToken] = useState("");
    const [visitSent, setVisitSent] = useState(false);
    const [bgReady, setBgReady] = useState(false);
    const [bgUrl, setBgUrl] = useState("");
    const [previewPanelOpen, setPreviewPanelOpen] = useState(true);
    const [previewUi, setPreviewUi] = useState({
        bgType: "gradient",
        bgGradientAngle: 135,
        bgGradientFrom: "#0b1f3a",
        bgGradientTo: "#111827",
        bgColor: "#0f172a",
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
    });
    const pixelLoadedRef = useRef(null);
    const rotatingWhatsappRef = useRef(false);

    const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
    const token = useMemo(() => searchParams.get("landing_token"), [searchParams]);
    const isPreviewMode = useMemo(() => searchParams.get("preview") === "1", [searchParams]);
    const isTestMode = useMemo(() => searchParams.get("test") === "1", [searchParams]);
    const fakeWinners = useMemo(() => Array.from({ length: 12 }, () => buildFakeWinner()), []);

    const resolveBackgroundUrl = (desktopUrl, mobileUrl) => {
        if (!desktopUrl && !mobileUrl) return "";
        const mediaNarrow = window.matchMedia("(max-width: 768px)");
        const mediaPortrait = window.matchMedia("(orientation: portrait)");
        const useMobile = mediaNarrow.matches || mediaPortrait.matches;
        return useMobile ? (mobileUrl || desktopUrl || "") : (desktopUrl || mobileUrl || "");
    };

    const fetchWhatsappPeek = useCallback(async () => {
        if (isPreviewMode) return "";
        if (!token) return "";
        const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        const response = await axios.get(`${baseUrl}/landings/whatsapp-rotacion/`, {
            params: { landing_token: token },
        });
        return normalizeWhatsappNumber(response.data?.numero);
    }, [token, isPreviewMode]);

    const fetchReservedCode = useCallback(async () => {
        if (isPreviewMode || isTestMode) return "";
        if (!token) return "";
        const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        const response = await axios.post(`${baseUrl}/clientes/reservar-codigo/`, {
            landing_token: token,
        });
        return {
            codigo: String(response.data?.codigo || "").trim(),
            reservationToken: String(response.data?.reservation_token || "").trim(),
        };
    }, [token, isPreviewMode, isTestMode]);

    useEffect(() => {
        if (!isPreviewMode) return undefined;

        try {
            const cached = localStorage.getItem(PREVIEW_STORAGE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                setLanding(normalizePreviewLanding(parsed || {}));
                setVisitSent(true);
            }
        } catch {
            // ignore preview cache errors
        }

        const handlePreviewMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            const message = event?.data;
            if (message?.type !== PREVIEW_MESSAGE_TYPE) return;
            const normalized = normalizePreviewLanding(message.payload || {});
            setLanding(normalized);
            try {
                localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(normalized));
            } catch {
                // ignore preview cache errors
            }
            setWhatsappNumber("");
            setVisitSent(true);
        };

        window.addEventListener("message", handlePreviewMessage);
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: PREVIEW_READY_TYPE }, window.location.origin);
        }
        return () => window.removeEventListener("message", handlePreviewMessage);
    }, [isPreviewMode]);

    useEffect(() => {
        if (isPreviewMode || isTestMode) return undefined;
        let mounted = true;
        const loadReservedCode = async () => {
            try {
                const reservation = await fetchReservedCode();
                if (mounted) {
                    setReservedCode(reservation?.codigo || "");
                    setReservationToken(reservation?.reservationToken || "");
                }
            } catch {
                if (mounted) {
                    setReservedCode("");
                    setReservationToken("");
                }
            }
        };
        loadReservedCode();
        return () => {
            mounted = false;
        };
    }, [fetchReservedCode, isPreviewMode, isTestMode]);

    useEffect(() => {
        if (isPreviewMode) return undefined;
        let mounted = true;
        const cacheKey = token ? `landing_cache_${token}` : null;
        if (cacheKey) {
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed && mounted) {
                        setLanding(parsed);
                    }
                }
            } catch {
                // ignore cache errors
            }
        }
        const fetchLanding = async () => {
            if (!token) return;
            try {
                const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
                const response = await axios.get(`${baseUrl}/landings/public/`, {
                    params: { landing_token: token },
                });
                if (mounted) {
                    setLanding(response.data);
                    if (cacheKey) {
                        try {
                            localStorage.setItem(cacheKey, JSON.stringify(response.data));
                        } catch {
                            // ignore cache errors
                        }
                    }
                }
            } catch {
                // keep last valid landing if fetch fails
            }
        };
        fetchLanding();
        return () => {
            mounted = false;
        };
    }, [token, isPreviewMode]);

    const hasLandingData = Boolean(landing);

    useEffect(() => {
        if (!isPreviewMode || !landing) return;
        const parsed = parseGradient(landing.bg_gradient);
        setPreviewUi({
            bgType: landing.bg_type || "gradient",
            bgGradientAngle: parsed?.angle ?? 135,
            bgGradientFrom: parsed?.from ?? "#0b1f3a",
            bgGradientTo: parsed?.to ?? "#111827",
            bgColor: landing.bg_color || "#0f172a",
            colorTitulo: landing.color_titulo || "#ffffff",
            colorSubtitulo: landing.color_subtitulo || "#ffffff",
            colorKeyword: landing.color_keyword || "#ffe600",
            colorBono: landing.color_bono || "#ffe600",
            colorInfo: landing.color_info || "#ffffff",
            formBgColor: landing.form_bg_color || LANDING_TEXT_STYLE_DEFAULTS.formBgColor,
            formBgOpacity: toNumberValue(landing.form_bg_opacity, LANDING_TEXT_STYLE_DEFAULTS.formBgOpacity),
            formFieldBorderColor: landing.form_field_border_color || LANDING_TEXT_STYLE_DEFAULTS.formFieldBorderColor,
            fontTitulo: landing.font_titulo || landing.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontTitulo,
            fontSubtitulo: landing.font_subtitulo || landing.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontSubtitulo,
            fontKeyword: landing.font_keyword || landing.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontKeyword,
            fontBono: landing.font_bono || landing.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontBono,
            fontInfo: landing.font_info || landing.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontInfo,
            fontBoton: landing.font_boton || landing.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontBoton,
            fontForm: landing.font_form || landing.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontForm,
            sizeTitulo: toNumberValue(landing.size_titulo, LANDING_TEXT_STYLE_DEFAULTS.sizeTitulo),
            sizeSubtitulo: toNumberValue(landing.size_subtitulo, LANDING_TEXT_STYLE_DEFAULTS.sizeSubtitulo),
            sizeKeyword: toNumberValue(landing.size_keyword, LANDING_TEXT_STYLE_DEFAULTS.sizeKeyword),
            sizeBono: toNumberValue(landing.size_bono, LANDING_TEXT_STYLE_DEFAULTS.sizeBono),
            sizeInfo: toNumberValue(landing.size_info, LANDING_TEXT_STYLE_DEFAULTS.sizeInfo),
            sizeBoton: toNumberValue(landing.size_boton, LANDING_TEXT_STYLE_DEFAULTS.sizeBoton),
            sizeForm: toNumberValue(landing.size_form, LANDING_TEXT_STYLE_DEFAULTS.sizeForm),
            weightTitulo: toNumberValue(landing.weight_titulo, LANDING_TEXT_STYLE_DEFAULTS.weightTitulo),
            weightSubtitulo: toNumberValue(landing.weight_subtitulo, LANDING_TEXT_STYLE_DEFAULTS.weightSubtitulo),
            weightKeyword: toNumberValue(landing.weight_keyword, LANDING_TEXT_STYLE_DEFAULTS.weightKeyword),
            weightBono: toNumberValue(landing.weight_bono, LANDING_TEXT_STYLE_DEFAULTS.weightBono),
            weightInfo: toNumberValue(landing.weight_info, LANDING_TEXT_STYLE_DEFAULTS.weightInfo),
            weightBoton: toNumberValue(landing.weight_boton, LANDING_TEXT_STYLE_DEFAULTS.weightBoton),
            weightForm: toNumberValue(landing.weight_form, LANDING_TEXT_STYLE_DEFAULTS.weightForm),
        });
    }, [isPreviewMode, landing]);

    const handlePreviewUiChange = useCallback((patch) => {
        if (!isPreviewMode) return;
        setPreviewUi((prev) => {
            const nextUi = { ...prev, ...patch };
            setLanding((prevLanding) => {
                if (!prevLanding) return prevLanding;
                const nextLanding = {
                    ...prevLanding,
                    bg_type: nextUi.bgType,
                    bg_color: nextUi.bgColor,
                    color_titulo: nextUi.colorTitulo,
                    color_subtitulo: nextUi.colorSubtitulo,
                    color_keyword: nextUi.colorKeyword,
                    color_bono: nextUi.colorBono,
                    color_info: nextUi.colorInfo,
                    form_bg_color: nextUi.formBgColor,
                    form_bg_opacity: toNumberValue(nextUi.formBgOpacity, LANDING_TEXT_STYLE_DEFAULTS.formBgOpacity),
                    form_field_border_color: nextUi.formFieldBorderColor,
                    font_titulo: nextUi.fontTitulo,
                    font_subtitulo: nextUi.fontSubtitulo,
                    font_keyword: nextUi.fontKeyword,
                    font_bono: nextUi.fontBono,
                    font_info: nextUi.fontInfo,
                    font_boton: nextUi.fontBoton,
                    font_form: nextUi.fontForm,
                    size_titulo: toNumberValue(nextUi.sizeTitulo, LANDING_TEXT_STYLE_DEFAULTS.sizeTitulo),
                    size_subtitulo: toNumberValue(nextUi.sizeSubtitulo, LANDING_TEXT_STYLE_DEFAULTS.sizeSubtitulo),
                    size_keyword: toNumberValue(nextUi.sizeKeyword, LANDING_TEXT_STYLE_DEFAULTS.sizeKeyword),
                    size_bono: toNumberValue(nextUi.sizeBono, LANDING_TEXT_STYLE_DEFAULTS.sizeBono),
                    size_info: toNumberValue(nextUi.sizeInfo, LANDING_TEXT_STYLE_DEFAULTS.sizeInfo),
                    size_boton: toNumberValue(nextUi.sizeBoton, LANDING_TEXT_STYLE_DEFAULTS.sizeBoton),
                    size_form: toNumberValue(nextUi.sizeForm, LANDING_TEXT_STYLE_DEFAULTS.sizeForm),
                    weight_titulo: toNumberValue(nextUi.weightTitulo, LANDING_TEXT_STYLE_DEFAULTS.weightTitulo),
                    weight_subtitulo: toNumberValue(nextUi.weightSubtitulo, LANDING_TEXT_STYLE_DEFAULTS.weightSubtitulo),
                    weight_keyword: toNumberValue(nextUi.weightKeyword, LANDING_TEXT_STYLE_DEFAULTS.weightKeyword),
                    weight_bono: toNumberValue(nextUi.weightBono, LANDING_TEXT_STYLE_DEFAULTS.weightBono),
                    weight_info: toNumberValue(nextUi.weightInfo, LANDING_TEXT_STYLE_DEFAULTS.weightInfo),
                    weight_boton: toNumberValue(nextUi.weightBoton, LANDING_TEXT_STYLE_DEFAULTS.weightBoton),
                    weight_form: toNumberValue(nextUi.weightForm, LANDING_TEXT_STYLE_DEFAULTS.weightForm),
                    bg_gradient: buildGradient(nextUi.bgGradientAngle, nextUi.bgGradientFrom, nextUi.bgGradientTo),
                };
                try {
                    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(nextLanding));
                } catch {
                    // ignore preview cache errors
                }
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({ type: PREVIEW_MESSAGE_TYPE, payload: nextLanding }, window.location.origin);
                }
                return nextLanding;
            });
            return nextUi;
        });
    }, [isPreviewMode]);

    useEffect(() => {
        if (isPreviewMode || isTestMode) return;
        const pixelId = landing?.pixel_id;
        if (!pixelId) return;
        if (pixelLoadedRef.current === pixelId) return;
        pixelLoadedRef.current = pixelId;

        const loadPixel = () => {
            if (!window.fbq) {
                window.fbq = function () {
                    window.fbq.callMethod
                        ? window.fbq.callMethod.apply(window.fbq, arguments)
                        : window.fbq.queue.push(arguments);
                };
                window.fbq.queue = [];
                window.fbq.version = "2.0";
                window.fbq.loaded = true;

                const script = document.createElement("script");
                script.async = true;
                script.src = "https://connect.facebook.net/en_US/fbevents.js";
                script.id = "fb-pixel-script";
                document.head.appendChild(script);
            }

            window.fbq("init", pixelId);
            window.fbq("track", "PageView");
        };

        if (typeof window.requestIdleCallback === "function") {
            window.requestIdleCallback(loadPixel, { timeout: 1500 });
        } else {
            window.setTimeout(loadPixel, 500);
        }
    }, [landing, isPreviewMode, isTestMode]);

    useEffect(() => {
        if (isPreviewMode || isTestMode) return;
        if (!token || visitSent) return;
        let cancelled = false;
        const sendVisit = async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
                await axios.post(`${baseUrl}/landing-visits/`, {
                    landing_token: token,
                });
                if (!cancelled) setVisitSent(true);
            } catch {
                if (!cancelled) setVisitSent(true);
            }
        };
        sendVisit();
        return () => {
            cancelled = true;
        };
    }, [token, visitSent, isPreviewMode, isTestMode]);

    useEffect(() => {
        if (isPreviewMode) return undefined;
        let mounted = true;
        const fetchWhatsapp = async () => {
            if (!token) return;
            try {
                const nextNumber = await fetchWhatsappPeek();
                if (mounted) {
                    setWhatsappNumber(nextNumber);
                }
            } catch {
                if (mounted) {
                    setWhatsappNumber("");
                }
            }
        };
        fetchWhatsapp();
        return () => {
            mounted = false;
        };
    }, [fetchWhatsappPeek, token, isPreviewMode]);

    const handleWhatsappOpened = useCallback(async () => {
        if (isPreviewMode || isTestMode) return;
        if (!token || rotatingWhatsappRef.current) return;
        rotatingWhatsappRef.current = true;
        try {
            const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
            const { data } = await axios.post(`${baseUrl}/landings/whatsapp-rotacion/consume/`, {
                landing_token: token,
            });
            const siguienteNumero = normalizeWhatsappNumber(data?.siguiente_numero);
            if (siguienteNumero) {
                setWhatsappNumber(siguienteNumero);
            } else {
                const fallback = await fetchWhatsappPeek();
                setWhatsappNumber(fallback);
            }
        } catch {
            // keep current number if rotation fails
        } finally {
            rotatingWhatsappRef.current = false;
        }
    }, [fetchWhatsappPeek, token, isPreviewMode, isTestMode]);

    const titleText = hasLandingData ? (landing?.titulo || "BONO DE BIENVENIDA") : "";
    const bonusText = hasLandingData ? (landing?.bono || "🎁 100% 🎉") : "";
    const subtitleText = hasLandingData ? (landing?.subtitulo || "REGISTRATE AHORA Y DUPLICAMOS TU PRIMER DEPÓSITO") : "";
    const buttonText = hasLandingData ? (landing?.texto_boton || "JUGÁ AHORA") : "";
    const infoText = hasLandingData ? (landing?.texto_info || "💬 Atención personalizada las 24hs.") : "";
    const whatsappTemplate = hasLandingData ? (landing?.texto_whatsapp || "") : "";
    const mostrarMediosPago = hasLandingData ? (landing?.mostrar_medios_pago === true) : false;
    const mostrarComunidad = hasLandingData ? (landing?.mostrar_comunidad === true) : false;
    const textoComunidad = hasLandingData ? (landing?.texto_comunidad || "") : "";
    const mostrarPasos = hasLandingData ? (landing?.mostrar_pasos === true) : false;
    const textoPasos = hasLandingData ? (landing?.texto_pasos || "") : "";
    const bgDesktop = landing?.background_horizontal || null;
    const bgMobile = landing?.background_vertical || null;
    const bgType = landing?.bg_type || "gradient";
    const bgColor = landing?.bg_color || "#0f172a";
    const bgGradient = landing?.bg_gradient || "linear-gradient(135deg, #0b1f3a 0%, #0f172a 40%, #111827 100%)";
    const hasBgImage = Boolean(bgDesktop || bgMobile);
    const colorTitulo = landing?.color_titulo || "#ffffff";
    const colorSubtitulo = landing?.color_subtitulo || "#ffffff";
    const colorKeyword = landing?.color_keyword || "#ffe600";
    const colorBono = landing?.color_bono || "#ffe600";
    const colorInfo = landing?.color_info || "#ffffff";
    const formBgColor = landing?.form_bg_color || LANDING_TEXT_STYLE_DEFAULTS.formBgColor;
    const formBgOpacity = toNumberValue(landing?.form_bg_opacity, LANDING_TEXT_STYLE_DEFAULTS.formBgOpacity);
    const formFieldBorderColor = landing?.form_field_border_color || LANDING_TEXT_STYLE_DEFAULTS.formFieldBorderColor;
    const fontTitulo = landing?.font_titulo || landing?.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontTitulo;
    const fontSubtitulo = landing?.font_subtitulo || landing?.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontSubtitulo;
    const fontKeyword = landing?.font_keyword || landing?.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontKeyword;
    const fontBono = landing?.font_bono || landing?.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontBono;
    const fontInfo = landing?.font_info || landing?.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontInfo;
    const fontBoton = landing?.font_boton || landing?.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontBoton;
    const fontForm = landing?.font_form || landing?.font_family || LANDING_TEXT_STYLE_DEFAULTS.fontForm;
    const sizeTitulo = toNumberValue(landing?.size_titulo, LANDING_TEXT_STYLE_DEFAULTS.sizeTitulo);
    const sizeSubtitulo = toNumberValue(landing?.size_subtitulo, LANDING_TEXT_STYLE_DEFAULTS.sizeSubtitulo);
    const sizeKeyword = toNumberValue(landing?.size_keyword, LANDING_TEXT_STYLE_DEFAULTS.sizeKeyword);
    const sizeBono = toNumberValue(landing?.size_bono, LANDING_TEXT_STYLE_DEFAULTS.sizeBono);
    const sizeInfo = toNumberValue(landing?.size_info, LANDING_TEXT_STYLE_DEFAULTS.sizeInfo);
    const sizeBoton = toNumberValue(landing?.size_boton, LANDING_TEXT_STYLE_DEFAULTS.sizeBoton);
    const sizeForm = toNumberValue(landing?.size_form, LANDING_TEXT_STYLE_DEFAULTS.sizeForm);
    const weightTitulo = toNumberValue(landing?.weight_titulo, LANDING_TEXT_STYLE_DEFAULTS.weightTitulo);
    const weightSubtitulo = toNumberValue(landing?.weight_subtitulo, LANDING_TEXT_STYLE_DEFAULTS.weightSubtitulo);
    const weightKeyword = toNumberValue(landing?.weight_keyword, LANDING_TEXT_STYLE_DEFAULTS.weightKeyword);
    const weightBono = toNumberValue(landing?.weight_bono, LANDING_TEXT_STYLE_DEFAULTS.weightBono);
    const weightInfo = toNumberValue(landing?.weight_info, LANDING_TEXT_STYLE_DEFAULTS.weightInfo);
    const weightBoton = toNumberValue(landing?.weight_boton, LANDING_TEXT_STYLE_DEFAULTS.weightBoton);
    const weightForm = toNumberValue(landing?.weight_form, LANDING_TEXT_STYLE_DEFAULTS.weightForm);
    const fontTituloStack = getLandingFontStack(fontTitulo);
    const fontSubtituloStack = getLandingFontStack(fontSubtitulo);
    const fontKeywordStack = getLandingFontStack(fontKeyword);
    const fontBonoStack = getLandingFontStack(fontBono);
    const fontInfoStack = getLandingFontStack(fontInfo);
    const showTicker = hasLandingData && landing?.mostrar_ticker !== false;
    const keyword = "DUPLICAMOS";

    const renderSubtitle = () => {
        if (!subtitleText) return null;
        const index = subtitleText.toUpperCase().indexOf(keyword);
        if (index === -1) {
            return subtitleText;
        }
        const before = subtitleText.slice(0, index);
        const after = subtitleText.slice(index + keyword.length);
        return (
            <>
                {before}
                <span className="keyword" style={getTextStyle(colorKeyword, { fontFamily: fontKeywordStack, fontSize: `${sizeKeyword}rem`, fontWeight: weightKeyword })}>{keyword}</span>
                {after}
            </>
        );
    };

    const renderPasos = (texto) => {
        if (!texto) return null;
        const parts = texto.split(/(?=\d+[.-]\s*)/).filter(Boolean);
        
        if (parts.length > 1) {
            return (
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 w-full">
                    {parts.map((p, i) => {
                        const cleanText = p.replace(/^\d+[.-]\s*/, '').trim();
                        if (!cleanText) return null;
                        return (
                            <div key={i} className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-lg">
                                <span className="flex items-center justify-center min-w-[22px] min-h-[22px] rounded-full bg-white/20 text-white text-[11px] font-bold">
                                    {i + 1}
                                </span>
                                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: colorInfo, fontFamily: fontInfoStack }}>
                                    {cleanText}
                                </span>
                                {i < parts.length - 1 && (
                                    <span className="text-white/40 ml-1 md:ml-2 hidden md:inline text-xs">➔</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )
        }
        
        return (
            <span className="text-center text-sm/relaxed font-semibold bg-black/60 px-6 py-3 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md" style={{ color: colorInfo, fontFamily: fontInfoStack }}>
                {texto}
            </span>
        );
    };

    const renderMediosPago = () => (
        <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-4 w-full mt-2 lg:mt-3 opacity-95">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#009EE3]/20 border border-[#009EE3]/40 rounded-xl text-blue-100 text-xs font-bold tracking-wide backdrop-blur-sm">
                <WalletIcon fontSize="small" sx={{ color: '#009EE3', fontSize: 18 }}/>
                <span>MercadoPago</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-100 text-xs font-bold tracking-wide backdrop-blur-sm">
                <AccountBalanceIcon fontSize="small" sx={{ color: '#818cf8', fontSize: 18 }}/>
                <span>Transferencia</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 border border-teal-400/40 rounded-xl text-teal-100 text-xs font-bold tracking-wide backdrop-blur-sm">
                <PaymentIcon fontSize="small" sx={{ color: '#2dd4bf', fontSize: 18 }}/>
                <span>Ualá</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 border border-yellow-400/40 rounded-xl text-yellow-100 text-xs font-bold tracking-wide backdrop-blur-sm">
                <CurrencyBitcoinIcon fontSize="small" sx={{ color: '#facc15', fontSize: 18 }}/>
                <span>Cripto</span>
            </div>
        </div>
    );

    useEffect(() => {
        if (!hasBgImage) {
            setBgUrl("");
            setBgReady(false);
            return undefined;
        }

        const mediaNarrow = window.matchMedia("(max-width: 768px)");
        const mediaPortrait = window.matchMedia("(orientation: portrait)");

        const syncBackground = () => {
            const nextUrl = resolveBackgroundUrl(bgDesktop, bgMobile);
            setBgUrl(nextUrl);
            setBgReady(Boolean(nextUrl));
        };

        syncBackground();
        const handleChange = () => syncBackground();
        mediaNarrow.addEventListener("change", handleChange);
        mediaPortrait.addEventListener("change", handleChange);

        return () => {
            mediaNarrow.removeEventListener("change", handleChange);
            mediaPortrait.removeEventListener("change", handleChange);
        };
    }, [bgDesktop, bgMobile, hasBgImage]);

    useEffect(() => {
        if (!bgUrl) return;
        let preloadLink = document.getElementById("landing-bg-preload");
        if (!preloadLink) {
            preloadLink = document.createElement("link");
            preloadLink.id = "landing-bg-preload";
            preloadLink.rel = "preload";
            preloadLink.as = "image";
            document.head.appendChild(preloadLink);
        }
        preloadLink.href = bgUrl;
    }, [bgUrl]);

    const layoutBackground = bgType === "gradient" ? bgGradient : bgColor;

    return (
        <div
            className="landing-layout"
            style={{
                "--landing-bg-gradient": layoutBackground,
                "--landing-font-family": fontInfoStack,
                "--landing-font-scale": "1",
            }}
        >
            {showTicker ? (
                <div className="landing-ticker">
                    <div className="landing-ticker-track" aria-live="off">
                        {[...fakeWinners, ...fakeWinners].map((item, index) => (
                            <span key={`${item}-${index}`} className="landing-ticker-item">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            ) : null}
            <section
                className="landing-container"
                style={{
                    background: bgType === "gradient" ? bgGradient : bgColor,
                }}
            >
                {bgReady && bgUrl ? (
                    <img
                        className="landing-bg-image"
                        src={bgUrl}
                        alt=""
                        fetchPriority="high"
                        loading="eager"
                        decoding="async"
                    />
                ) : null}
                <div className="relative z-index-1 w-full flex flex-col items-center justify-center h-full">
                    {hasLandingData ? (
                        <div className="text-center">
                            <h1
                                className="mt-10 text-center font-bold landing-fade-in"
                                style={getTextStyle(colorTitulo, { fontFamily: fontTituloStack, fontSize: `${sizeTitulo}rem`, fontWeight: weightTitulo })}
                            >
                                {titleText}
                            </h1>
                            <div className="landing-bono-pulse">
                                <span className="landing-bono" style={getTextStyle(colorBono, { fontFamily: fontBonoStack, fontSize: `${sizeBono}rem`, fontWeight: weightBono })}> {bonusText} </span>
                            </div>
                            <h2 className="" style={getTextStyle(colorSubtitulo, { fontFamily: fontSubtituloStack, fontSize: `${sizeSubtitulo}rem`, fontWeight: weightSubtitulo })}>{renderSubtitle()}</h2>
                            {hasLandingData && mostrarComunidad && textoComunidad && (
                                <div className="mt-1 mb-1 px-2 lg:p-0 landing-fade-in flex justify-center w-full ">
                                    <span className="px-4 py-1 rounded-full bg-white/10 border border-white/20 text-white font-semibold backdrop-blur-sm text-sm" style={{ fontFamily: fontSubtituloStack, color: colorSubtitulo }}>
                                        {textoComunidad}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="landing-title-skeleton" aria-hidden="true">
                            <div className="landing-skeleton-line landing-skeleton-title" />
                            <div className="landing-skeleton-line landing-skeleton-bono" />
                            <div className="landing-skeleton-line landing-skeleton-subtitle" />
                        </div>
                    )}

                    {hasLandingData ? (
                        <Suspense fallback={<div className="landing-form-fallback" />}>
                            <NuevoLead
                                landingToken={isPreviewMode ? "preview" : token}
                                reservedCode={reservedCode}
                                reservationToken={reservationToken}
                                codePrefix={landing?.empresa_codigo_prefijo || "CL"}
                                bonusText={bonusText}
                                whatsappNumber={whatsappNumber}
                                onWhatsappOpened={handleWhatsappOpened}
                                buttonText={buttonText}
                                infoText={infoText}
                                whatsappTemplate={whatsappTemplate}
                                infoColor={colorInfo}
                                formBgColor={formBgColor}
                                formBgOpacity={formBgOpacity}
                                formFieldBorderColor={formFieldBorderColor}
                                formTextFontFamily={fontForm}
                                formTextFontSize={sizeForm}
                                formTextFontWeight={weightForm}
                                buttonFontFamily={fontBoton}
                                buttonFontSize={sizeBoton}
                                buttonFontWeight={weightBoton}
                                infoFontFamily={fontInfo}
                                infoFontSize={sizeInfo}
                                infoFontWeight={weightInfo}
                                mostrarFormulario={hasLandingData ? landing?.mostrar_formulario !== false : true}
                                mostrarCampoNombre={hasLandingData ? landing?.mostrar_campo_nombre !== false : true}
                                mostrarCampoTelefono={hasLandingData ? landing?.mostrar_campo_telefono === true : false}
                                imagenReemplazoForm={hasLandingData ? landing?.imagen_reemplazo_form : ""}
                                isPreview={isPreviewMode}
                                isTestMode={isTestMode}
                                pasosNode={hasLandingData && mostrarPasos && textoPasos ? renderPasos(textoPasos) : null}
                                mediosPagoNode={hasLandingData && mostrarMediosPago ? renderMediosPago() : null}
                            />
                        </Suspense>
                    ) : (
                        <div className="landing-form-fallback" />
                    )}

                    {isTestMode ? (
                        <div className="mt-3 rounded-full border border-amber-300/60 bg-amber-500/12 px-4 py-2 text-center text-xs font-semibold tracking-[0.08em] text-amber-100">
                            MODO TEST · no guarda cliente, no envía Meta y no consume rotación
                        </div>
                    ) : null}

                    {hasLandingData && landing?.mostrar_disclaimer !== false ? (
                        <div className="flex justify-center w-full mt-6 mb-2 lg:mt-8 landing-fade-in sticky bottom-4 z-10 px-2">
                            <Suspense fallback={null}>
                                <DisclaimerLanding />
                            </Suspense>
                        </div>
                    ) : null}
                </div>
            </section>
            <div className="w-full py-2 flex justify-center bg-black/80 relative z-20">
                <span className="text-xs text-gray">
                    {hasLandingData ? (landing?.footer_text || "© 2026 ControlAR. Todos los derechos reservados.") : ""}
                </span>
            </div>
            {isPreviewMode ? (
                <div className="fixed top-3 right-3 z-[90] flex flex-col items-end gap-2">
                    <button
                        type="button"
                        onClick={() => setPreviewPanelOpen((prev) => !prev)}
                        className="rounded-full border border-white/30 bg-black/75 px-3 py-2 text-xs font-semibold text-white hover:bg-black/90 backdrop-blur-sm"
                    >
                        {previewPanelOpen ? "Ocultar panel" : "Editar"}
                    </button>
                    <div
                        className={`transition-all duration-300 ease-out origin-top-right ${previewPanelOpen
                            ? "opacity-100 translate-x-0 pointer-events-auto"
                            : "opacity-0 translate-x-8 pointer-events-none"
                            }`}
                    >
                        <PreviewControls
                            bgType={previewUi.bgType}
                            bgGradientAngle={previewUi.bgGradientAngle}
                            bgGradientFrom={previewUi.bgGradientFrom}
                            bgGradientTo={previewUi.bgGradientTo}
                            bgColor={previewUi.bgColor}
                            colorTitulo={previewUi.colorTitulo}
                            colorSubtitulo={previewUi.colorSubtitulo}
                            colorKeyword={previewUi.colorKeyword}
                            colorBono={previewUi.colorBono}
                            colorInfo={previewUi.colorInfo}
                            formBgColor={previewUi.formBgColor}
                            formBgOpacity={previewUi.formBgOpacity}
                            formFieldBorderColor={previewUi.formFieldBorderColor}
                            fontTitulo={previewUi.fontTitulo}
                            fontSubtitulo={previewUi.fontSubtitulo}
                            fontKeyword={previewUi.fontKeyword}
                            fontBono={previewUi.fontBono}
                            fontInfo={previewUi.fontInfo}
                            fontBoton={previewUi.fontBoton}
                            fontForm={previewUi.fontForm}
                            sizeTitulo={previewUi.sizeTitulo}
                            sizeSubtitulo={previewUi.sizeSubtitulo}
                            sizeKeyword={previewUi.sizeKeyword}
                            sizeBono={previewUi.sizeBono}
                            sizeInfo={previewUi.sizeInfo}
                            sizeBoton={previewUi.sizeBoton}
                            sizeForm={previewUi.sizeForm}
                            weightTitulo={previewUi.weightTitulo}
                            weightSubtitulo={previewUi.weightSubtitulo}
                            weightKeyword={previewUi.weightKeyword}
                            weightBono={previewUi.weightBono}
                            weightInfo={previewUi.weightInfo}
                            weightBoton={previewUi.weightBoton}
                            weightForm={previewUi.weightForm}
                            onFormChange={handlePreviewUiChange}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
