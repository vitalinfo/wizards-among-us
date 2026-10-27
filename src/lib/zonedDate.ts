import { timeZone } from "@/i18n/config";

// A calendar date is not a point in time. `submitted_at` is a timestamptz and
// the app renders every date in Europe/Kyiv, so an admin filtering «з 01.09»
// means Kyiv midnight — three hours before the UTC one in summer. Comparing
// against `new Date("2026-09-01")` (which is UTC midnight) would silently drop
// everything submitted between 00:00 and 03:00 Kyiv time that day: rows that
// exist, match, and never appear.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// `<input type="date">` submits YYYY-MM-DD. Anything else is treated as absent
// rather than as an error — a malformed date in a url must not be able to blank
// the queue.
export function parseDateOnly(value: string | undefined): string | null {
  if (!value || !DATE_ONLY.test(value)) {
    return null;
  }
  const at = new Date(`${value}T00:00:00Z`);
  // The NaN check alone does not do what it looks like it does: V8 rejects an
  // impossible MONTH ("2025-13-01" → NaN) but silently ROLLS OVER an impossible
  // day — "2025-02-31" parses to 3 March. So an admin filtering «з 31.02» got a
  // queue cut at a date they never named, and no error anywhere. Comparing the
  // parsed instant back against the text is what actually catches it.
  return Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

// Midnight on this calendar date in `zone`, as an instant.
export function zonedStartOfDay(date: string, zone: string = timeZone): Date {
  const guess = new Date(`${date}T00:00:00Z`);
  const corrected = new Date(guess.getTime() - offsetMs(guess, zone));
  // Second pass: the offset is read AT an instant, and the first guess can land
  // on the wrong side of a DST change. Re-reading at the corrected instant
  // settles it.
  return new Date(guess.getTime() - offsetMs(corrected, zone));
}

// The instant the NEXT day starts, for a half-open [from, before) range. `lte`
// against midnight would exclude the whole day the admin actually named.
export function zonedEndOfDayExclusive(
  date: string,
  zone: string = timeZone,
): Date {
  const start = zonedStartOfDay(date, zone);
  // Advance by a calendar day in the zone, not by 24h: a DST day is 23 or 25
  // hours long.
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = next.toISOString().slice(0, 10);
  const end = zonedStartOfDay(nextDate, zone);
  return end > start ? end : new Date(start.getTime() + 86_400_000);
}

// The LAST instant of this calendar date in `zone`, for a value that is stored
// and then read back as a day — a campaign's `ends_at`, which an admin types as
// «5 грудня» and a volunteer reads as «не пізніше 5 грудня».
//
// Not `zonedStartOfDay`: stored as Kyiv midnight, a deadline would expire a full
// day before the day it names. Not `zonedEndOfDayExclusive` either — that is the
// NEXT day's midnight, which is right for a half-open range and wrong here,
// because formatting it prints «6 грудня». Built from the exclusive end so the
// DST arithmetic is the one already tested rather than a second copy of it.
export function zonedEndOfDay(date: string, zone: string = timeZone): Date {
  return new Date(zonedEndOfDayExclusive(date, zone).getTime() - 1);
}

// The inverse, for a `<input type="date">` that has to show a stored instant as
// the day the admin meant. Reading `toISOString().slice(0, 10)` instead would
// print the UTC day, which for a Kyiv end-of-day is the same date in winter and
// the same date in summer only by luck — it is 21:59:59.999Z, two hours before
// the boundary, so it happens to hold. It would NOT hold for a start-of-day
// value, and a helper that is right by accident is one someone reuses.
export function toZonedDateInput(at: Date, zone: string = timeZone): string {
  // en-CA formats as YYYY-MM-DD, which is what the input element wants.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

// How far `zone` is from UTC at this instant, in milliseconds.
function offsetMs(at: Date, zone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    // Intl can render midnight as hour 24 under hour12: false.
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - at.getTime();
}
