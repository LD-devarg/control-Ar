import Chip from "@mui/material/Chip";
import "../assets/css/CardWhatsapp.css";

function CardWhatsapp({ line, onStatusClick }) {
    const isActive = Boolean(line?.active);

    return (
        <div className="whatsapp-card-container">
            <div className="whatsapp-card-label">
                <span>{line?.label}</span>
            </div>
            <div className="whatsapp-card-content">
                <div>
                    <span className="whatsapp-card-number">{line?.number}</span>
                </div>
                <Chip
                    className={`whatsapp-card-status ${isActive ? "is-active" : "is-inactive"}`}
                    label={isActive ? "ACTIVO" : "INACTIVO"}
                    onClick={() => onStatusClick?.(line?.id)}
                    disabled={!isActive}
                    variant="outlined"
                />
            </div>
        </div>
    );
}

export default CardWhatsapp;
