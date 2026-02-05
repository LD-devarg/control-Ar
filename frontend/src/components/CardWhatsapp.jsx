import Chip from "@mui/material/Chip";

function CardWhatsapp({ line, onStatusClick }) {
    const isActive = Boolean(line?.active);
    const statusClasses = isActive
        ? "!border-emerald-500 !bg-emerald-500 !text-white hover:!bg-emerald-600 cursor-pointer"
        : "!border-rose-500 !bg-rose-500 !text-white !opacity-100 cursor-not-allowed";

    return (
        <div className="flex flex-col items-center justify-between px-3 py-4 border-gray-300 dark:border-gray-700 border-b-1 shadow-md w-full mb-4">
            <div className="flex w-full justify-start text-sm font-bold text-zinc-900 dark:text-zinc-700 mb-1">
                <span>{line?.label}</span>
            </div>
            <div className="flex w-full justify-between items-center">
                <div>
                    <span className="text-black dark:text-white font-light text-lg">{line?.number}</span>
                </div>
                <Chip
                    className={`!rounded-full !border !text-xs !font-bold !px-2 !py-1 ${statusClasses}`}
                    label={isActive ? "ACTIVO" : "INACTIVO"}
                    onClick={() => onStatusClick?.(line?.id)}
                    disabled={!isActive}
                    variant="outlined"
                />
            </div>
        </div>
    );
}

export default CardWhatsapp;
