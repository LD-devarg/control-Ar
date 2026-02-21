import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import MenuItem from "@mui/material/MenuItem";

const textFieldSx = {
    "& .MuiInputBase-input": { color: "#fff" },
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.8)" },
    "& .MuiOutlinedInput-root fieldset": {
        borderColor: "rgba(255,255,255,0.4)",
    },
    "& .MuiOutlinedInput-root:hover fieldset": {
        borderColor: "rgba(255,255,255,0.7)",
    },
    "& .MuiOutlinedInput-root.Mui-focused fieldset": {
        borderColor: "#fff",
    },
};

const checkboxSx = {
    color: "rgba(255,255,255,0.7)",
    "&.Mui-checked": { color: "#fff" },
};

const primaryButtonSx = { backgroundColor: "#22c55e", color: "#0b0b0b", fontWeight: 700 };
const secondaryButtonSx = { borderColor: "#fff", color: "#fff" };

export default function EmpresaForm({
    selected,
    nombre,
    organizacionId,
    organizaciones = [],
    showOrganizacionField = false,
    activo,
    operatingMode = "full",
    error,
    saving,
    onNombreChange,
    onOrganizacionIdChange,
    onActivoChange,
    onOperatingModeChange,
    onSave,
    onClear,
}) {
    return (
        <div className="w-full lg:w-[420px] rounded-xl bg-black/80 text-white p-4 border border-white/10">
            <div className="font-semibold text-lg mb-3">
                {selected ? "Editar empresa" : "Crear empresa"}
            </div>
            <TextField
                label="Nombre"
                value={nombre}
                onChange={(e) => onNombreChange(e.target.value)}
                fullWidth
                size="small"
                sx={textFieldSx}
            />
            {showOrganizacionField ? (
                <TextField
                    select
                    label="Organizacion"
                    value={organizacionId}
                    onChange={(e) => onOrganizacionIdChange(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ ...textFieldSx, mt: 2 }}
                >
                    {organizaciones.map((org) => (
                        <MenuItem key={org.id} value={org.id}>
                            {org.nombre}
                        </MenuItem>
                    ))}
                </TextField>
            ) : null}
            <TextField
                select
                label="Modo operativo"
                value={operatingMode}
                onChange={(e) => onOperatingModeChange?.(e.target.value)}
                fullWidth
                size="small"
                sx={{ ...textFieldSx, mt: 2 }}
            >
                <MenuItem value="full">Full (compras + bonos + retiros)</MenuItem>
                <MenuItem value="ftd_only">Solo FTD</MenuItem>
            </TextField>
            <div className="flex items-center gap-2 mt-3">
                <Checkbox
                    checked={activo}
                    onChange={(e) => onActivoChange(e.target.checked)}
                    sx={checkboxSx}
                />
                <span className="text-sm">Activo</span>
            </div>
            {error ? <div className="text-red-400 text-sm mt-2">{error}</div> : null}
            <div className="flex flex-wrap gap-2 mt-4">
                <Button
                    variant="contained"
                    onClick={onSave}
                    disabled={saving}
                    sx={primaryButtonSx}
                >
                    {saving ? "Guardando..." : selected ? "Guardar" : "Crear"}
                </Button>
                <Button
                    variant="outlined"
                    onClick={onClear}
                    disabled={saving}
                    sx={secondaryButtonSx}
                >
                    Limpiar
                </Button>
            </div>
        </div>
    );
}
