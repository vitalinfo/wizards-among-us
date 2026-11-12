export type CountBar = { key: string; label: string; count: number };

// A count per category as horizontal bars, on the campaign analytics page:
// a label such as a region's name is too long to sit under a column. Plain
// HTML, no client JavaScript. Each row says its number in text, so the bars
// carry nothing a screen reader would miss and they are hidden from it.
export function CountBarChart({
  id,
  bars,
  labels,
}: {
  // Names the figure; unique on the page, which shows several of these.
  id: string;
  bars: CountBar[];
  labels: { title: string; description: string };
}) {
  const max = Math.max(0, ...bars.map(({ count }) => count));
  const titleId = `${id}-title`;

  return (
    <figure
      aria-labelledby={titleId}
      className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-3"
    >
      <figcaption>
        <span id={titleId} className="font-semibold">
          {labels.title}
        </span>
        <span className="text-muted-foreground mt-1 block text-sm">
          {labels.description}
        </span>
      </figcaption>
      <ul className="flex flex-col gap-2 text-sm">
        {bars.map(({ key, label, count }) => (
          <li
            key={key}
            className="grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-x-3 gap-y-1 sm:grid-cols-[14rem_1fr]"
          >
            <span>{label}</span>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="h-4 flex-1">
                <span
                  className="bg-primary block h-full rounded-sm"
                  style={{ width: max === 0 ? 0 : `${(count / max) * 100}%` }}
                />
              </span>
              <span className="min-w-8 text-right tabular-nums">{count}</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
