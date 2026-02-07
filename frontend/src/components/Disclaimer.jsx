

export default function Disclaimer() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4 text-center dark:from-zinc-900 dark:to-zinc-800">
            <div className="max-w-md rounded-xl bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:bg-zinc-900/80">
                <h1 className="mb-4 text-2xl font-bold text-slate-800 dark:text-zinc-200">
                    Aviso Importante
                </h1>
                <p className="mb-6 text-slate-600 dark:text-zinc-400">
                    Esta aplicación es una herramienta de control y gestión de campañas publicitarias. No está afiliada ni respaldada por Meta (Facebook) ni por ninguna otra plataforma de publicidad. El uso de esta aplicación es bajo su propio riesgo, y no nos hacemos responsables de cualquier daño o pérdida que pueda resultar del uso de esta herramienta.
                </p>
                <button
                    onClick={() => window.location.href = '/home'}
                    className="rounded-full bg-gradient-to-b from-sky-400 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-sky-500 hover:to-sky-700"
                >
                    Aceptar y Continuar
                </button>
            </div>
        </div>
    );
}