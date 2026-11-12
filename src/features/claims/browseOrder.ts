const HOUR_MS = 60 * 60 * 1000;

// The seed for the volunteer browse shuffle: the volunteer's id plus the
// current hour (Vital, 2026-11-12). The id gives each volunteer an order of
// their own; the hour reshuffles it once an hour, so a child who landed on the
// last page for someone does not stay there all campaign.
//
// The hour is counted from the epoch, not read off a clock face, so it means
// the same thing on every dyno whatever its timezone. Within the hour the seed
// is fixed, which is what keeps offset paging honest: random() per request
// would show a child twice and another never.
export function browseOrderSeed(volunteerId: string, now: Date): string {
  return `${volunteerId}:${Math.floor(now.getTime() / HOUR_MS)}`;
}
