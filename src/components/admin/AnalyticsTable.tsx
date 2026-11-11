import type { AnalyticsDay } from "@/features/campaigns/analytics";

// The day, already formatted: in full for the table, short for the chart axis.
export type AnalyticsRow = AnalyticsDay & { label: string; shortLabel: string };

const SERIES = ["waiting", "claimed"] as const;

// The numbers at the end of each day. Also the text equivalent of the chart.
export function AnalyticsTable({
  rows,
  labels,
}: {
  rows: AnalyticsRow[];
  labels: { caption: string; day: string } & Record<
    (typeof SERIES)[number],
    string
  >;
}) {
  return (
    // On a phone the table scrolls sideways inside its card; tabIndex lets a
    // keyboard user focus the card and scroll it.
    <div
      role="region"
      aria-labelledby="analytics-table-caption"
      tabIndex={0}
      className="border-border bg-surface focus-visible:outline-ring overflow-x-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <table className="w-full text-sm">
        <caption
          id="analytics-table-caption"
          className="p-3 text-left font-semibold"
        >
          {labels.caption}
        </caption>
        <thead>
          <tr className="border-divider text-muted-foreground border-y">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              {labels.day}
            </th>
            {SERIES.map((key) => (
              <th
                key={key}
                scope="col"
                className="px-3 py-2 text-right font-medium"
              >
                {labels[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.day} className="border-divider border-b last:border-0">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                {row.label}
              </th>
              {SERIES.map((key) => (
                <td key={key} className="px-3 py-2 text-right tabular-nums">
                  {row[key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
