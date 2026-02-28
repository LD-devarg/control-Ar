import "../assets/css/Landing.css";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import PreviewControls from "../components/PreviewControls";

const NuevoLead = lazy(() => import("../components/FormLeads"));
const DisclaimerLanding = lazy(() => import("../components/DisclaimerLanding"));

const PREVIEW_MESSAGE_TYPE = "landing-preview:update";
const PREVIEW_READY_TYPE = "landing-preview:ready";
const PREVIEW_STORAGE_KEY = "landing_preview_payload_v1";

function normalizeWhatsappNumber(rawNumber) {
    if (!rawNumber) return "";
    return String(rawNumber).replace(/\D/g, "");
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
        mostrar_disclaimer: payload.mostrar_disclaimer !== false,
        mostrar_ticker: payload.mostrar_ticker !== false,
        color_titulo: payload.color_titulo || "#ffffff",
        color_subtitulo: payload.color_subtitulo || "#ffffff",
        color_keyword: payload.color_keyword || "#ffe600",
        color_bono: payload.color_bono || "#ffe600",
        color_info: payload.color_info || "#ffffff",
        bg_type: payload.bg_type || "gradient",
        bg_color: payload.bg_color || "#0f172a",
        bg_gradient: payload.bg_gradient || "linear-gradient(135deg, #0b1f3a 0%, #0f172a 40%, #111827 100%)",
        background_vertical: payload.background_vertical || "",
        background_horizontal: payload.background_horizontal || "",
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

export default function Landing() {
    const [landing, setLanding] = useState(null);
    const [whatsappNumber, setWhatsappNumber] = useState("");
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
    });
    const pixelLoadedRef = useRef(null);
    const rotatingWhatsappRef = useRef(false);

    const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
    const token = useMemo(() => searchParams.get("landing_token"), [searchParams]);
    const isPreviewMode = useMemo(() => searchParams.get("preview") === "1", [searchParams]);
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
        if (isPreviewMode) return;
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
    }, [landing, isPreviewMode]);

    useEffect(() => {
        if (isPreviewMode) return;
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
    }, [token, visitSent, isPreviewMode]);

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
        if (isPreviewMode) return;
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
    }, [fetchWhatsappPeek, token, isPreviewMode]);

    const titleText = hasLandingData ? (landing?.titulo || "BONO DE BIENVENIDA") : "";
    const bonusText = hasLandingData ? (landing?.bono || "🎁 100% 🎉") : "";
    const subtitleText = hasLandingData ? (landing?.subtitulo || "REGISTRATE AHORA Y DUPLICAMOS TU PRIMER DEPÓSITO") : "";
    const buttonText = hasLandingData ? (landing?.texto_boton || "JUGÁ AHORA") : "";
    const infoText = hasLandingData ? (landing?.texto_info || "💬 Atención personalizada las 24hs.") : "";
    const whatsappTemplate = hasLandingData ? (landing?.texto_whatsapp || "") : "";
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
                <span className="keyword" style={{ color: colorKeyword }}>{keyword}</span>
                {after}
            </>
        );
    };

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
            style={{ "--landing-bg-gradient": layoutBackground }}
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
                <div className="landing-content">
                    {hasLandingData ? (
                        <div className="landing-title-container">
                            <h1
                                className="mt-2 mb-4 text-center font-bold landing-fade-in"
                                style={{ color: colorTitulo }}
                            >
                                {titleText}
                            </h1>
                            <div className="landing-bono-pulse">
                                <span className="landing-bono" style={{ color: colorBono }}> {bonusText} </span>
                            </div>
                            <h2 className="font-bold" style={{ color: colorSubtitulo }}>{renderSubtitle()}</h2>
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
                                bonusText={bonusText}
                                whatsappNumber={whatsappNumber}
                                onWhatsappOpened={handleWhatsappOpened}
                                buttonText={buttonText}
                                infoText={infoText}
                                whatsappTemplate={whatsappTemplate}
                                infoColor={colorInfo}
                                isPreview={isPreviewMode}
                            />
                        </Suspense>
                    ) : (
                        <div className="landing-form-fallback" />
                    )}

                    {hasLandingData && landing?.mostrar_disclaimer !== false ? (
                        <div className="flex justify-center w-full lg:w-2/3 mt-8 lg:mt-10 landing-fade-in">
                            <Suspense fallback={null}>
                                <DisclaimerLanding />
                            </Suspense>
                        </div>
                    ) : null}
                </div>
            </section>
            <div className="w-full py-1 flex justify-center">
                <span className="text-sm" style={{ color: colorInfo }}>
                    {hasLandingData ? (landing?.footer_text || "© 2026 ControlAR. Todos los derechos reservados.") : ""}
                </span>
            </div>
            {isPreviewMode ? (
                <div className="fixed top-4 right-4 z-[90] flex items-start gap-2">
                    {previewPanelOpen ? (
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
                            onFormChange={handlePreviewUiChange}
                        />
                    ) : null}
                    <button
                        type="button"
                        onClick={() => setPreviewPanelOpen((prev) => !prev)}
                        className="rounded-full border border-white/30 bg-black/70 px-3 py-2 text-xs font-semibold text-white hover:bg-black/80"
                    >
                        {previewPanelOpen ? "Ocultar panel" : "Mostrar panel"}
                    </button>
                </div>
            ) : null}
        </div>
    );
}
