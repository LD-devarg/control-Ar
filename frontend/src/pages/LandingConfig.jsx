import { useMemo, useState } from "react";
import "../assets/css/LandingConfig.css";
import LandingEditor from "../components/LandingEditor.jsx";
import LandingPreviewFrame from "../components/LandingPreviewFrame.jsx";

function LandingConfig() {
    const [titulo, setTitulo] = useState("");
    const [subtitulo, setSubtitulo] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [botonTexto, setBotonTexto] = useState("");
    const [tituloColor, setTituloColor] = useState("#ffffff");
    const [tituloTamano, setTituloTamano] = useState(48);
    const [subtituloColor, setSubtituloColor] = useState("#ffffff");
    const [subtituloTamano, setSubtituloTamano] = useState(24);
    const [isMobilePreview, setIsMobilePreview] = useState(true);

    const previewData = useMemo(
        () => ({
            titulo: titulo || "TEXTO BIENVENIDA",
            subtitulo: subtitulo || "Bienvenido a Nuestra Aplicacion",
            descripcion: descripcion || "Contenido principal de la pagina de bienvenida.",
            titulo_color: tituloColor,
            titulo_tamano: tituloTamano,
            subtitulo_color: subtituloColor,
            subtitulo_tamano: subtituloTamano,
            boton_texto: botonTexto,
            boton_url: botonTexto ? "#" : "",
        }),
        [titulo, subtitulo, descripcion, botonTexto, tituloColor, tituloTamano, subtituloColor, subtituloTamano]
    );

    return (
        <div className="landing-config-container">
            <LandingEditor
              titulo={titulo}
              onTituloChange={setTitulo}
              tituloColor={tituloColor}
              onTituloColorChange={setTituloColor}
              tituloTamano={tituloTamano}
              onTituloTamanoChange={setTituloTamano}
              subtitulo={subtitulo}
              onSubtituloChange={setSubtitulo}
              subtituloColor={subtituloColor}
              onSubtituloColorChange={setSubtituloColor}
              subtituloTamano={subtituloTamano}
              onSubtituloTamanoChange={setSubtituloTamano}
              descripcion={descripcion}
              onDescripcionChange={setDescripcion}
              botonTexto={botonTexto}
              onBotonTextoChange={setBotonTexto}
              isMobilePreview={isMobilePreview}
              onTogglePreview={setIsMobilePreview}
            />
            <LandingPreviewFrame
              previewData={previewData}
              isMobilePreview={isMobilePreview}
            />
        </div>
    );
}

export default LandingConfig;
