import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../assets/css/Landing.css";

export default function Landing({ previewData, disableFetch = false }) {
    const [searchParams] = useSearchParams();
    const [landingData, setLandingData] = useState({
        logo_marca_url: "",
        titulo: "TEXTO BIENVENIDA",
        subtitulo: "Subtitulo de bienvenida",
        titulo_color: "#ffffff",
        titulo_tamano: 48,
        subtitulo_color: "#ffffff",
        subtitulo_tamano: 24,
        imagen_url: "",
        boton_texto: "",
        boton_url: "",
    });

    useEffect(() => {
        if (disableFetch || previewData) {
            return;
        }
        const token = searchParams.get("token");
        if (!token) return;

        const controller = new AbortController();
        const baseUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

        fetch(`${baseUrl}/landings/public/?landing_token=${token}`, {
            signal: controller.signal,
        })
            .then((res) => (res.ok ? res.json() : Promise.reject(res)))
            .then((data) => {
                setLandingData((prev) => ({
                    ...prev,
                    logo_marca_url: data.logo_marca_url || prev.logo_marca_url,
                    titulo: data.titulo || data.nombre || prev.titulo,
                    subtitulo: data.subtitulo || prev.subtitulo,
                    imagen_url: data.imagen_url || "",
                    boton_texto: data.boton_texto || "",
                    boton_url: data.boton_url || "",
                }));
            })
            .catch(() => {});

        return () => controller.abort();
    }, [disableFetch, previewData, searchParams]);

    useEffect(() => {
        if (!previewData) return;
        setLandingData((prev) => ({
            ...prev,
            ...previewData,
        }));
    }, [previewData]);

    return (
        <div className="landing-container">
            <header className="landing-header">
                <div>{landingData.logo_marca_url}</div>
            </header>
            <main className="landing-main">
                <section>
                    <h1
                        className="landing-data-title"
                        style={{
                            color: landingData.titulo_color,
                            fontSize: landingData.titulo_tamano
                                ? `${landingData.titulo_tamano}px`
                                : undefined,
                        }}
                    >
                        {landingData.titulo}
                    </h1>
                </section>
                <section>
                    <p
                        className="landing-data-subtitle"
                        style={{
                            color: landingData.subtitulo_color,
                            fontSize: landingData.subtitulo_tamano
                                ? `${landingData.subtitulo_tamano}px`
                                : undefined,
                        }}
                    >
                        {landingData.subtitulo}
                    </p>
                </section>

            </main>
            <footer>
                <p>(c) 2024 Mi Aplicacion. Todos los derechos reservados.</p>
            </footer>
        </div>
    );
}
