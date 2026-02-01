import "../assets/css/Modal.css";

function ModalBase({ open, onClose, title, children, actions }) {
    if (!open) return null;

    return (
        <div className="modal-backdrop" onClick={onClose} role="presentation">
            <div
                className="modal-card"
                role="dialog"
                aria-modal="true"
                onClick={(event) => event.stopPropagation()}
            >
                {title ? <h3 className="modal-title">{title}</h3> : null}
                <div className="modal-body">{children}</div>
                {actions ? <div className="modal-actions">{actions}</div> : null}
            </div>
        </div>
    );
}

export default ModalBase;
