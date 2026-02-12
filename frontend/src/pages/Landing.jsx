import "../assets/css/Landing.css";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { motion } from "motion/react";
import NuevoLead from "../components/FormLeads";
import DisclaimerLanding from "../components/DisclaimerLanding";

function normalizeWhatsappNumber(rawNumber) {
    if (!rawNumber) return "";
    return String(rawNumber).replace(/\D/g, "");
}

export default function Landing() {
    const [landing, setLanding] = useState(null);
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [visitSent, setVisitSent] = useState(false);
    const [bgReady, setBgReady] = useState(false);
    const [bgUrl, setBgUrl] = useState("");
    const pixelLoadedRef = useRef(null);

    const token = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get("landing_token");
    }, []);

    useEffect(() => {
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
            } catch (error) {
                // keep last valid landing if fetch fails
            }
        };
        fetchLanding();
        return () => {
            mounted = false;
        };
    }, [token]);

    useEffect(() => {
        const pixelId = landing?.pixel_id;
        if (!pixelId) return;
        if (pixelLoadedRef.current === pixelId) return;
        pixelLoadedRef.current = pixelId;

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

        let noscript = document.getElementById("fb-pixel-noscript");
        if (!noscript) {
            noscript = document.createElement("noscript");
            noscript.id = "fb-pixel-noscript";
            document.body.appendChild(noscript);
        }
        noscript.innerHTML = "";
        const img = document.createElement("img");
        img.height = 1;
        img.width = 1;
        img.style.display = "none";
        img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
        noscript.appendChild(img);
        return () => {
            if (noscript?.parentNode) {
                noscript.parentNode.removeChild(noscript);
            }
        };
    }, [landing]);

    useEffect(() => {
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
    }, [token, visitSent]);

    useEffect(() => {
        let mounted = true;
        const fetchWhatsapp = async () => {
            if (!token) return;
            try {
                const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
                const response = await axios.get(`${baseUrl}/landings/whatsapp-rotacion/`, {
                    params: { landing_token: token },
                });
                if (mounted) {
                    setWhatsappNumber(normalizeWhatsappNumber(response.data?.numero));
                }
            } catch (error) {
                if (mounted) {
                    setWhatsappNumber("");
                }
            }
        };
        fetchWhatsapp();
        return () => {
            mounted = false;
        };
    }, [token]);

    const titleText = landing?.titulo || "BONO DE BIENVENIDA";
    const bonusText = landing?.bono || "100%";
    const subtitleText = landing?.subtitulo || "REGISTRATE AHORA Y DUPLICAMOS TU PRIMER DEPÓSITO";
    const buttonText = landing?.texto_boton || "JUGÁ AHORA";
    const infoText = landing?.texto_info || "🤳Atención personalizada las 24hs.";
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

        let cancelled = false;
        const mediaNarrow = window.matchMedia("(max-width: 768px)");
        const mediaPortrait = window.matchMedia("(orientation: portrait)");

        const pickUrl = () => {
            const useMobile = mediaNarrow.matches || mediaPortrait.matches;
            return useMobile ? bgMobile : bgDesktop;
        };

        const preload = () => {
            const nextUrl = pickUrl();
            if (!nextUrl) {
                setBgUrl("");
                setBgReady(false);
                return;
            }
            let preloadLink = document.getElementById("landing-bg-preload");
            if (!preloadLink) {
                preloadLink = document.createElement("link");
                preloadLink.id = "landing-bg-preload";
                preloadLink.rel = "preload";
                preloadLink.as = "image";
                document.head.appendChild(preloadLink);
            }
            preloadLink.href = nextUrl;
            const img = new Image();
            img.onload = () => {
                if (!cancelled) {
                    setBgUrl(nextUrl);
                    setBgReady(true);
                }
            };
            img.onerror = () => {
                if (!cancelled) {
                    setBgUrl("");
                    setBgReady(false);
                }
            };
            img.src = nextUrl;
        };

        preload();
        const handleChange = () => preload();
        mediaNarrow.addEventListener("change", handleChange);
        mediaPortrait.addEventListener("change", handleChange);

        return () => {
            cancelled = true;
            mediaNarrow.removeEventListener("change", handleChange);
            mediaPortrait.removeEventListener("change", handleChange);
        };
    }, [bgDesktop, bgMobile, hasBgImage]);

    const layoutBackground =
        bgType === "gradient"
            ? bgGradient
            : bgColor;

    return (
        <div
            className="landing-layout"
            style={{ "--landing-bg-gradient": layoutBackground }}
        >
            <section
                className="landing-container"
                style={{
                    background: bgType === "gradient" ? bgGradient : bgColor,
                    ...(bgReady && bgUrl ? { backgroundImage: `url('${bgUrl}')` } : {}),
                }}
            >
                <div className="landing-title-container">
                    <motion.h1
                    className="mt-5"
                    initial= {{ opacity: 0 }}
                    animate={{ opacity: 1 , scale: [1, 1.2, 1] }}
                    transition={{ duration: 1 }}
                    style={{ color: colorTitulo }}
                    >{titleText}</motion.h1>
                    <motion.span className="landing-bono"
                    animate={{ opacity: 1, scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1, repeat: 10, repeatDelay: 1 }}
                    style={{ color: colorBono }}
                    > {bonusText} </motion.span>
                    <h2 className="font-bold" style={{ color: colorSubtitulo }}>{renderSubtitle()}</h2>
                </div>
                <NuevoLead
                    landingToken={token}
                    bonusText={bonusText}
                    whatsappNumber={whatsappNumber}
                    buttonText={buttonText}
                    infoText={infoText}
                    infoColor={colorInfo}
                />
                {landing?.mostrar_disclaimer !== false ? (
                    <motion.div
                        className="flex justify-center w-full lg:w-2/3"
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                    >
                        <DisclaimerLanding />
                    </motion.div>
                ) : null}
            </section>
        </div>
    );
}
