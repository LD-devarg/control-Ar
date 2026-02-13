import "../assets/css/Landing.css";
import { memo, useMemo } from "react";

import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import DesktopWindowsOutlinedIcon from "@mui/icons-material/DesktopWindowsOutlined";
import PreviewCanvas from "./PreviewCanvas";
import PreviewControls from "./PreviewControls";

function PreviewLanding({
    open,
    onClose,
    device,
    onDeviceChange,
    form,
    previewUrls,
    previewBackground,
    onFormChange,
}) {
    if (!open) return null;

    const scale = device === "mobile" ? 1 : 0.9;
    const frameStyle = useMemo(
        () => ({
            width: device === "mobile" ? 320 : "100%",
            maxWidth: device === "mobile" ? 320 : 980,
            minHeight: device === "mobile" ? 520 : 420,
        }),
        [device]
    );
    const canvasStyle = useMemo(
        () => ({
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            willChange: "transform",
        }),
        [scale]
    );
    const previewStyle = useMemo(
        () => ({
            "--landing-bg-desktop": previewUrls.horizontal ? `url('${previewUrls.horizontal}')` : undefined,
            "--landing-bg-mobile": previewUrls.vertical ? `url('${previewUrls.vertical}')` : undefined,
            background: previewBackground,
        }),
        [previewUrls.horizontal, previewUrls.vertical, previewBackground]
    );

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[3000] p-6 flex items-center justify-center" onClick={onClose} role="presentation">
            <div className="w-9/10 h-full rounded-xl bg-black/70 shadow-lg shadow-black/50 flex flex-col overflow-hidden" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="inline-flex items-center justify-center gap-2 p-2 w-25 rounded-full bg-neutral-800" role="group" aria-label="Seleccionar vista">
                        <button
                            type="button"
                            className={`w-8 h-8 rounded-full border-none cursor-pointer inline-flex items-center justify-center
                            ${device === "mobile" ? "bg-gray-600 text-white" : "bg-transparent text-gray-300"}`}
                            onClick={() => onDeviceChange("mobile")}
                            aria-label="Vista mobile"
                        >
                            <PhoneIphoneOutlinedIcon fontSize="small" />
                        </button>
                        <button
                            type="button"
                            className={`w-8 h-8 rounded-full border-none cursor-pointer inline-flex items-center justify-center
                            ${device === "desktop" ? "bg-gray-600 text-white" : "bg-transparent text-gray-300"}`}
                            onClick={() => onDeviceChange("desktop")}
                            aria-label="Vista desktop"
                        >
                            <DesktopWindowsOutlinedIcon fontSize="small" />
                        </button>
                    </div>
                    <div className="text-white font-bold text-2xl">Vista Previa</div>
                    <button
                        type="button"
                        className="justify-self-end text-white text-2xl font-bold h-8 w-8 rounded inline-flex items-center justify-center hover:bg-gray-700 transition-colors duration-150"
                        onClick={onClose}
                        aria-label="Cerrar vista previa"
                    >
                        ×
                    </button>
                </div>
                <div className="flex items-start justify-center flex-1 p-4 gap-6">
                    <PreviewCanvas
                        device={device}
                        frameStyle={frameStyle}
                        canvasStyle={canvasStyle}
                        previewStyle={previewStyle}
                        titulo={form.titulo}
                        bonoActivo={form.bonoActivo}
                        subtitulo={form.subtitulo}
                        colorTitulo={form.colorTitulo}
                        colorBono={form.colorBono}
                        colorSubtitulo={form.colorSubtitulo}
                        colorKeyword={form.colorKeyword}
                        textoBoton={form.textoBoton}
                        textoInfo={form.textoInfo}
                        colorInfo={form.colorInfo}
                        mostrarDisclaimer={form.mostrarDisclaimer}
                    />
                    <PreviewControls
                        bgType={form.bgType}
                        bgGradientAngle={form.bgGradientAngle}
                        bgGradientFrom={form.bgGradientFrom}
                        bgGradientTo={form.bgGradientTo}
                        bgColor={form.bgColor}
                        colorTitulo={form.colorTitulo}
                        colorSubtitulo={form.colorSubtitulo}
                        colorKeyword={form.colorKeyword}
                        colorBono={form.colorBono}
                        colorInfo={form.colorInfo}
                        onFormChange={onFormChange}
                    />
                </div>
            </div>
        </div>
    );
}

export default memo(PreviewLanding);
