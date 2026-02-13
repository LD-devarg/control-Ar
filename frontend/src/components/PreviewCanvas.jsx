import { memo } from "react";
import NuevoLead from "./FormLeads";
import DisclaimerLanding from "./DisclaimerLanding";

const KEYWORD = "DUPLICAMOS";

function renderSubtitle(text, colorKeyword) {
    if (!text) return null;
    const upper = text.toUpperCase();
    const index = upper.indexOf(KEYWORD);
    if (index === -1) {
        return text;
    }
    const before = text.slice(0, index);
    const after = text.slice(index + KEYWORD.length);
    return (
        <>
            {before}
            <span className="keyword" style={{ color: colorKeyword }}>{KEYWORD}</span>
            {after}
        </>
    );
}

function PreviewCanvasComponent({
    device,
    frameStyle,
    canvasStyle,
    previewStyle,
    titulo,
    bonoActivo,
    subtitulo,
    colorTitulo,
    colorBono,
    colorSubtitulo,
    colorKeyword,
    textoBoton,
    textoInfo,
    colorInfo,
    mostrarDisclaimer,
}) {
    return (
        <div
            className="h-full bg-gray-900/50 rounded-lg shadow-lg shadow-black/50 flex"
            style={frameStyle}
        >
            <div className="h-full w-full" style={canvasStyle}>
                <div className="h-full w-full bg-gray-900/50 rounded-lg shadow-lg shadow-black/50 overflow-hidden flex items-start justify-start">
                    <section
                        className={`h-full w-full bg-cover bg-center relative flex flex-col items-center justify-center ${device === "mobile" ? "preview-mobile" : "preview-desktop"}`}
                        style={previewStyle}
                    >
                        <div className="p-3 text-center">
                            <h1 style={{ color: colorTitulo }}>
                                {titulo || "Titulo"}
                            </h1>
                            <span className="landing-bono" style={{ color: colorBono }}>
                                {bonoActivo || "100%"}
                            </span>
                            <h2 style={{ color: colorSubtitulo }}>
                                {renderSubtitle(subtitulo, colorKeyword) || "Subtitulo"}
                            </h2>
                        </div>
                        <div className="landing-preview-leads">
                            <NuevoLead
                                landingToken="preview"
                                bonusText={bonoActivo || "100%"}
                                whatsappNumber=""
                                buttonText={textoBoton || "Texto Boton"}
                                infoText={textoInfo || "Texto Info"}
                                infoColor={colorInfo}
                                isPreview
                            />
                        </div>
                        {mostrarDisclaimer !== false ? (
                            <div className="landing-disclaimer">
                                <DisclaimerLanding />
                            </div>
                        ) : null}
                    </section>
                </div>
            </div>
        </div>
    );
}

const PreviewCanvas = memo(PreviewCanvasComponent);

export default PreviewCanvas;
