import Page from '../layouts/Page.jsx';
import TablaContactos from '../components/TablaContactos.jsx';


function Agenda() {
    return (
        <Page title="Agenda de Contactos">
                <div className='w-full mt-4 h-full'>
                    <TablaContactos />
                </div>
        </Page>
    );
}

export default Agenda;