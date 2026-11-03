import { APPLICATION_STATUSES, type ApplicationStatus } from "@/db/enums";
import { isUuid } from "@/lib/uuid";
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

// Which campaign the queue shows: one campaign's id, or "all".
export type ModerationCampaign = string;

// What the url's campaign is checked against. The default is the active
// campaign, because that is the one whose applications are still moving; with
// none active there is nothing to prefer, so the queue shows every campaign.
export type ModerationCampaignScope = {
  ids: readonly string[];
  activeId: string | null;
};

const NO_CAMPAIGNS: ModerationCampaignScope = { ids: [], activeId: null };

export function moderationCampaignScope(
  campaigns: readonly { id: string; status: string }[],
): ModerationCampaignScope {
  return {
    ids: campaigns.map((campaign) => campaign.id),
    activeId: campaigns.find((c) => c.status === "active")?.id ?? null,
  };
}

export function defaultModerationCampaign(
  scope: ModerationCampaignScope,
): ModerationCampaign {
  return scope.activeId ?? "all";
}

// An id we don't know — a deleted campaign, a mangled link — falls back to the
// default rather than to an empty queue that reads as "nothing to review".
export function parseModerationCampaign(
  value: string | undefined,
  scope: ModerationCampaignScope = NO_CAMPAIGNS,
): ModerationCampaign {
  if (value === "all") {
    return "all";
  }
  return value && scope.ids.includes(value)
    ? value
    : defaultModerationCampaign(scope);
}

// What to pass to the query: undefined means "no campaign constraint".
export function campaignToId(campaign: ModerationCampaign): string | undefined {
  return campaign === "all" ? undefined : campaign;
}

// Everything the queue is filtered by, parsed out of the url.
export type ModerationQuery = {
  filter: ModerationFilter;
  campaign: ModerationCampaign;
  // Calendar dates as YYYY-MM-DD, in Europe/Kyiv — the zone the whole app
  // renders in. Turned into instants at the query boundary (submittedRange), not
  // here: a date is not a point in time.
  submittedFrom: string | null;
  submittedTo: string | null;
  // One person's applications: the ones they filed as a parent, or the ones
  // they hold an active claim on as a volunteer — what the two counts on
  // /admin/users link to.
  parentId: string | null;
  claimedBy: string | null;
  page: number;
};

// Anything but a uuid is dropped: Postgres answers a malformed one with an
// error, and a mangled link should widen the queue, not break it.
function parseUserId(value: string | undefined): string | null {
  return value && isUuid(value) ? value : null;
}

export function parseModerationQuery(
  params: {
    status?: string;
    campaign?: string;
    from?: string;
    to?: string;
    parent?: string;
    claimedBy?: string;
    page?: string;
  },
  campaigns: ModerationCampaignScope = NO_CAMPAIGNS,
): ModerationQuery {
  const from = parseDateOnly(params.from);
  const to = parseDateOnly(params.to);
  return {
    filter: parseModerationFilter(params.status),
    campaign: parseModerationCampaign(params.campaign, campaigns),
    submittedFrom: from,
    // A backwards range returns nothing and reads as a bug in the page rather
    // than a typo in the form, so the later date wins and the range is dropped.
    submittedTo: to && from && to < from ? null : to,
    parentId: parseUserId(params.parent),
    claimedBy: parseUserId(params.claimedBy),
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

// The queue url for a query. The status and campaign are spelled out rather than
// omitted so a "back" link always returns to the view the admin left, even if
// the default changes — which, for the campaign, it does whenever another one
// is activated. Everything else is omitted when unset, to keep the common url
// clean and older links working. A bare filter carries no campaign, so the
// queue it lands on picks the default.
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
  const q: Omit<ModerationQuery, "campaign"> & { campaign?: string } =
    typeof query === "string"
      ? {
          filter: query,
          submittedFrom: null,
          submittedTo: null,
          parentId: null,
          claimedBy: null,
          page: 1,
        }
      : query;
  const params = new URLSearchParams({ status: q.filter });
  if (q.campaign) {
    params.set("campaign", q.campaign);
  }
  if (q.submittedFrom) {
    params.set("from", q.submittedFrom);
  }
  if (q.submittedTo) {
    params.set("to", q.submittedTo);
  }
  if (q.parentId) {
    params.set("parent", q.parentId);
  }
  if (q.claimedBy) {
    params.set("claimedBy", q.claimedBy);
  }
  const target = page ?? q.page;
  if (target > 1) {
    params.set("page", String(target));
  }
  return params.toString();
}

// Whether the admin has narrowed anything at all — drives whether a "reset"
// control is worth showing.
export function isDefaultModerationQuery(
  query: ModerationQuery,
  campaigns: ModerationCampaignScope = NO_CAMPAIGNS,
): boolean {
  return (
    query.filter === DEFAULT_MODERATION_FILTER &&
    query.campaign === defaultModerationCampaign(campaigns) &&
    query.submittedFrom === null &&
    query.submittedTo === null &&
    query.parentId === null &&
    query.claimedBy === null
  );
}

// Everything one person filed, or everything they currently hold. Every status
// and every campaign, so the list matches the count it was opened from.
export function userApplicationsHref(
  scope: "parent" | "claimedBy",
  userId: string,
): string {
  return moderationQueueHref({
    filter: "all",
    campaign: "all",
    submittedFrom: null,
    submittedTo: null,
    parentId: scope === "parent" ? userId : null,
    claimedBy: scope === "claimedBy" ? userId : null,
    page: 1,
  });
}
