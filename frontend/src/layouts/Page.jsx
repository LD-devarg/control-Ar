export default function Page ({ title, actions, children }) {
    return (
        <div className="flex flex-col p-4 align-center items-center bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl shadow-black w-full h-full">
            <div className="flex w-full flex-col">
                <div className="flex w-full">
                    <h1
                        className="text-sm text-left w-2/10  text-black dark:text-stone-50 font-semibold text-shadow-xs text-shadow-white"
                    >
                        {title}
                    </h1>
                {actions && <div className="flex items-end justify-end-safe mt-0 mb-0 pb-4 w-full">
                    {actions}
                </div>}
                </div>    
            </div>
            <div className="flex flex-col items-center w-full">
                {children}
            </div>
        </div>
    );
}
