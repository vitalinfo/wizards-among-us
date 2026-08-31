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

// The queue url for a filter. The default is spelled out rather than omitted so
// a "back" link always returns to the same view the admin left, even if the
// default ever changes.
export function moderationQueueHref(filter: ModerationFilter): string {
  return `/admin/applications?status=${filter}`;
}
