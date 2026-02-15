import { memo } from "react";

const GRADIENT_ANGLES = [
    { angle: 45, label: "↗️" },
    { angle: 135, label: "↘️" },
    { angle: 225, label: "↙️" },
    { angle: 315, label: "↖️" },
];

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
    onFormChange,
}) {
    return (
        <div className="w-64 shrink-0 rounded-xl bg-black/60 border border-white/10 p-4 text-white">
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
                    <div className="text-xs text-white/70 mb-2">Dirección</div>
                    <div className="flex items-center gap-2 mb-3">
                        {GRADIENT_ANGLES.map((option) => (
                            <button
                                key={option.angle}
                                type="button"
                                className={`w-9 h-9 rounded-full border text-lg flex items-center justify-center ${
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
            <div className="text-sm font-semibold mb-3">Texto</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 text-white/80">
                    <input
                        id="text-color-titulo"
                        name="text-color-titulo"
                        aria-label="Color del titulo"
                        type="color"
                        value={colorTitulo}
                        onChange={(event) => onFormChange({ colorTitulo: event.target.value })}
                        className="w-8 h-7 rounded border border-white/40 bg-transparent"
                    />
                    Título
                </label>
                <label className="flex items-center gap-2 text-white/80">
                    <input
                        id="text-color-subtitulo"
                        name="text-color-subtitulo"
                        aria-label="Color del subtitulo"
                        type="color"
                        value={colorSubtitulo}
                        onChange={(event) => onFormChange({ colorSubtitulo: event.target.value })}
                        className="w-8 h-7 rounded border border-white/40 bg-transparent"
                    />
                    Subtítulo
                </label>
                <label className="flex items-center gap-2 text-white/80">
                    <input
                        id="text-color-keyword"
                        name="text-color-keyword"
                        aria-label="Color de la keyword"
                        type="color"
                        value={colorKeyword}
                        onChange={(event) => onFormChange({ colorKeyword: event.target.value })}
                        className="w-8 h-7 rounded border border-white/40 bg-transparent"
                    />
                    Keyword
                </label>
                <label className="flex items-center gap-2 text-white/80">
                    <input
                        id="text-color-bono"
                        name="text-color-bono"
                        aria-label="Color del bono"
                        type="color"
                        value={colorBono}
                        onChange={(event) => onFormChange({ colorBono: event.target.value })}
                        className="w-8 h-7 rounded border border-white/40 bg-transparent"
                    />
                    Bono
                </label>
                <label className="flex items-center gap-2 text-white/80">
                    <input
                        id="text-color-info"
                        name="text-color-info"
                        aria-label="Color del texto de info"
                        type="color"
                        value={colorInfo}
                        onChange={(event) => onFormChange({ colorInfo: event.target.value })}
                        className="w-8 h-7 rounded border border-white/40 bg-transparent"
                    />
                    Info
                </label>
            </div>
        </div>
    );
}

const PreviewControls = memo(PreviewControlsComponent);

export default PreviewControls;
