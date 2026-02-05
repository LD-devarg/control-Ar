import Page from "../layouts/Page"

export default function TipoCambio() {
    return (
        <Page title="Tipo de Cambio">
            <div className="flex flex-col gap-4 p-4 align-center items-center bg-white dark:bg-neutral-900 rounded-2xl shadow-xl shadow-black w-full h-full">
                <h2 className="text-black dark:text-white text-lg text-shadow-md text-shadow-black font-semibold">TIPO DE CAMBIO</h2>
                <div>
                    <p className="text-black dark:text-white text-center">Aquí se mostrará la información relacionada con el tipo de cambio actual.</p>
                </div>
            </div>
        </Page>
    );
}