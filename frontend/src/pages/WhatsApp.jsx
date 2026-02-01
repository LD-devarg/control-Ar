import "../assets/css/WhatsApp.css";
import { useMemo, useState } from "react";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import CardWhatsapp from "../components/CardWhatsapp.jsx";
import ModalConfirmacion from "../components/ModalConfirmacion.jsx";
import ModalAgregarLinea from "../components/ModalAgregarLinea.jsx";

function WhatsApp() {
    const [lines, setLines] = useState([
        { id: 1, label: "LINEA 1", number: "2236334137", active: true },
    ]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedLineId, setSelectedLineId] = useState(null);
    const [addOpen, setAddOpen] = useState(false);
    const [newNumber, setNewNumber] = useState("");

    const selectedLine = useMemo(
        () => lines.find((line) => line.id === selectedLineId),
        [lines, selectedLineId]
    );

    const handleOpenConfirm = (lineId) => {
        setSelectedLineId(lineId);
        setConfirmOpen(true);
    };

    const handleConfirmClose = () => {
        setConfirmOpen(false);
        setSelectedLineId(null);
    };

    const handleDeactivate = () => {
        setLines((prev) =>
            prev.map((line) =>
                line.id === selectedLineId ? { ...line, active: false } : line
            )
        );
        handleConfirmClose();
    };

    const handleAddOpen = () => {
        setAddOpen(true);
    };

    const handleAddClose = () => {
        setAddOpen(false);
        setNewNumber("");
    };

    const handleNewNumberChange = (event) => {
        const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 10);
        setNewNumber(digitsOnly);
    };

    const handleAddLine = () => {
        const trimmed = newNumber.trim();
        if (!trimmed) return;
        setLines((prev) => {
            const nextId = prev.length ? Math.max(...prev.map((line) => line.id)) + 1 : 1;
            const nextLabel = `LINEA ${prev.length + 1}`;
            return [
                ...prev,
                { id: nextId, label: nextLabel, number: trimmed, active: true },
            ];
        });
        handleAddClose();
    };

    return (
        <div className="whatsapp-layout">
            <section className="whatsapp-container">
                <h1>Lineas WhatsApp</h1>
                <div className="whatsapp-cards">
                    {lines.map((line) => (
                        <CardWhatsapp
                            key={line.id}
                            line={line}
                            onStatusClick={handleOpenConfirm}
                        />
                    ))}
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddOpen}>
                        AGREGAR
                    </Button>
                </div>
            </section>

            <ModalConfirmacion
                open={confirmOpen}
                onClose={handleConfirmClose}
                onConfirm={handleDeactivate}
                line={selectedLine}
            />

            <ModalAgregarLinea
                open={addOpen}
                onClose={handleAddClose}
                onSave={handleAddLine}
                value={newNumber}
                onChange={handleNewNumberChange}
            />
        </div>
    );
}

export default WhatsApp;
