import Button from "@mui/material/Button";
import ModalBase from "./ModalBase.jsx";

function ModalConfirmacion({ open, onClose, onConfirm, line }) {
    return (
        <ModalBase
            open={open}
            onClose={onClose}
            title="Desactivar linea"
            actions={
                <>
                    <Button onClick={onClose} variant="outlined">
                        Cancelar
                    </Button>
                    <Button onClick={onConfirm} variant="contained" color="error">
                        Desactivar
                    </Button>
                </>
            }
        >
            {line ? (
                <p className="modal-text">
                    Vas a inactivar {line.label} ({line.number}). Queres continuar?
                </p>
            ) : null}
        </ModalBase>
    );
}

export default ModalConfirmacion;
