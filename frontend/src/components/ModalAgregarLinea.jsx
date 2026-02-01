import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ModalBase from "./ModalBase.jsx";

function ModalAgregarLinea({ open, onClose, onSave, value, onChange }) {
    const hasValue = Boolean(value);

    return (
        <ModalBase
            open={open}
            onClose={onClose}
            title="Agregar linea"
            actions={
                <>
                    <Button onClick={onClose} variant="outlined">
                        Cancelar
                    </Button>
                    <Button onClick={onSave} variant="contained" disabled={!hasValue}>
                        Guardar
                    </Button>
                </>
            }
        >
            <div className="modal-field">
                <TextField
                    label="Numero"
                    value={value}
                    onChange={onChange}
                    helperText="Max. 10 digitos Ej: 2235123456"
                />
                <Tooltip
                    title="No agregar +54, 0 o 15"
                    PopperProps={{ sx: { zIndex: 2101 } }}
                >
                    <IconButton aria-label="Ayuda">
                        <InfoOutlinedIcon />
                    </IconButton>
                </Tooltip>
            </div>
        </ModalBase>
    );
}

export default ModalAgregarLinea;
