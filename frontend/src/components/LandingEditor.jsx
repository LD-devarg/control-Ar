import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import UploadButton from "./UploadButton";
import PaletaColores from "./PaletaColores";

const LandingPages = [
  { label: "Landing Page 1" },
  { label: "Landing Page 2" },
  { label: "Landing Page 3" },
];

function LandingEditor({
  titulo,
  onTituloChange,
  tituloColor,
  onTituloColorChange,
  tituloTamano,
  onTituloTamanoChange,
  subtitulo,
  onSubtituloChange,
  subtituloColor,
  onSubtituloColorChange,
  subtituloTamano,
  onSubtituloTamanoChange,
  descripcion,
  onDescripcionChange,
  botonTexto,
  onBotonTextoChange,
  isMobilePreview,
  onTogglePreview,
}) {
  return (
    <div className="landing-config-panel">
      <h1>Configuración de Landing Pages</h1>
      <FormControlLabel
        className="landing-preview-switch"
        control={
          <Switch
            checked={isMobilePreview}
            onChange={(e) => onTogglePreview(e.target.checked)}
            color="primary"
          />
        }
        label={isMobilePreview ? "Vista celular" : "Vista desktop"}
      />
      <div className="landing-config-form">
        <Autocomplete
          disablePortal
          id="combo-box-demo"
          options={LandingPages}
          className="form-autocomplete"
          renderInput={(params) => (
            <TextField {...params} label="Seleccione una Landing Page" />
          )}
        />
        <TextField
          id="landing-title"
          label="Titulo"
          variant="standard"
          value={titulo}
          onChange={(e) => onTituloChange(e.target.value)}
        />
        <TextField
          id="landing-title-color"
          label="Color titulo"
          type="color"
          variant="standard"
          value={tituloColor}
          onChange={(e) => onTituloColorChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          id="landing-title-size"
          label="Tamaño titulo (px)"
          type="number"
          variant="standard"
          value={tituloTamano}
          onChange={(e) => onTituloTamanoChange(Number(e.target.value))}
          inputProps={{ min: 10, max: 200 }}
        />
        <TextField
          id="landing-subtitle"
          label="Subtitulo"
          variant="standard"
          value={subtitulo}
          onChange={(e) => onSubtituloChange(e.target.value)}
        />
        <TextField
          id="landing-subtitle-color"
          label="Color subtitulo"
          type="color"
          variant="standard"
          value={subtituloColor}
          onChange={(e) => onSubtituloColorChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          id="landing-subtitle-size"
          label="Tamaño subtitulo (px)"
          type="number"
          variant="standard"
          value={subtituloTamano}
          onChange={(e) => onSubtituloTamanoChange(Number(e.target.value))}
          inputProps={{ min: 10, max: 200 }}
        />
        <TextField
          id="landing-title"
          label="Titulo"
          variant="standard"
          value={descripcion}
          onChange={(e) => onDescripcionChange(e.target.value)}
        />
        <TextField
          id="landing-button"
          label="Botón"
          variant="standard"
          value={botonTexto}
          onChange={(e) => onBotonTextoChange(e.target.value)}
        />
        <UploadButton />
        <PaletaColores />
      </div>
    </div>
  );
}

export default LandingEditor;
