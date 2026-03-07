

function DisclaimerLanding() {
    return (
        <div className="flex flex-row w-full rounded-full px-4 py-1 bg-black/50 justify-between items-center text-xs text-slate-600 dark:text-zinc-400">
            <div className="p-0 lg:p-2 flex justify-center items-center w-2/10">
                <img src="/no-menores.png" className="w-6 h-6 mr-4" alt="Imagen de advertencia 18+" />
            </div>
            <div className="text-xs w-5/10 text-white text-center border-r-2 border-l-2 pl-4 border-white dark:border-zinc-400 pr-4">
                ⚠️ Juego Responsable
            </div>
            <div className="text-xs w-3/10 text-white text-center pl-4">
                📄 Se aplican TyC.</div>
        </div>
    );
}

export default DisclaimerLanding;