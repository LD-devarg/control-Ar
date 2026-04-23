import Page from '../layouts/Page.jsx';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import FormClienteCreate from '../components/FormClienteCreate.jsx';
import TablaContactos from '../components/TablaContactos.jsx';
import CargaMasivaContactos from '../components/CargaMasivaContactos.jsx';
import { useTenant } from '../context/TenantContext';


function Agenda() {
    const [openCreate, setOpenCreate] = useState(false);
    const [openCargaMasiva, setOpenCargaMasiva] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const { tenantId } = useTenant();

    return (
        <Page
            title="Agenda de Contactos"
            actions={(
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" color="secondary" onClick={() => setOpenCargaMasiva(true)}>
                        Carga Masiva
                    </Button>
                    <Button variant="outlined" onClick={() => setOpenCreate(true)}>
                        Crear cliente
                    </Button>
                </Stack>
            )}
        >
                <div className='w-full mt-4 h-full'>
                    <TablaContactos key={refreshKey} />
                </div>
                <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
                    <DialogTitle>Crear cliente</DialogTitle>
                    <DialogContent>
                        <FormClienteCreate
                            empresaId={tenantId}
                            onCreated={() => {
                                setOpenCreate(false);
                                setRefreshKey((prev) => prev + 1);
                            }}
                        />
                    </DialogContent>
                </Dialog>
                
                {/* Componente Carga Masiva */}
                <CargaMasivaContactos 
                    open={openCargaMasiva} 
                    onClose={() => {
                        setOpenCargaMasiva(false);
                        setRefreshKey((prev) => prev + 1);
                    }} 
                />
        </Page>
    );
}

export default Agenda;
