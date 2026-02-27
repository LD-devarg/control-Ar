import Autocomplete from "@mui/material/Autocomplete";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { buildOptionLabel } from "./helpers";

function FieldRenderer({
  field,
  value,
  onChange,
  fieldKey = "",
  remoteOptions = {},
  showSecretByField = {},
  toggleShowSecret,
  whiteAutocompletePopperSx,
  whiteFieldSx,
}) {
  if (field.type === "select-remote") {
    const fieldOptions = remoteOptions[field.name] || [];
    const selectedOption = fieldOptions.find((item) => item.id === value) || null;
    return (
      <Autocomplete
        key={fieldKey}
        options={fieldOptions}
        value={selectedOption}
        onChange={(_, next) => onChange(field.name, next?.id ?? "")}
        getOptionLabel={(option) => buildOptionLabel(option, field)}
        isOptionEqualToValue={(option, selected) => option.id === selected?.id}
        slotProps={{ popper: { sx: whiteAutocompletePopperSx } }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label}
            required={field.required}
            size="small"
            sx={whiteFieldSx}
          />
        )}
      />
    );
  }

  if (field.type === "multiselect-remote") {
    const fieldOptions = remoteOptions[field.name] || [];
    const selectedValues = Array.isArray(value) ? value : [];
    const selectedOptions = fieldOptions.filter((item) => selectedValues.includes(item.id));
    return (
      <Autocomplete
        key={fieldKey}
        multiple
        disableCloseOnSelect
        options={fieldOptions}
        noOptionsText={
          field.source === "/empresas/"
            ? "Sin empresas disponibles para tu usuario"
            : "No hay opciones"
        }
        value={selectedOptions}
        onChange={(_, next) => onChange(field.name, (next || []).map((item) => item.id))}
        getOptionLabel={(option) => buildOptionLabel(option, field)}
        isOptionEqualToValue={(option, selected) => option.id === selected?.id}
        slotProps={{ popper: { sx: whiteAutocompletePopperSx } }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label}
            required={field.required}
            size="small"
            sx={whiteFieldSx}
          />
        )}
      />
    );
  }

  if (field.type === "select-static") {
    const staticOptions = Array.isArray(field.options) ? field.options : [];
    const selectedOption = staticOptions.find((item) => item.value === value) || null;
    return (
      <Autocomplete
        key={fieldKey}
        options={staticOptions}
        value={selectedOption}
        onChange={(_, next) => onChange(field.name, next?.value ?? "")}
        getOptionLabel={(option) => option?.label || ""}
        isOptionEqualToValue={(option, selected) => option.value === selected?.value}
        slotProps={{ popper: { sx: whiteAutocompletePopperSx } }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label}
            required={field.required}
            size="small"
            sx={whiteFieldSx}
          />
        )}
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <TextField
        key={fieldKey}
        label={field.label}
        required={field.required}
        multiline
        minRows={3}
        value={value ?? ""}
        onChange={(event) => onChange(field.name, event.target.value)}
        fullWidth
        size="small"
        sx={whiteFieldSx}
      />
    );
  }

  return (
    <TextField
      key={fieldKey}
      label={field.label}
      required={field.required}
      type={
        field.type === "json"
          ? "text"
          : field.type === "password"
            ? showSecretByField[field.name]
              ? "text"
              : "password"
            : field.type
      }
      value={value ?? ""}
      onChange={(event) => onChange(field.name, event.target.value)}
      fullWidth
      size="small"
      InputProps={
        field.type === "password"
          ? {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => toggleShowSecret(field.name)}
                    onMouseDown={(event) => event.preventDefault()}
                    sx={{ color: "#ffffff" }}
                  >
                    {showSecretByField[field.name] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }
          : undefined
      }
      sx={whiteFieldSx}
    />
  );
}

export default FieldRenderer;
