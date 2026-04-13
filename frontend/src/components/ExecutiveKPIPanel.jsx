import React from "react";

function Sparkline({ points, color = "#22d3ee" }) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const width = 74;
  const height = 14;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const mapped = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * (width - 2) + 1;
      const y = height - 2 - ((value - min) / range) * (height - 4);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mt-0.5 opacity-80">
      <polyline
        points={mapped}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function statusStyle(status) {
  if (status === "green") return { dot: "bg-emerald-400", border: "border-emerald-400/40", bar: "bg-emerald-500" };
  if (status === "yellow") return { dot: "bg-amber-300", border: "border-amber-300/40", bar: "bg-amber-400" };
  return { dot: "bg-rose-400", border: "border-rose-400/40", bar: "bg-rose-500" };
}

function formatCardValue(card, formatters) {
  const { currencyFormatter, percentFormatter, numberFormatter } = formatters;
  if (card.display === "ARS" || card.display === "USD") return currencyFormatter.format(card.value);
  if (card.display === "percent") return percentFormatter.format(card.value);
  return numberFormatter.format(card.value);
}

function formatFooterValue(card, formatters) {
  const { currencyFormatter, percentFormatter, numberFormatter } = formatters;
  if (card.display === "ARS" || card.display === "USD") return currencyFormatter.format(card.value);
  if (card.display === "percent") return percentFormatter.format(card.value);
  return numberFormatter.format(card.value);
}

function RoasWeeklyPanel({ dailySeries }) {
  const hasData = Array.isArray(dailySeries) && dailySeries.length > 0;
  return (
    <aside className="h-full rounded-xl border border-white/10 bg-black/45 px-3 py-3 flex flex-col">
      <h3 className="mb-2 shrink-0 text-sm font-semibold text-white">ROAS semanal</h3>
      <div className="app-scrollbar flex-1 space-y-2 overflow-y-auto pr-1 pb-1" style={{ maxHeight: "18rem" }}>
        {!hasData ? (
          <div className="text-xs text-white/55">Sin datos reales para el periodo seleccionado.</div>
        ) : null}
        {hasData ? dailySeries.map((item, index) => {
          const tone = item.roas >= 3.4 ? "bg-emerald-400" : item.roas >= 2.8 ? "bg-amber-300" : "bg-rose-400";
          return (
            <div key={`weekly-${item.day}-${index}`}>
              <div className="mb-1 flex items-center justify-between text-xs text-white/65">
                <span>{item.day}</span>
                <span>{item.roas.toFixed(2)}</span>
              </div>
              <div className="h-2 w-full rounded bg-white/10">
                <div className={`h-2 rounded ${tone}`} style={{ width: `${Math.min(100, (item.roas / 5) * 100)}%` }} />
              </div>
            </div>
          );
        }) : null}
      </div>
    </aside>
  );
}

export default function ExecutiveKPIPanel({ topCards, middleCards, lowerCards, footerCards, dailySeries, formatters }) {
  return (
    <section className="min-h-[58vh] rounded-xl border border-white/10 bg-black/35 px-2 py-1.5">
      <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">Vista ejecutiva</h2>

      <div className="flex h-full flex-col mt-5 justify-between gap-2 md:flex-row">
        <div className="w-full">
          <div className="flex flex-col items-start gap-1.5 mb-2">
            <div className="row w-full mb-2">
              <div className="grid flex-1 grid-cols-1 gap-1.5 md:grid-cols-3">
                {topCards.map((card) => {
                  const style = statusStyle(card.status);
                  return (
                    <div key={card.key} className={`rounded-lg border ${style.border} bg-black/55 px-4 py-4`}>
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] uppercase tracking-wide text-white/70">{card.label}</p>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      </div>
                      <p className="mt-0.5 text-base font-semibold leading-tight text-cyan-300">{formatCardValue(card, formatters)}</p>
                      <p className="mt-0.5 text-[9px] text-white/55">{card.variation}</p>
                      <Sparkline points={card.trend} color="#22d3ee" />
                      <div className={`mt-0.5 h-1 w-full rounded ${style.bar}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="row w-full mb-2">
              <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3">
                {middleCards.map((card) => {
                  const style = statusStyle(card.status);
                  return (
                    <div key={card.key} className={`rounded-lg border ${style.border} bg-black/50 px-4 py-2`}>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wide text-white/70">{card.label}</p>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-cyan-300">{formatCardValue(card, formatters)}</p>
                      <p className="mt-0.5 text-[10px] text-white/55">{card.variation}</p>
                      <div className={`mt-0.5 h-1 w-full rounded ${style.bar}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="row w-full mb-2">
              <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                {lowerCards.map((card) => {
                  const style = statusStyle(card.status);
                  return (
                    <div key={card.key} className={`rounded-lg border ${style.border} bg-black/45 px-4 py-2`}>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wide text-white/70">{card.label}</p>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-cyan-300">{formatCardValue(card, formatters)}</p>
                      <p className="mt-0.5 text-[10px] text-white/55">{card.variation}</p>
                      <div className={`mt-0.5 h-1 w-full rounded ${style.bar}`} />
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6">
            {footerCards.map((card) => (
              <div key={card.key} className="rounded-lg border border-white/15 bg-black/40 px-4 py-2">
                <p className="text-[10px] uppercase tracking-wide text-white/60">{card.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-cyan-300">{formatFooterValue(card, formatters)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="w-3/10">
          <RoasWeeklyPanel dailySeries={dailySeries} />
        </div>
      </div>
    </section>
  );
}
