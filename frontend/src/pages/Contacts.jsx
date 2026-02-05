import Page from '../layouts/Page.jsx';
import ReactVirtualizedTable from '../components/TablaContactos.jsx';


function Agenda() {
    return (
        <Page title="Agenda de Contactos">
                <div className='w-full h-full'>
                    <ReactVirtualizedTable />
                </div>
        </Page>
    );
}

export default Agenda;