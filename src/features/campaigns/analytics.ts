// Day-by-day state of one campaign on /admin/campaigns/[id]/analytics: at the
// end of each Kyiv day, how many children were waiting for a wizard and how
// many already had one.
//
// No table holds status history, so it is replayed from audit_logs — every
// status change in the app writes a row there in the same request. A change
// made by hand in SQL without an audit row is invisible to this.

export type AnalyticsState = "waiting" | "claimed" | "other";

// Each audited action that moves an application, and where it leaves it.
// «Взяті» includes fulfilled (Vital): a child whose gift arrived still had a
// wizard, so the line only falls when a claim is released.
export const STATE_EVENTS = {
  "application.submitted": "other",
  "application.rejected": "other",
  "application.reopened": "other",
  "application.approved": "waiting",
  "claim.released_by_admin": "waiting",
  "claim.created": "claimed",
  "claim.assigned_by_admin": "claimed",
  "claim.processed": "claimed",
  "claim.unprocessed": "claimed",
  "application.fulfilled": "claimed",
  // Written by hand with the SQL that undoes a parent's mistaken «отримали»
  // (2026-11-09); the application goes back to claimed or processed.
  "application.fulfil_reverted": "claimed",
} as const satisfies Record<string, AnalyticsState>;

export type StateEvent = {
  applicationId: string;
  day: string; // YYYY-MM-DD, Europe/Kyiv
  state: AnalyticsState;
};

export type AnalyticsDay = {
  day: string;
  waiting: number;
  claimed: number;
};

// One row per day from the first event to the last — or to `through` (today,
// for a running campaign). `events` must be in the order they happened.
export function buildAnalyticsDays(
  events: StateEvent[],
  through?: string | null,
): AnalyticsDay[] {
  if (events.length === 0) {
    return [];
  }

  const first = events[0].day;
  const lastEvent = events[events.length - 1].day;
  const last = through && through > lastEvent ? through : lastEvent;

  const current = new Map<string, AnalyticsState>();
  const rows: AnalyticsDay[] = [];
  let next = 0;
  for (let day = first; day <= last; day = nextDay(day)) {
    while (next < events.length && events[next].day <= day) {
      current.set(events[next].applicationId, events[next].state);
      next += 1;
    }
    let waiting = 0;
    let claimed = 0;
    for (const state of current.values()) {
      if (state === "waiting") {
        waiting += 1;
      }
      if (state === "claimed") {
        claimed += 1;
      }
    }
    rows.push({ day, waiting, claimed });
  }
  return rows;
}

// Calendar arithmetic on the date itself, in UTC, where every day is 24 hours.
function nextDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + 1))
    .toISOString()
    .slice(0, 10);
}
