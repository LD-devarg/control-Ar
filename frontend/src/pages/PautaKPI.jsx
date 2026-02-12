import Page from "../layouts/Page";
import TablaKPI from "../components/TablaKPI.jsx";



function PautaKPI() {
    return (
        <Page title="Rendimientos"
        >
            <div className="mt-4">
                <TablaKPI />
            </div>
        </Page>
    );
}

export default PautaKPI;