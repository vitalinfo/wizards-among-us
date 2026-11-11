import type { AnalyticsRow } from "./AnalyticsTable";

const SERIES = [
  { key: "waiting", stroke: "stroke-chart-waiting" },
  { key: "claimed", stroke: "stroke-chart-claimed" },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

// Drawing space; the svg scales to its container.
const WIDTH = 720;
const HEIGHT = 280;
const PAD = { top: 12, right: 16, bottom: 32, left: 40 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
// Past this many days a marker on every point turns the line into beads.
const MAX_MARKED_DAYS = 31;
const MAX_X_LABELS = 8;

// The two running counts as lines. Server-rendered SVG, no client JavaScript:
// hovering a day shows its numbers through the native <title> tooltip, and the
// same numbers are in the table on the page for anyone who can't see the chart.
export function AnalyticsChart({
  rows,
  labels,
}: {
  rows: AnalyticsRow[];
  labels: { title: string; description: string } & Record<SeriesKey, string>;
}) {
  const max = Math.max(
    0,
    ...rows.flatMap((row) => SERIES.map(({ key }) => row[key])),
  );
  const { top, ticks } = yScale(max);
  const x = (i: number) =>
    PAD.left +
    (rows.length === 1 ? PLOT_W / 2 : (i * PLOT_W) / (rows.length - 1));
  const y = (value: number) => PAD.top + PLOT_H - (value / top) * PLOT_H;
  const labelEvery = Math.ceil(rows.length / MAX_X_LABELS);
  const step = rows.length === 1 ? PLOT_W : PLOT_W / (rows.length - 1);

  return (
    <figure className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-3">
      <figcaption className="font-semibold">{labels.title}</figcaption>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {SERIES.map(({ key, stroke }) => (
          <li key={key} className="flex items-center gap-2">
            <svg width="28" height="8" aria-hidden="true">
              <line
                x1="0"
                y1="4"
                x2="28"
                y2="4"
                strokeWidth="2"
                className={stroke}
              />
            </svg>
            {labels[key]}
          </li>
        ))}
      </ul>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={labels.description}
        className="h-auto w-full"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-divider"
            />
            <text
              x={PAD.left - 8}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-xs"
            >
              {tick}
            </text>
          </g>
        ))}

        {rows.map((row, i) =>
          i % labelEvery === 0 ? (
            <text
              key={row.day}
              x={x(i)}
              y={HEIGHT - 10}
              textAnchor="middle"
              className="fill-muted-foreground text-xs"
            >
              {row.shortLabel}
            </text>
          ) : null,
        )}

        {SERIES.map(({ key, stroke }) => (
          <g key={key} className={stroke}>
            {rows.length > 1 ? (
              <polyline
                fill="none"
                strokeWidth="2"
                strokeLinejoin="round"
                points={rows
                  .map((row, i) => `${x(i)},${y(row[key])}`)
                  .join(" ")}
              />
            ) : null}
            {rows.length <= MAX_MARKED_DAYS
              ? rows.map((row, i) => (
                  <circle
                    key={row.day}
                    cx={x(i)}
                    cy={y(row[key])}
                    r="4"
                    strokeWidth="2"
                    className="fill-surface"
                  />
                ))
              : null}
          </g>
        ))}

        {/* One invisible column per day, wider than any mark, carrying the
            day's numbers as a tooltip. */}
        {rows.map((row, i) => (
          <rect
            key={row.day}
            x={x(i) - step / 2}
            y={PAD.top}
            width={step}
            height={PLOT_H}
            fill="transparent"
          >
            <title>
              {`${row.label}: ${SERIES.map(({ key }) => `${labels[key]} ${row[key]}`).join(", ")}`}
            </title>
          </rect>
        ))}
      </svg>
    </figure>
  );
}

// A y axis that ends on a round number with at most ~5 gridlines, in whole
// counts (there is no half an application).
function yScale(max: number): { top: number; ticks: number[] } {
  let tick = 1;
  if (max > 4) {
    const rough = max / 4;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const normalized = rough / magnitude;
    const nice =
      normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    tick = Math.max(1, nice * magnitude);
  }
  const top = Math.max(tick, Math.ceil(max / tick) * tick);
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += tick) {
    ticks.push(value);
  }
  return { top, ticks };
}
