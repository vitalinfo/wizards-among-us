import { APPLICATION_STATUSES, type ApplicationStatus } from "@/db/enums";
import {
  parseDateOnly,
  zonedEndOfDayExclusive,
  zonedStartOfDay,
} from "@/lib/zonedDate";

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

// Everything the queue is filtered by, parsed out of the url.
export type ModerationQuery = {
  filter: ModerationFilter;
  // Calendar dates as YYYY-MM-DD, in Europe/Kyiv — the zone the whole app
  // renders in. Turned into instants at the query boundary (submittedRange), not
  // here: a date is not a point in time.
  submittedFrom: string | null;
  submittedTo: string | null;
  page: number;
};

export function parseModerationQuery(params: {
  status?: string;
  from?: string;
  to?: string;
  page?: string;
}): ModerationQuery {
  const from = parseDateOnly(params.from);
  const to = parseDateOnly(params.to);
  return {
    filter: parseModerationFilter(params.status),
    submittedFrom: from,
    // A backwards range returns nothing and reads as a bug in the page rather
    // than a typo in the form, so the later date wins and the range is dropped.
    submittedTo: to && from && to < from ? null : to,
    page: parseModerationPage(params.page),
  };
}

// The instants to compare `submitted_at` against — half-open [from, before), so
// «по 01.09» includes the whole of the first of September.
export function submittedRange(query: ModerationQuery): {
  submittedFrom?: Date;
  submittedBefore?: Date;
} {
  return {
    submittedFrom: query.submittedFrom
      ? zonedStartOfDay(query.submittedFrom)
      : undefined,
    submittedBefore: query.submittedTo
      ? zonedEndOfDayExclusive(query.submittedTo)
      : undefined,
  };
}

// The queue url for a query. The status is spelled out rather than omitted so a
// "back" link always returns to the view the admin left, even if the default
// ever changes; everything else is omitted when unset, to keep the common url
// clean and older links working.
export function moderationQueueHref(
  query: ModerationQuery | ModerationFilter,
  page?: number,
): string {
  return `/admin/applications?${moderationSearch(query, page)}`;
}

// The same values as a bare query string, for the link INTO an application —
// the detail page carries them back out again, so "back" returns to the exact
// queue the admin left rather than resetting to the default.
export function moderationSearch(
  query: ModerationQuery | ModerationFilter,
  page?: number,
): string {
  const q: ModerationQuery =
    typeof query === "string"
      ? { filter: query, submittedFrom: null, submittedTo: null, page: 1 }
      : query;
  const params = new URLSearchParams({ status: q.filter });
  if (q.submittedFrom) {
    params.set("from", q.submittedFrom);
  }
  if (q.submittedTo) {
    params.set("to", q.submittedTo);
  }
  const target = page ?? q.page;
  if (target > 1) {
    params.set("page", String(target));
  }
  return params.toString();
}

// Whether the admin has narrowed anything at all — drives whether a "reset"
// control is worth showing.
export function isDefaultModerationQuery(query: ModerationQuery): boolean {
  return (
    query.filter === DEFAULT_MODERATION_FILTER &&
    query.submittedFrom === null &&
    query.submittedTo === null
  );
}
