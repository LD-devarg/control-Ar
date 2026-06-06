export default function Page({ title, actions, children }) {
    return (
        <div className="flex h-full min-h-0 w-full flex-col items-center p-0 bg-transparent">
            <div className="flex w-full shrink-0 flex-col">
                <div className="flex w-full bg:transparent items-center justify-between">
                    <div className=" bg:transparent flex h-full items-start w-2/10 dark:bg:transparent">
                        <h1
                            className="text-sm text-left w-full text-black dark:text-stone-50 font-semibold text-shadow-xs text-shadow-white bg:transparent dark:bg:transparent"
                        >
                            {title}
                        </h1>
                    </div>
                    {actions && <div className="flex items-end justify-end-safe mt-0 mb-0 pb-2 w-full">
                        {actions}
                    </div>}
                </div>
            </div>
            <div className="flex w-full min-h-0 flex-1 flex-col items-center overflow-hidden">
                {children}
            </div>
        </div>
    );
}
