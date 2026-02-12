import "../assets/css/Landing.css";

import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import DesktopWindowsOutlinedIcon from "@mui/icons-material/DesktopWindowsOutlined";
import NuevoLead from "./FormLeads";
import DisclaimerLanding from "./DisclaimerLanding";

const KEYWORD = "DUPLICAMOS";
const GRADIENT_ANGLES = [
    { angle: 45, label: "↗" },
    { angle: 135, label: "↘" },
    { angle: 225, label: "↙" },
    { angle: 315, label: "↖" },
];

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

export default function PreviewLanding({
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
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-3000 p-6 flex items-center justify-center" onClick={onClose} role="presentation">
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
                        className="justify-self-end text-white text-2xl font-bold h-8 w-8 "
                        onMouseEnter={(e) => e.currentTarget.classList.add("hover:bg-gray-700")}
                        onMouseLeave={(e) => e.currentTarget.classList.remove("hover:bg-gray-700")}
                        onClick={onClose}
                        aria-label="Cerrar vista previa"
                    >
                        ×
                    </button>
                </div>
                <div className="flex items-start justify-center flex-1 p-4 gap-6">
                    <div
                        className="h-full bg-gray-900/50 rounded-lg shadow-lg shadow-black/50 flex"
                        style={{
                            width: device === "mobile" ? 320 : "100%",
                            maxWidth: device === "mobile" ? 320 : 980,
                            minHeight: device === "mobile" ? 520 : 420,
                        }}
                    >
                        <div className="h-full w-full" style={{ transform: `scale(${scale})` }}>
                            <div className="h-full w-full bg-gray-900/50 rounded-lg shadow-lg shadow-black/50 overflow-hidden flex items-start justify-start">
                                <section
                                    className={`h-full w-full bg-cover bg-center relative flex flex-col items-center justify-center ${device === "mobile" ? "preview-mobile" : "preview-desktop"}`}
                                    style={{
                                        "--landing-bg-desktop": previewUrls.horizontal ? `url('${previewUrls.horizontal}')` : undefined,
                                        "--landing-bg-mobile": previewUrls.vertical ? `url('${previewUrls.vertical}')` : undefined,
                                        background: previewBackground,
                                    }}
                                >
                                    <div className="p-3 text-center">
                                        <h1 style={{ color: form.colorTitulo }}>
                                            {form.titulo || "Titulo"}
                                        </h1>
                                        <span className="landing-bono" style={{ color: form.colorBono }}>
                                            {form.bonoActivo || "100%"}
                                        </span>
                                        <h2 style={{ color: form.colorSubtitulo }}>
                                            {renderSubtitle(form.subtitulo, form.colorKeyword) || "Subtitulo"}
                                        </h2>
                                    </div>
                                    <div className="landing-preview-leads">
                                        <NuevoLead
                                            landingToken="preview"
                                            bonusText={form.bonoActivo || "100%"}
                                            whatsappNumber=""
                                            buttonText={form.textoBoton || "Texto Boton"}
                                            infoText={form.textoInfo || "Texto Info"}
                                            infoColor={form.colorInfo}
                                            isPreview
                                        />
                                    </div>
                                    {form.mostrarDisclaimer !== false ? (
                                        <div className="landing-disclaimer">
                                            <DisclaimerLanding />
                                        </div>
                                    ) : null}
                                </section>
                            </div>
                        </div>
                    </div>
                    <div className="w-64 shrink-0 rounded-xl bg-black/60 border border-white/10 p-4 text-white">
                        <div className="text-sm font-semibold mb-3">Colores y Fondo</div>
                        <div className="flex items-center gap-2 mb-3">
                            <button
                                type="button"
                                className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                                    form.bgType === "gradient"
                                        ? "bg-white text-black"
                                        : "bg-transparent text-white border-white/40"
                                }`}
                                onClick={() => onFormChange({ bgType: "gradient" })}
                            >
                                Gradiente
                            </button>
                            <button
                                type="button"
                                className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                                    form.bgType === "solid"
                                        ? "bg-white text-black"
                                        : "bg-transparent text-white border-white/40"
                                }`}
                                onClick={() => onFormChange({ bgType: "solid" })}
                            >
                                Color
                            </button>
                        </div>
                        {form.bgType === "gradient" ? (
                            <>
                                <div className="text-xs text-white/70 mb-2">Dirección</div>
                                <div className="flex items-center gap-2 mb-3">
                                    {GRADIENT_ANGLES.map((option) => (
                                        <button
                                            key={option.angle}
                                            type="button"
                                            className={`w-9 h-9 rounded-full border text-lg flex items-center justify-center ${
                                                form.bgGradientAngle === option.angle
                                                    ? "bg-white text-black"
                                                    : "bg-transparent text-white border-white/40"
                                            }`}
                                            onClick={() => onFormChange({ bgGradientAngle: option.angle })}
                                            aria-label={`${option.angle} grados`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="text-xs text-white/70 mb-2">Colores</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={form.bgGradientFrom}
                                        onChange={(event) => onFormChange({ bgGradientFrom: event.target.value })}
                                        className="w-10 h-8 rounded border border-white/40 bg-transparent"
                                    />
                                    <input
                                        type="color"
                                        value={form.bgGradientTo}
                                        onChange={(event) => onFormChange({ bgGradientTo: event.target.value })}
                                        className="w-10 h-8 rounded border border-white/40 bg-transparent"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-xs text-white/70 mb-2">Color</div>
                                <input
                                    type="color"
                                    value={form.bgColor}
                                    onChange={(event) => onFormChange({ bgColor: event.target.value })}
                                    className="w-10 h-8 rounded border border-white/40 bg-transparent"
                                />
                            </>
                        )}
                        <div className="border-t border-white/10 my-4" />
                        <div className="text-sm font-semibold mb-3">Texto</div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <label className="flex items-center gap-2 text-white/80">
                                <input
                                    type="color"
                                    value={form.colorTitulo}
                                    onChange={(event) => onFormChange({ colorTitulo: event.target.value })}
                                    className="w-8 h-7 rounded border border-white/40 bg-transparent"
                                />
                                Título
                            </label>
                            <label className="flex items-center gap-2 text-white/80">
                                <input
                                    type="color"
                                    value={form.colorSubtitulo}
                                    onChange={(event) => onFormChange({ colorSubtitulo: event.target.value })}
                                    className="w-8 h-7 rounded border border-white/40 bg-transparent"
                                />
                                Subtítulo
                            </label>
                            <label className="flex items-center gap-2 text-white/80">
                                <input
                                    type="color"
                                    value={form.colorKeyword}
                                    onChange={(event) => onFormChange({ colorKeyword: event.target.value })}
                                    className="w-8 h-7 rounded border border-white/40 bg-transparent"
                                />
                                Keyword
                            </label>
                            <label className="flex items-center gap-2 text-white/80">
                                <input
                                    type="color"
                                    value={form.colorBono}
                                    onChange={(event) => onFormChange({ colorBono: event.target.value })}
                                    className="w-8 h-7 rounded border border-white/40 bg-transparent"
                                />
                                Bono
                            </label>
                            <label className="flex items-center gap-2 text-white/80">
                                <input
                                    type="color"
                                    value={form.colorInfo}
                                    onChange={(event) => onFormChange({ colorInfo: event.target.value })}
                                    className="w-8 h-7 rounded border border-white/40 bg-transparent"
                                />
                                Info
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
