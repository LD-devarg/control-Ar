import { memo, useEffect, useMemo, useRef } from "react";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import DesktopWindowsOutlinedIcon from "@mui/icons-material/DesktopWindowsOutlined";
import PreviewControls from "./PreviewControls";

const PREVIEW_MESSAGE_TYPE = "landing-preview:update";
const PREVIEW_READY_TYPE = "landing-preview:ready";

function buildPreviewPayload(form, previewUrls) {
  return {
    titulo: form?.titulo || "",
    bono: form?.bonoActivo || "",
    subtitulo: form?.subtitulo || "",
    texto_boton: form?.textoBoton || "",
    texto_info: form?.textoInfo || "",
    texto_whatsapp: form?.textoWhatsapp || "",
    mostrar_disclaimer: form?.mostrarDisclaimer !== false,
    mostrar_ticker: form?.mostrarTicker !== false,
    color_titulo: form?.colorTitulo || "#ffffff",
    color_subtitulo: form?.colorSubtitulo || "#ffffff",
    color_keyword: form?.colorKeyword || "#ffe600",
    color_bono: form?.colorBono || "#ffe600",
    color_info: form?.colorInfo || "#ffffff",
    form_bg_color: form?.formBgColor || "#000000",
    form_bg_opacity: Number(form?.formBgOpacity || 0.7),
    form_field_border_color: form?.formFieldBorderColor || "#e014ff",
    font_titulo: form?.fontTitulo || "roboto",
    font_subtitulo: form?.fontSubtitulo || "roboto",
    font_keyword: form?.fontKeyword || "roboto",
    font_bono: form?.fontBono || "roboto",
    font_info: form?.fontInfo || "roboto",
    font_boton: form?.fontBoton || "roboto",
    font_form: form?.fontForm || "roboto",
    size_titulo: Number(form?.sizeTitulo || 2.5),
    size_subtitulo: Number(form?.sizeSubtitulo || 1.5),
    size_keyword: Number(form?.sizeKeyword || 2),
    size_bono: Number(form?.sizeBono || 3),
    size_info: Number(form?.sizeInfo || 1),
    size_boton: Number(form?.sizeBoton || 1.2),
    size_form: Number(form?.sizeForm || 1),
    weight_titulo: Number(form?.weightTitulo || 800),
    weight_subtitulo: Number(form?.weightSubtitulo || 700),
    weight_keyword: Number(form?.weightKeyword || 700),
    weight_bono: Number(form?.weightBono || 800),
    weight_info: Number(form?.weightInfo || 700),
    weight_boton: Number(form?.weightBoton || 700),
    weight_form: Number(form?.weightForm || 400),
    bg_type: form?.bgType || "gradient",
    bg_color: form?.bgColor || "#0f172a",
    bg_gradient:
      form?.bgGradient ||
      `linear-gradient(${form?.bgGradientAngle ?? 135}deg, ${form?.bgGradientFrom || "#0b1f3a"} 0%, ${form?.bgGradientTo || "#111827"} 100%)`,
    background_vertical: previewUrls?.vertical || "",
    background_horizontal: previewUrls?.horizontal || "",
    footer_text: "\u00A9 2026 ControlAR. Todos los derechos reservados.",
  };
}

function PreviewLanding({
  open,
  onClose,
  device,
  onDeviceChange,
  form,
  previewUrls,
  onFormChange,
}) {
  const iframeRef = useRef(null);
  const previewSrc = useMemo(() => "/landing?preview=1", []);
  const previewPayload = useMemo(() => buildPreviewPayload(form, previewUrls), [form, previewUrls]);
  const sendPreviewPayload = useMemo(
    () => () => {
      if (!iframeRef.current?.contentWindow) return;
      iframeRef.current.contentWindow.postMessage(
        {
          type: PREVIEW_MESSAGE_TYPE,
          payload: previewPayload,
        },
        window.location.origin
      );
    },
    [previewPayload]
  );

  const frameStyle = useMemo(
    () => ({
      width: device === "mobile" ? 390 : "100%",
      maxWidth: device === "mobile" ? 390 : 1080,
      minHeight: device === "mobile" ? 680 : 650,
    }),
    [device]
  );

  useEffect(() => {
    if (!open) return;
    sendPreviewPayload();
  }, [open, sendPreviewPayload]);

  useEffect(() => {
    if (!open) return undefined;
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event?.data?.type !== PREVIEW_READY_TYPE) return;
      sendPreviewPayload();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, sendPreviewPayload]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[3000] p-6 flex items-center justify-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-9/10 h-full rounded-xl bg-black/70 shadow-lg shadow-black/50 flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="inline-flex items-center justify-center gap-2 p-2 w-25 rounded-full bg-neutral-800" role="group" aria-label="Seleccionar vista">
            <button
              type="button"
              className={`w-8 h-8 rounded-full border-none cursor-pointer inline-flex items-center justify-center ${
                device === "mobile" ? "bg-gray-600 text-white" : "bg-transparent text-gray-300"
              }`}
              onClick={() => onDeviceChange("mobile")}
              aria-label="Vista mobile"
            >
              <PhoneIphoneOutlinedIcon fontSize="small" />
            </button>
            <button
              type="button"
              className={`w-8 h-8 rounded-full border-none cursor-pointer inline-flex items-center justify-center ${
                device === "desktop" ? "bg-gray-600 text-white" : "bg-transparent text-gray-300"
              }`}
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
            x
          </button>
        </div>

        <div className="flex items-start justify-center flex-1 p-4 gap-6 min-h-0">
          <div className="h-full rounded-lg shadow-lg shadow-black/50 flex bg-gray-900/50" style={frameStyle}>
            <iframe
              ref={iframeRef}
              title="Landing real preview"
              src={previewSrc}
              className="h-full lg:h-9/10 w-full rounded-lg border border-white/10 bg-black"
              onLoad={() => {
                sendPreviewPayload();
              }}
            />
          </div>

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
            formBgColor={form.formBgColor}
            formBgOpacity={form.formBgOpacity}
            formFieldBorderColor={form.formFieldBorderColor}
            fontTitulo={form.fontTitulo}
            fontSubtitulo={form.fontSubtitulo}
            fontKeyword={form.fontKeyword}
            fontBono={form.fontBono}
            fontInfo={form.fontInfo}
            fontBoton={form.fontBoton}
            fontForm={form.fontForm}
            sizeTitulo={form.sizeTitulo}
            sizeSubtitulo={form.sizeSubtitulo}
            sizeKeyword={form.sizeKeyword}
            sizeBono={form.sizeBono}
            sizeInfo={form.sizeInfo}
            sizeBoton={form.sizeBoton}
            sizeForm={form.sizeForm}
            weightTitulo={form.weightTitulo}
            weightSubtitulo={form.weightSubtitulo}
            weightKeyword={form.weightKeyword}
            weightBono={form.weightBono}
            weightInfo={form.weightInfo}
            weightBoton={form.weightBoton}
            weightForm={form.weightForm}
            onFormChange={onFormChange}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(PreviewLanding);
