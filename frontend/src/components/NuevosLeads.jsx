import "../assets/css/NuevosLeads.css";

function NuevosLeads() {
    return (
        <div className="flex flex-col gap-4 p-4 align-center items-center bg-white dark:bg-neutral-900 rounded-2xl shadow-xl shadow-black w-full h-full">
            <h2 className="text-black dark:text-white text-lg text-shadow-md text-shadow-black font-semibold">NUEVOS LEADS</h2>
            <div>
                <p className="text-black dark:text-white text-center">Aquí se mostrarán los nuevos leads generados a partir de las campañas publicitarias.</p>

            </div>
        </div>
    );
}
export default NuevosLeads;
