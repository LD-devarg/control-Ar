import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import CircularProgress from "@mui/material/CircularProgress";
import { useTenant } from "../context/TenantContext";

export default function TenantSelector() {
  const { canSelectTenant, tenantId, tenantOptions, setTenantId, loading } = useTenant();
  const hasCurrentOption = tenantOptions.some((item) => String(item.id) === String(tenantId));
  const selectValue = hasCurrentOption ? String(tenantId) : "";

  if (!canSelectTenant) return null;

  return (
    <FormControl
      size="small"
      sx={{
        minWidth: { xs: 120, sm: 190 },
        width: { xs: 120, sm: "auto" },
      }}
    >
      <InputLabel id="tenant-selector-label">Empresa</InputLabel>
      <Select
        labelId="tenant-selector-label"
        label="Empresa"
        value={selectValue}
        onChange={(event) => setTenantId(event.target.value)}
        endAdornment={loading ? <CircularProgress size={14} sx={{ mr: 3 }} /> : null}
        sx={{
          "& .MuiSelect-select": {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        }}
      >
        {tenantOptions.map((item) => (
          <MenuItem key={item.id} value={String(item.id)}>
            {item.nombre}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
