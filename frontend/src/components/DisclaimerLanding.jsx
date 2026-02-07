

function DisclaimerLanding() {
    return (
        <div className="flex flex-row w-full rounded-full px-4 py-2 bg-black/20 justify-between items-center text-xs text-slate-600 dark:text-zinc-400">
            <img src="/18-.png" className="w-10 h-10 mr-4" alt="Imagen de advertencia 18+" />
            <span className="text-xs text-white dark:text-zinc-400 border-r-2 border-l-2 pl-4 border-white dark:border-zinc-400 pr-4">
                ⚠️ Juega responsablemente.
            </span>
            <span className="text-xs  text-white dark:text-zinc-400 ml-4">
                📄 Se aplican Terminos y Condiciones.</span>
        </div>
    );
}

export default DisclaimerLanding;