import { timeZone } from "@/i18n/config";

// Whole years elapsed since `from`, counted in the app's time zone rather than
// the server's. Heroku runs in UTC; for two hours either side of New Year that
// is a different year from the one our families are living in.
export function yearsSince(from: number, now: Date = new Date()): number {
  const here = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric" }).format(now),
  );
  return Math.max(0, here - from);
}
