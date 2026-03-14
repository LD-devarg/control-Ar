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
                    helperText="Celular argentino. Ej: 1168597657 o 5491168597657"
                    fullWidth
                    sx={{
                        fontSize: "10px",
                        "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                                borderColor: "rgba(9, 9, 9, 0.8)",
                            },
                            "&:hover fieldset": {
                                borderColor: "#fff",
                            },
                            "&.Mui-focused fieldset": {
                                borderColor: "#fff",
                            },
                        },
                        "& .MuiInputLabel-root": {
                            textAlign: "center",
                            fontSize: "small",
                        },
                        "& .MuiInputBase-input": {
                            color: "#fff",
                        },
                        "& .MuiFormHelperText-root": {
                            color: "rgba(255,255,255,0.85)",
                        },
                    }}
                />
                <Tooltip
                    title="Se guarda en formato internacional para WhatsApp"
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
