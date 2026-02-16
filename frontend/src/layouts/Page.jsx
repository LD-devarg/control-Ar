export default function Page ({ title, actions, children }) {
    return (
        <div className="flex flex-col p-4 align-center items-center bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl shadow-black w-full h-full">
            <div className="flex w-full flex-col">
                <div className="flex w-full bg:transparent items-center justify-between">
                    <div className=" bg:transparent w-2/10 dark:bg:transparent">
                        <h1
                            className="text-sm text-left w-full text-black dark:text-stone-50 font-semibold text-shadow-xs text-shadow-white bg:transparent dark:bg:transparent"
                        >
                            {title}
                        </h1>
                    </div>
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
