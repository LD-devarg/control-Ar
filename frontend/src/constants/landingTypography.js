export const LANDING_FONT_OPTIONS = [
  { value: "roboto", label: "Roboto", stack: "'Roboto', 'Segoe UI', sans-serif" },
  { value: "inter", label: "Inter", stack: "'Inter', 'Segoe UI', sans-serif" },
  { value: "montserrat", label: "Montserrat", stack: "'Montserrat', 'Trebuchet MS', sans-serif" },
  { value: "poppins", label: "Poppins", stack: "'Poppins', 'Segoe UI', sans-serif" },
  { value: "nunito", label: "Nunito", stack: "'Nunito', 'Segoe UI', sans-serif" },
  { value: "lato", label: "Lato", stack: "'Lato', 'Arial', sans-serif" },
  { value: "ubuntu", label: "Ubuntu", stack: "'Ubuntu', 'Segoe UI', sans-serif" },
  { value: "raleway", label: "Raleway", stack: "'Raleway', 'Helvetica', sans-serif" },
  { value: "oswald", label: "Oswald", stack: "'Oswald', 'Arial Narrow', sans-serif" },
  { value: "merriweather", label: "Merriweather", stack: "'Merriweather', 'Georgia', serif" },
];

export function getLandingFontStack(value) {
  const option = LANDING_FONT_OPTIONS.find((item) => item.value === value);
  return option?.stack || LANDING_FONT_OPTIONS[0].stack;
}

export const LANDING_TEXT_STYLE_DEFAULTS = {
  formBgColor: "#000000",
  formBgOpacity: 0.7,
  formFieldBorderColor: "#e014ff",
  fontTitulo: "roboto",
  fontSubtitulo: "roboto",
  fontKeyword: "roboto",
  fontBono: "roboto",
  fontInfo: "roboto",
  fontBoton: "roboto",
  fontForm: "roboto",
  sizeTitulo: 2.5,
  sizeSubtitulo: 1.5,
  sizeKeyword: 2,
  sizeBono: 3,
  sizeInfo: 1,
  sizeBoton: 1.2,
  sizeForm: 1,
  weightTitulo: 800,
  weightSubtitulo: 700,
  weightKeyword: 700,
  weightBono: 800,
  weightInfo: 700,
  weightBoton: 700,
  weightForm: 400,
};
