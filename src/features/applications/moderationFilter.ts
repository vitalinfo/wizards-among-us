import { APPLICATION_STATUSES, type ApplicationStatus } from "@/db/enums";

// The moderation queue's filter, shared by the queue and the detail page.
//
// It lives in the url so each view is addressable — and so returning from an
// application lands back on the queue the admin was actually working, instead of
// resetting to the default. The detail page therefore has to carry the value
// through untouched.

// "all" is a real choice; anything unrecognised falls back to the default.
export type ModerationFilter = ApplicationStatus | "all";

// We default to the applications waiting for a decision: that is the queue that
// needs an admin, so it is the landing state rather than "everything".
export const DEFAULT_MODERATION_FILTER: ModerationFilter = "submitted";

export function parseModerationFilter(
  value: string | undefined,
): ModerationFilter {
  if (value === "all") {
    return "all";
  }
  return APPLICATION_STATUSES.includes(value as ApplicationStatus)
    ? (value as ApplicationStatus)
    : DEFAULT_MODERATION_FILTER;
}

// What to pass to the query: undefined means "no status constraint".
export function filterToStatus(
  filter: ModerationFilter,
): ApplicationStatus | undefined {
  return filter === "all" ? undefined : filter;
}

// How many applications a page shows. Deliberately modest: the rows are dense
// and an admin works the queue top-down, so a bigger page mostly means markup
// nobody scrolls to.
export const MODERATION_PAGE_SIZE = 50;

// Pages are 1-based because they appear in the url, where "page=0" reads as a
// mistake. Anything unparseable is page 1 rather than an error — a bad page
// number should never be able to blank the queue.
export function parseModerationPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function moderationPageCount(total: number): number {
  // Always at least one page, so an empty queue still renders coherently.
  return Math.max(1, Math.ceil(total / MODERATION_PAGE_SIZE));
}

// The queue url for a filter and page. The filter is spelled out rather than
// omitted so a "back" link always returns to the same view the admin left, even
// if the default ever changes; page is omitted at 1 to keep the common url
// clean and to keep older links working.
export function moderationQueueHref(
  filter: ModerationFilter,
  page = 1,
): string {
  const base = `/admin/applications?status=${filter}`;
  return page > 1 ? `${base}&page=${page}` : base;
}
