import "../assets/css/WhatsApp.css";
import { useEffect, useMemo, useState } from "react";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import CardWhatsapp from "../components/CardWhatsapp.jsx";
import ModalConfirmacion from "../components/ModalConfirmacion.jsx";
import ModalAgregarLinea from "../components/ModalAgregarLinea.jsx";
import Page from "../layouts/Page.jsx";
import { createWhatsapp, deactivateWhatsapp, fetchWhatsapps } from "../services/recursos/whatsapp";
import { useTenant } from "../context/TenantContext";

function extractApiErrorMessage(err, fallback) {
    const detail = err?.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;

    const body = err?.response?.data;
    if (Array.isArray(body) && body.length) {
        const first = body[0];
        if (typeof first === "string" && first.trim()) return first;
    }
    if (body && typeof body === "object") {
        const firstKey = Object.keys(body)[0];
        const firstValue = body[firstKey];
        if (Array.isArray(firstValue) && firstValue.length) {
            const first = firstValue[0];
            if (typeof first === "string" && first.trim()) return first;
        }
        if (typeof firstValue === "string" && firstValue.trim()) return firstValue;
    }
    if (typeof err?.message === "string" && err.message.trim()) return err.message;
    return fallback;
}

function WhatsApp() {
    const { tenantId } = useTenant();
    const [lines, setLines] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedLineId, setSelectedLineId] = useState(null);
    const [addOpen, setAddOpen] = useState(false);
    const [newNumber, setNewNumber] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;
        const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchWhatsapps();
            if (mounted) {
                const normalized = (data || []).map((line) => ({
                    ...line,
                    number: line.numero,
                    active: line.activo,
                }));
                setLines(normalized);
            }
        } catch (err) {
            if (mounted) {
                setError("No se pudieron cargar las líneas.");
            }
        } finally {
            if (mounted) {
                setLoading(false);
            }
        }
        };
        load();
        return () => {
            mounted = false;
        };
    }, [tenantId]);

    const activeLines = useMemo(() => lines.filter((line) => line.activo), [lines]);

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

    const handleDeactivate = async () => {
        if (!selectedLine) return;
        try {
            const updated = await deactivateWhatsapp(selectedLine);
            const normalized = {
                ...updated,
                number: updated.numero,
                active: updated.activo,
            };
            setLines((prev) => prev.map((line) => (line.id === updated.id ? normalized : line)));
            handleConfirmClose();
        } catch (err) {
            setError(extractApiErrorMessage(err, "No se pudo desactivar la línea."));
        }
    };

    const handleAddOpen = () => {
        setAddOpen(true);
    };

    const handleAddClose = () => {
        setAddOpen(false);
        setNewNumber("");
    };

    const handleNewNumberChange = (event) => {
        const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 13);
        setNewNumber(digitsOnly);
    };

    const handleAddLine = async () => {
        const trimmed = newNumber.trim();
        if (!trimmed) return;
        try {
            const created = await createWhatsapp(trimmed);
            const normalized = {
                ...created,
                number: created.numero,
                active: created.activo,
            };
            setLines((prev) => [...prev, normalized]);
            handleAddClose();
        } catch (err) {
            setError(extractApiErrorMessage(err, "No se pudo crear la línea."));
        }
    };

    return (
        <Page title="Gestión de Líneas de WhatsApp">
                <div className="whatsapp-cards">
                    {error ? (
                        <span className="text-red-600 text-sm mb-2">{error}</span>
                    ) : null}
                    {activeLines.map((line, index) => (
                        <CardWhatsapp
                            key={line.id}
                            line={{ ...line, label: `LINEA ${index + 1}` }}
                            onStatusClick={handleOpenConfirm}
                        />
                    ))}
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddOpen} disabled={loading}>
                        AGREGAR
                    </Button>
                </div>

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
        </Page>
    );
}

export default WhatsApp;
