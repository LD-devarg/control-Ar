import { useEffect, useMemo, useRef, useState } from "react";
import Page from "../layouts/Page";
import TablaPauta from "../components/TablaPauta";

const COLUMN_SETS = {
    Bms: [
        { key: "name", label: "Nombre" },
        { key: "metaId", label: "Meta_ID" },
        { key: "status", label: "Estado" },
    ],
    "Ad Accounts": [
        { key: "name", label: "Nombre" },
        { key: "bm", label: "Bm" },
        { key: "metaId", label: "Meta_ID" },
        { key: "status", label: "Estado" },
    ],
    FanPage: [
        { key: "name", label: "Nombre" },
        { key: "metaId", label: "Meta_ID" },
        { key: "status", label: "Estado" },
    ],
    Campaigns: [
        { key: "name", label: "Nombre" },
        { key: "adAccount", label: "Ad Account" },
        { key: "metaId", label: "Meta_ID" },
        { key: "createdAt", label: "Fecha de creación" },
        { key: "objective", label: "Objetivo" },
        { key: "status", label: "Estado" },
    ],
    Adsets: [
        { key: "name", label: "Nombre" },
        { key: "campaign", label: "Campaign" },
        { key: "metaId", label: "Meta_ID" },
        { key: "budget", label: "Presupuesto" },
        { key: "createdAt", label: "Fecha de creación" },
        { key: "location", label: "Ubicación" },
        { key: "region", label: "Región" },
        { key: "conversionSite", label: "Sitio de Conversión" },
        { key: "ageRange", label: "Rango Edad" },
        { key: "gender", label: "Sexo" },
        { key: "targeting", label: "Segmentación" },
        { key: "status", label: "Estado" },
    ],
    Ads: [
        { key: "name", label: "Nombre" },
        { key: "adset", label: "Adset" },
        { key: "metaId", label: "Meta_ID" },
        { key: "text", label: "Texto" },
        { key: "title", label: "Titulo" },
        { key: "image", label: "Imagen" },
        { key: "status", label: "Estado" },
    ],
};

export default function PautaDatabase() {
    const [tab, setTab] = useState("Bms");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [selectedByView, setSelectedByView] = useState({});
    const pickerRef = useRef(null);

    const tabs = ["Bms", "Ad Accounts", "FanPage", "Campaigns", "Adsets", "Ads"];
    const columnsForView = COLUMN_SETS[tab] ?? COLUMN_SETS.Bms;

    const selectedColumns = useMemo(() => {
        const saved = selectedByView[tab];
        if (Array.isArray(saved)) return saved;
        return columnsForView.map((col) => col.key);
    }, [columnsForView, selectedByView, tab]);

    const toggleColumn = (key) => {
        setSelectedByView((prev) => {
            const current = Array.isArray(prev[tab])
                ? prev[tab]
                : columnsForView.map((col) => col.key);
            const next = current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key];
            return { ...prev, [tab]: next };
        });
    };

    const showAll = () => {
        setSelectedByView((prev) => ({
            ...prev,
            [tab]: columnsForView.map((col) => col.key),
        }));
    };

    const hideAll = () => {
        setSelectedByView((prev) => ({ ...prev, [tab]: [] }));
    };

    useEffect(() => {
        if (!pickerOpen) return;
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [pickerOpen]);

    return (
        <Page title="Base de Datos Pauta Publicitaria">
            <div className="w-full">
                <div className="w-full rounded-2xl border border-slate-300/40 bg-white/80 p-4 shadow-sm dark:border-zinc-700 dark:bg-neutral-900/70">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {tabs.map((label) => {
                            const active = tab === label;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => setTab(label)}
                                    className={[
                                        "rounded-full px-4 py-2 text-sm font-semibold transition",
                                        active
                                            ? "bg-gradient-to-b from-sky-300 to-sky-700 text-white shadow-md"
                                            : "bg-slate-100 text-slate-600 hover:bg-white dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                                    ].join(" ")}
                                >
                                    {label}
                                </button>
                            );
                        })}

                        <div className="relative ml-auto" ref={pickerRef}>
                            <button
                                type="button"
                                onClick={() => setPickerOpen((open) => !open)}
                                className="rounded-full border border-slate-300/70 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                                Columnas
                            </button>
                            {pickerOpen ? (
                                <div className="absolute right-0 z-10 mt-2 w-[320px] rounded-xl border border-slate-300/70 bg-white/95 p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95">
                                    <div className="mb-2 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={showAll}
                                            className="rounded-md border border-slate-300/70 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        >
                                            Mostrar todo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={hideAll}
                                            className="rounded-md border border-slate-300/70 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        >
                                            Ocultar todo
                                        </button>
                                    </div>
                                    <div className="flex max-h-48 flex-wrap gap-2 overflow-auto pr-1 text-xs">
                                        {columnsForView.map((col) => (
                                            <label
                                                key={col.key}
                                                className="flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/70 px-2 py-1 text-xs text-slate-600 transition hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="accent-sky-600"
                                                    checked={selectedColumns.includes(col.key)}
                                                    onChange={() => toggleColumn(col.key)}
                                                />
                                                {col.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-4">
                        <TablaPauta view={tab} visibleColumns={selectedColumns} enableColumnPicker={false} />
                    </div>
                </div>
            </div>
        </Page>
    );
}
