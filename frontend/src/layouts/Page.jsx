export default function Page({ title, actions, children }) {
    return (
        <div className="flex h-full min-h-0 w-full flex-col items-center p-0 bg-transparent">
            <div className="flex w-full shrink-0 flex-col">
                <div className="flex w-full bg:transparent items-center justify-between">
                    <div className="flex h-full items-start w-auto">
                        <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
                            {title}
                        </h1>
                    </div>
                    {actions && <div className="flex items-end justify-end-safe mt-0 mb-0 pb-2 w-full">
                        {actions}
                    </div>}
                </div>
            </div>
            <div className="flex w-full min-h-0 flex-1 flex-col overflow-hidden">
                {children}
            </div>
        </div>
    );
}
