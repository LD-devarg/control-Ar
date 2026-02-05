import * as React from 'react';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { areaElementClasses, lineElementClasses } from '@mui/x-charts/LineChart';
import { chartsAxisHighlightClasses } from '@mui/x-charts/ChartsAxisHighlight';

const data = [
  { start: '01-01', end: '01-07', downloads: 120 },
  { start: '01-08', end: '01-14', downloads: 180 },
  { start: '01-15', end: '01-21', downloads: 95 },
  { start: '01-22', end: '01-28', downloads: 210 },
  { start: '01-29', end: '02-04', downloads: 160 },
  { start: '02-05', end: '02-11', downloads: 240 },
  { start: '02-12', end: '02-18', downloads: 130 },
];

const downloads = data.map((item) => item.downloads);
const weeks = data.map((item) => `${item.start} al ${item.end}`);

const settings = {
  data: downloads,
  baseline: 'min',
  margin: { bottom: 0, top: 6, left: 4, right: 4 },
  xAxis: { id: 'week-axis', data: weeks },
  yAxis: {
    domainLimit: (_, maxValue) => ({
      min: -maxValue / 6,
      max: maxValue,
    }),
  },
  sx: {
    [`& .${areaElementClasses.root}`]: { opacity: 0.22 },
    [`& .${lineElementClasses.root}`]: { strokeWidth: 3.2 },
    [`& .${chartsAxisHighlightClasses.root}`]: {
      stroke: 'rgb(2, 132, 199)',
      strokeDasharray: 'none',
      strokeWidth: 2,
    },
  },
  slotProps: {
    lineHighlight: { r: 4 },
  },
  clipAreaOffset: { top: 3, bottom: 3 },
  axisHighlight: { x: 'line' },
};

export default function GraficoLineas() {
  const [weekIndex, setWeekIndex] = React.useState(null);
  const currentValue = downloads[weekIndex ?? downloads.length - 1].toLocaleString();

  return (
    <div className="h-24 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm border-zinc-700 bg-zinc-900">
      <div
        onKeyDown={(event) => {
          switch (event.key) {
            case 'ArrowLeft':
              setWeekIndex((p) =>
                p === null ? weeks.length - 1 : (weeks.length + p - 1) % weeks.length,
              );
              break;
            case 'ArrowRight':
              setWeekIndex((p) => (p === null ? 0 : (p + 1) % weeks.length));
              break;
            default:
          }
        }}
        onFocus={() => setWeekIndex((p) => (p === null ? 0 : p))}
        role="button"
        aria-label="Evolucion semanal"
        tabIndex={0}
        className="flex h-full flex-col justify-between gap-1.5 outline-none"
      >
        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
          <DownloadIcon fill="currentColor" width="9px" height="12px" />
          <span>{weekIndex === null ? 'Comparativo semanal' : weeks[weekIndex]}</span>
        </div>

        <div className="flex items-center justify-between border-b border-sky-200 pb-2 dark:border-sky-900/60">
          <p className="text-xl font-semibold leading-tight text-white">
            {currentValue}
          </p>

          <SparkLineChart
            height={44}
            width={210}
            area
            showHighlight
            color="rgb(2, 132, 199)"
            onHighlightedAxisChange={(axisItems) => {
              setWeekIndex(axisItems[0]?.dataIndex ?? null);
            }}
            highlightedAxis={
              weekIndex === null
                ? []
                : [{ axisId: 'week-axis', dataIndex: weekIndex }]
            }
            {...settings}
          />
        </div>
      </div>
    </div>
  );
}

function DownloadIcon(props) {
  return (
    <svg viewBox="0 0 7.22 11.76" aria-hidden="true" {...props}>
      <title>Downloads</title>
      <g>
        <polygon
          points="4.59 4.94 4.59 0 2.62 0 2.62 4.94 0 4.94 3.28 9.53 7.22 4.94 4.59 4.94"
          aria-label="Downloads icon"
        />
        <rect x="0.11" y="10.76" width="7" height="1" />
      </g>
    </svg>
  );
}
