import { timeZone } from "@/i18n/request";

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
  return Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? null : value;
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
