import '../assets/css/Contacts.css';
import ReactVirtualizedTable from '../components/TablaContactos.jsx';


function Agenda() {
    return (
        <div className='contact-layout'>
            <section className='contact-container'>
                <h1>Agenda de Contactos</h1>
                <div className='contact-table'>
                    <ReactVirtualizedTable />
                </div>
            </section>
        </div>
    );
}

export default Agenda;