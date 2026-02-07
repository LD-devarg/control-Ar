import "../assets/css/Landing.css";
import { useEffect, useMemo, useState } from "react";
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

    const token = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get("landing_token");
    }, []);

    useEffect(() => {
        let mounted = true;
        const fetchLanding = async () => {
            if (!token) return;
            try {
                const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
                const response = await axios.get(`${baseUrl}/landings/public/`, {
                    params: { landing_token: token },
                });
                if (mounted) {
                    setLanding(response.data);
                }
            } catch (error) {
                if (mounted) {
                    setLanding(null);
                }
            }
        };
        fetchLanding();
        return () => {
            mounted = false;
        };
    }, [token]);

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
    const subtitleText = landing?.subtitulo || "REGISTRATE AHORA Y";
    const buttonText = landing?.texto_boton || "JUGÁ AHORA";
    const infoText = landing?.texto_info || "🤳Atención personalizada las 24hs.";
    const bgDesktop = landing?.background_horizontal || null;
    const bgMobile = landing?.background_vertical || null;
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
                <span className="keyword">{keyword}</span>
                {after}
            </>
        );
    };

    return (
        <div className="landing-layout">
            <section
                className="landing-container"
                style={{
                    "--landing-bg-desktop": bgDesktop ? `url('${bgDesktop}')` : undefined,
                    "--landing-bg-mobile": bgMobile ? `url('${bgMobile}')` : undefined,
                }}
            >
                <div className="landing-title-container">
                    <motion.h1
                    className="mt-5"
                    initial= {{ opacity: 0 }}
                    animate={{ opacity: 1 , scale: [1, 1.2, 1] }}
                    transition={{ duration: 1 }}
                    >{titleText}</motion.h1>
                    <motion.span className="landing-bono"
                    animate={{ opacity: 1, scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1, repeat: 10, repeatDelay: 1 }}
                    >🎁 {bonusText} 🎁</motion.span>
                    <h2 className="text-white font-bold">{renderSubtitle()}</h2>
                </div>
                <NuevoLead
                    landingToken={token}
                    bonusText={bonusText}
                    whatsappNumber={whatsappNumber}
                    buttonText={buttonText}
                    infoText={infoText}
                />
                <motion.span className="landing-disclaimer"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                ><DisclaimerLanding /></motion.span>
            </section>
        </div>
    );
}
