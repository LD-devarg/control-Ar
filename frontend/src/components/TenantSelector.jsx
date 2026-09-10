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
        minWidth: { xs: 120, sm: 170 },
        width: { xs: 120, sm: "auto" },
        "& .MuiInputLabel-root": {
          fontSize: "0.78rem",
          top: "-2px",
        },
        "& .MuiInputLabel-shrink": {
          top: "0px",
        },
      }}
    >
      <InputLabel id="tenant-selector-label">Empresa</InputLabel>
      <Select
        labelId="tenant-selector-label"
        label="Empresa"
        value={selectValue}
        onChange={(event) => setTenantId(event.target.value)}
        endAdornment={loading ? <CircularProgress size={13} sx={{ mr: 2.5, color: "rgba(255,255,255,0.4)" }} /> : null}
        sx={{
          height: 33,
          fontSize: "0.8125rem",
          fontWeight: 500,
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          borderRadius: "8px",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.09)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.2)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#3b82f6",
          },
          "& .MuiSelect-select": {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            py: "5px",
            pl: "10px",
          },
          "& .MuiSvgIcon-root": {
            fontSize: "1.15rem",
            color: "rgba(255, 255, 255, 0.45)",
          },
        }}
      >
        {tenantOptions.map((item) => (
          <MenuItem key={item.id} value={String(item.id)} sx={{ fontSize: "0.8125rem" }}>
            {item.nombre}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
