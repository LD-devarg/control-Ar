import Page from "../layouts/Page";
import TablaKPI from "../components/TablaKPI.jsx";
import Button from "@mui/material/Button";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { useState } from "react";
import PautaGastoModal from "../components/PautaGastoModal";



function PautaKPI() {
    const [modalOpen, setModalOpen] = useState(false);
    const [toast, setToast] = useState({ open: false, severity: "success", message: "" });

    const handleCreated = () => {
        setToast({
            open: true,
            severity: "success",
            message: "Gasto diario creado. El ROAS se actualizará en Stats.",
        });
    };

    return (
        <Page title="Rendimientos"
            actions={
                <Button
                    variant="outlined"
                    size="medium"
                    color="primary"
                    startIcon={<AddOutlinedIcon />}
                    onClick={() => setModalOpen(true)}
                >
                    Crear gasto
                </Button>
            }
        >
            <div className="mt-4">
                <TablaKPI />
            </div>
            <PautaGastoModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={handleCreated}
            />
            <Snackbar
                open={toast.open}
                autoHideDuration={3500}
                onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                    severity={toast.severity}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </Page>
    );
}

export default PautaKPI;
