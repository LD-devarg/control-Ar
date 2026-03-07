import { memo } from "react";
import { LANDING_FONT_OPTIONS } from "../constants/landingTypography";

const GRADIENT_ANGLES = [
    { angle: 45, label: "45" },
    { angle: 135, label: "135" },
    { angle: 225, label: "225" },
    { angle: 315, label: "315" },
];

const TEXT_STYLE_FIELDS = [
    { label: "Titulo", fontKey: "fontTitulo", sizeKey: "sizeTitulo", weightKey: "weightTitulo" },
    { label: "Subtitulo", fontKey: "fontSubtitulo", sizeKey: "sizeSubtitulo", weightKey: "weightSubtitulo" },
    { label: "Keyword", fontKey: "fontKeyword", sizeKey: "sizeKeyword", weightKey: "weightKeyword" },
    { label: "Bono", fontKey: "fontBono", sizeKey: "sizeBono", weightKey: "weightBono" },
    { label: "Boton", fontKey: "fontBoton", sizeKey: "sizeBoton", weightKey: "weightBoton" },
    { label: "Info", fontKey: "fontInfo", sizeKey: "sizeInfo", weightKey: "weightInfo" },
    { label: "Formulario", fontKey: "fontForm", sizeKey: "sizeForm", weightKey: "weightForm" },
];

const hexToRgb = (hex) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return [r, g, b];
};

const rgbToHex = (r, g, b) => {
    return "#" + (1 << 24 | (r << 16) | (g << 8) | b).toString(16).slice(1).padStart(6, '0');
};

const generateMetallicGradient = (baseHex) => {
    if (!baseHex || !baseHex.startsWith('#')) return baseHex;
    const [r, g, b] = hexToRgb(baseHex);
    const light = rgbToHex(
        Math.min(255, Math.round(r + (255 - r) * 0.7)),
        Math.min(255, Math.round(g + (255 - g) * 0.7)),
        Math.min(255, Math.round(b + (255 - b) * 0.7))
    );
    const midLight = rgbToHex(
        Math.min(255, Math.round(r + (255 - r) * 0.3)),
        Math.min(255, Math.round(g + (255 - g) * 0.3)),
        Math.min(255, Math.round(b + (255 - b) * 0.3))
    );
    const dark = rgbToHex(Math.round(r * 0.6), Math.round(g * 0.6), Math.round(b * 0.6));
    const darker = rgbToHex(Math.round(r * 0.4), Math.round(g * 0.4), Math.round(b * 0.4));
    
    return `linear-gradient(90deg, ${darker} 0%, ${light} 25%, ${baseHex} 50%, ${midLight} 75%, ${dark} 100%) /*metallic:${baseHex}*/`;
};

const extractBaseColor = (colorStr, defaultColor) => {
    if (!colorStr) return defaultColor;
    const match = colorStr.match(/\/\*metallic:(#[0-9a-fA-F]{6})\*\//);
    if (match) return match[1];
    if (colorStr.includes('gradient')) return '#ffe600';
    return colorStr;
};

function PreviewControlsComponent({
    bgType,
    bgGradientAngle,
    bgGradientFrom,
    bgGradientTo,
    bgColor,
    colorTitulo,
    colorSubtitulo,
    colorKeyword,
    colorBono,
    colorInfo,
    formBgColor,
    formBgOpacity,
    formFieldBorderColor,
    fontTitulo,
    fontSubtitulo,
    fontKeyword,
    fontBono,
    fontInfo,
    fontBoton,
    fontForm,
    sizeTitulo,
    sizeSubtitulo,
    sizeKeyword,
    sizeBono,
    sizeInfo,
    sizeBoton,
    sizeForm,
    weightTitulo,
    weightSubtitulo,
    weightKeyword,
    weightBono,
    weightInfo,
    weightBoton,
    weightForm,
    onFormChange,
}) {
    const styleState = {
        fontTitulo,
        fontSubtitulo,
        fontKeyword,
        fontBono,
        fontInfo,
        fontBoton,
        fontForm,
        sizeTitulo,
        sizeSubtitulo,
        sizeKeyword,
        sizeBono,
        sizeInfo,
        sizeBoton,
        sizeForm,
        weightTitulo,
        weightSubtitulo,
        weightKeyword,
        weightBono,
        weightInfo,
        weightBoton,
        weightForm,
    };

    return (
        <div className="w-[320px] max-w-[88vw] max-h-[calc(100vh-2.5rem)] overflow-y-auto shrink-0 rounded-xl bg-black/58 backdrop-blur-sm border border-white/10 p-3 text-white shadow-2xl shadow-black/50">
            <div className="text-sm font-semibold mb-3">Colores y Fondo</div>
            <div className="flex items-center gap-2 mb-3">
                <button
                    type="button"
                    className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                        bgType === "gradient"
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
                        bgType === "solid"
                            ? "bg-white text-black"
                            : "bg-transparent text-white border-white/40"
                    }`}
                    onClick={() => onFormChange({ bgType: "solid" })}
                >
                    Color
                </button>
            </div>
            {bgType === "gradient" ? (
                <>
                    <div className="text-xs text-white/70 mb-2">Direccion</div>
                    <div className="flex items-center gap-2 mb-3">
                        {GRADIENT_ANGLES.map((option) => (
                            <button
                                key={option.angle}
                                type="button"
                                className={`w-9 h-9 rounded-full border text-xs flex items-center justify-center ${
                                    bgGradientAngle === option.angle
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
                            id="bg-gradient-from"
                            name="bg-gradient-from"
                            aria-label="Color inicial del gradiente"
                            type="color"
                            value={bgGradientFrom}
                            onChange={(event) => onFormChange({ bgGradientFrom: event.target.value })}
                            className="w-10 h-8 rounded border border-white/40 bg-transparent"
                        />
                        <input
                            id="bg-gradient-to"
                            name="bg-gradient-to"
                            aria-label="Color final del gradiente"
                            type="color"
                            value={bgGradientTo}
                            onChange={(event) => onFormChange({ bgGradientTo: event.target.value })}
                            className="w-10 h-8 rounded border border-white/40 bg-transparent"
                        />
                    </div>
                </>
            ) : (
                <>
                    <div className="text-xs text-white/70 mb-2">Color</div>
                    <input
                        id="bg-solid-color"
                        name="bg-solid-color"
                        aria-label="Color de fondo"
                        type="color"
                        value={bgColor}
                        onChange={(event) => onFormChange({ bgColor: event.target.value })}
                        className="w-10 h-8 rounded border border-white/40 bg-transparent"
                    />
                </>
            )}
            <div className="border-t border-white/10 my-4" />
            <div className="text-sm font-semibold mb-3">Texto (Colores)</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 text-white/80 col-span-2">
                    <input type="color" value={extractBaseColor(colorTitulo, '#ffffff')} onChange={(event) => {
                        const val = event.target.value;
                        onFormChange({ colorTitulo: colorTitulo?.includes?.('gradient') ? generateMetallicGradient(val) : val });
                    }} className="w-8 h-7 rounded border border-white/40 bg-transparent" />
                    <span className="flex-1">Titulo</span>
                    <input type="checkbox" checked={colorTitulo?.includes?.('gradient')} onChange={(e) => {
                        const baseColor = extractBaseColor(colorTitulo, '#ffffff');
                        onFormChange({ colorTitulo: e.target.checked ? generateMetallicGradient(baseColor) : baseColor });
                    }} />
                    <span className="text-[10px]">✨ Metal</span>
                </label>
                <label className="flex items-center gap-2 text-white/80 col-span-2">
                    <input type="color" value={extractBaseColor(colorSubtitulo, '#ffffff')} onChange={(event) => {
                        const val = event.target.value;
                        onFormChange({ colorSubtitulo: colorSubtitulo?.includes?.('gradient') ? generateMetallicGradient(val) : val });
                    }} className="w-8 h-7 rounded border border-white/40 bg-transparent" />
                    <span className="flex-1">Subtitulo</span>
                    <input type="checkbox" checked={colorSubtitulo?.includes?.('gradient')} onChange={(e) => {
                        const baseColor = extractBaseColor(colorSubtitulo, '#ffffff');
                        onFormChange({ colorSubtitulo: e.target.checked ? generateMetallicGradient(baseColor) : baseColor });
                    }} />
                    <span className="text-[10px]">✨ Metal</span>
                </label>
                <label className="flex items-center gap-2 text-white/80 col-span-2">
                    <input type="color" value={extractBaseColor(colorKeyword, '#ffe600')} onChange={(event) => {
                        const val = event.target.value;
                        onFormChange({ colorKeyword: colorKeyword?.includes?.('gradient') ? generateMetallicGradient(val) : val });
                    }} className="w-8 h-7 rounded border border-white/40 bg-transparent" />
                    <span className="flex-1">Keyword</span>
                    <input type="checkbox" checked={colorKeyword?.includes?.('gradient')} onChange={(e) => {
                        const baseColor = extractBaseColor(colorKeyword, '#ffe600');
                        onFormChange({ colorKeyword: e.target.checked ? generateMetallicGradient(baseColor) : baseColor });
                    }} />
                    <span className="text-[10px]">✨ Metal</span>
                </label>
                <label className="flex items-center gap-2 text-white/80 col-span-2">
                    <input type="color" value={extractBaseColor(colorBono, '#ffe600')} onChange={(event) => {
                        const val = event.target.value;
                        onFormChange({ colorBono: colorBono?.includes?.('gradient') ? generateMetallicGradient(val) : val });
                    }} className="w-8 h-7 rounded border border-white/40 bg-transparent" />
                    <span className="flex-1">Bono</span>
                    <input type="checkbox" checked={colorBono?.includes?.('gradient')} onChange={(e) => {
                        const baseColor = extractBaseColor(colorBono, '#ffe600');
                        onFormChange({ colorBono: e.target.checked ? generateMetallicGradient(baseColor) : baseColor });
                    }} />
                    <span className="text-[10px]">✨ Metal</span>
                </label>
                <label className="flex items-center gap-2 text-white/80 col-span-2">
                    <input type="color" value={colorInfo} onChange={(event) => onFormChange({ colorInfo: event.target.value })} className="w-8 h-7 rounded border border-white/40 bg-transparent" />
                    <span className="flex-1">Info</span>
                </label>
            </div>
            <div className="border-t border-white/10 my-4" />
            <div className="text-sm font-semibold mb-3">Formulario</div>
            <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                <label className="flex items-center gap-2 text-white/80">
                    <input type="color" value={formBgColor} onChange={(event) => onFormChange({ formBgColor: event.target.value })} className="w-8 h-7 rounded border border-white/40 bg-transparent" />
                    Fondo
                </label>
                <label className="flex items-center gap-2 text-white/80">
                    <input type="color" value={formFieldBorderColor} onChange={(event) => onFormChange({ formFieldBorderColor: event.target.value })} className="w-8 h-7 rounded border border-white/40 bg-transparent" />
                    Bordes
                </label>
            </div>
            <div className="text-xs text-white/70 mb-1">Transparencia fondo ({Number(formBgOpacity || 0.7).toFixed(2)})</div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={Number(formBgOpacity || 0.7)}
                onChange={(event) => onFormChange({ formBgOpacity: Number(event.target.value) })}
                className="w-full mb-3"
                aria-label="Transparencia del fondo del formulario"
            />
            <div className="border-t border-white/10 my-4" />
            <div className="text-sm font-semibold mb-3">Tipografia por texto</div>
            <div className="space-y-3">
                {TEXT_STYLE_FIELDS.map((field) => (
                    <div key={field.fontKey} className="rounded-lg border border-white/10 p-2">
                        <div className="text-xs text-white/80 mb-1">{field.label}</div>
                        <select
                            className="w-full rounded-md border border-white/30 bg-black/50 px-2 py-1 text-sm text-white mb-2"
                            value={styleState[field.fontKey]}
                            onChange={(event) => onFormChange({ [field.fontKey]: event.target.value })}
                        >
                            {LANDING_FONT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <div className="text-[11px] text-white/70 mb-1">Tamano ({Number(styleState[field.sizeKey] || 1).toFixed(2)}rem)</div>
                        <input
                            type="range"
                            min="0.8"
                            max="4"
                            step="0.05"
                            value={Number(styleState[field.sizeKey] || 1)}
                            onChange={(event) => onFormChange({ [field.sizeKey]: Number(event.target.value) })}
                            className="w-full"
                        />
                        <div className="text-[11px] text-white/70 mt-2 mb-1">Peso ({Number(styleState[field.weightKey] || 400)})</div>
                        <input
                            type="range"
                            min="100"
                            max="900"
                            step="100"
                            value={Number(styleState[field.weightKey] || 400)}
                            onChange={(event) => onFormChange({ [field.weightKey]: Number(event.target.value) })}
                            className="w-full"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

const PreviewControls = memo(PreviewControlsComponent);

export default PreviewControls;
