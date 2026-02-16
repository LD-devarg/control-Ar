import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";

const WEIGHTS = [
  { key: "ingresos", label: "Ingresos", weight: "30%" },
  { key: "roas", label: "ROAS", weight: "20%" },
  { key: "cpa", label: "CPA", weight: "15%" },
  { key: "cpc", label: "CPC", weight: "10%" },
  { key: "cpl", label: "CPL", weight: "10%" },
  { key: "efectividad", label: "Efectividad", weight: "10%" },
  { key: "frecuencia", label: "Frecuencia", weight: "2.5%" },
  { key: "ctr", label: "CTR", weight: "2.5%" },
];

export default function PerformanceObjectivesModal({
  open,
  onClose,
  objectivesForm,
  onObjectiveChange,
  onSave,
  saving,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth 
    sx={{
      "& .MuiDialog-paper": {
        backgroundColor: "#111217",
        color: "#d6d8e0",
        border: "1px solid #2f313a",
      },
      "& .MuiDialogTitle-root": {
        borderBottom: "1px solid #2f313a",
        backgroundColor: "rgba(17, 18, 23, 0.8)",
        color: "#22d3ee",
      },
      "& .MuiDialogContent-root": {
        paddingTop: "16px",
        paddingBottom: "16px",
        backgroundColor: "rgba(17, 18, 23, 0.6)",
      },
      "& .MuiDialogActions-root": {
        padding: "8px 16px",
        borderTop: "1px solid #2f313a",
        backgroundColor: "rgba(17, 18, 23, 0.8)",
      },
      backdropFilter: "blur(4px)",
      backgroundColor: "rgba(17, 18, 23, 0.8)",
      
    }}
    >
      <DialogTitle>Objetivos de Performance (USD)</DialogTitle>
      <DialogContent>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <TextField
            size="small"
            label="Ingresos objetivo (USD)"
            value={objectivesForm.ingresos_objetivo_usd}
            onChange={(e) => onObjectiveChange("ingresos_objetivo_usd", e.target.value)}
          />
          <TextField
            size="small"
            label="ROAS objetivo"
            value={objectivesForm.roas_objetivo}
            onChange={(e) => onObjectiveChange("roas_objetivo", e.target.value)}
          />
          <TextField
            size="small"
            label="CPA objetivo (USD)"
            value={objectivesForm.cpa_objetivo_usd}
            onChange={(e) => onObjectiveChange("cpa_objetivo_usd", e.target.value)}
          />
          <TextField
            size="small"
            label="CPC objetivo (USD)"
            value={objectivesForm.cpc_objetivo_usd}
            onChange={(e) => onObjectiveChange("cpc_objetivo_usd", e.target.value)}
          />
          <TextField
            size="small"
            label="CPL objetivo (USD)"
            value={objectivesForm.cpl_objetivo_usd}
            onChange={(e) => onObjectiveChange("cpl_objetivo_usd", e.target.value)}
          />
          <TextField
            size="small"
            label="Efectividad objetivo (%)"
            value={objectivesForm.efectividad_objetivo_pct}
            onChange={(e) => onObjectiveChange("efectividad_objetivo_pct", e.target.value)}
          />
          <TextField
            size="small"
            label="Frecuencia objetivo"
            value={objectivesForm.frecuencia_objetivo}
            onChange={(e) => onObjectiveChange("frecuencia_objetivo", e.target.value)}
          />
          <TextField
            size="small"
            label="CTR objetivo (%)"
            value={objectivesForm.ctr_objetivo_pct}
            onChange={(e) => onObjectiveChange("ctr_objetivo_pct", e.target.value)}
          />
        </div>
        <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Pesos fijos</p>
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-white/80">
            {WEIGHTS.map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded bg-black/35 px-2 py-1">
                <span>{item.label}</span>
                <span className="font-semibold">{item.weight}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="error" variant="outlined">
          Cancelar
        </Button>
        <Button onClick={onSave} disabled={saving} variant="outlined" color="primary">
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
