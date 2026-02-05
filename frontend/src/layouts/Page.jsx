export default function Page ({ title, actions, children }) {
    return (
        <div className="flex flex-col gap-4 p-4 align-center items-center bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl shadow-black w-full h-full">
            <div className="flex items-center mb-4 w-full flex-col">
                <div className="flex w-full">
                    <h1
                        className="text-sm text-left text-black dark:text-stone-50 font-semibold text-shadow-xs text-shadow-white"
                    >
                        {title}
                    </h1>
                </div>    
                {actions && <div className="flex items-center mt-4 w-full">
                    {actions}
                </div>}
            </div>
            <div className="flex flex-col items-center w-full">
                {children}
            </div>
        </div>
    );
}
