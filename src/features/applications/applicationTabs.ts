import { APPLICATION_STATUSES, type ApplicationStatus } from "@/db/enums";
import {
  DEFAULT_PAGE_SIZE,
  parsePageSize,
  type PageSize,
} from "@/lib/pageSize";

// The url grammar for «Мої заявки» — the tab, the page and the page size, so
// every view is addressable and the browser's back button returns to the one
// you were on.
// Same approach as «Мої підопічні» (features/claims/claimTabs.ts).
//
// One tab per status, in the order an application moves through them — which
// is the order the design draws them (Figma 139:4543).

export type ApplicationTab = "all" | ApplicationStatus;

export const APPLICATION_TABS = [
  "all",
  "draft",
  "submitted",
  "approved",
  "rejected",
  "claimed",
  "fulfilled",
] as const satisfies readonly ApplicationTab[];

export type ApplicationsQuery = {
  tab: ApplicationTab;
  page: number;
  per: PageSize;
};

export function parseApplicationsQuery(params: {
  tab?: string;
  page?: string;
  per?: string;
}): ApplicationsQuery {
  const page = Number(params.page);
  return {
    // An unknown tab falls back to «Всі» rather than erroring: a hand-edited
    // url must never blank the list.
    tab: (APPLICATION_TABS as readonly string[]).includes(params.tab ?? "")
      ? (params.tab as ApplicationTab)
      : "all",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    per: parsePageSize(params.per),
  };
}

// Only ever builds a path under /account/parent/applications, from a tab that
// is one of the known values, a page that is a positive integer and a size from
// PAGE_SIZES — so it is safe to redirect to with values that came off a form.
export function applicationsHref(
  query: Partial<ApplicationsQuery> = {},
): string {
  const params = new URLSearchParams();
  if (query.tab && query.tab !== "all") {
    params.set("tab", query.tab);
  }
  // Changing TAB resets to page 1 — a narrower tab may not have the page you
  // were on. The caller says which it means by passing one or the other.
  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }
  // The size rides along on every link — tabs, pages, dialogs — so choosing
  // one is not undone by the next click.
  if (query.per && query.per !== DEFAULT_PAGE_SIZE) {
    params.set("per", String(query.per));
  }
  const qs = params.toString();
  return `/account/parent/applications${qs ? `?${qs}` : ""}`;
}

// The dialogs «Мої заявки» opens over itself, one application at a time:
// deleting a draft, confirming the gift arrived, and the review that follows.
// Each is page state rather than client script (see ui/Modal): the control
// that opens one is a link to this, and the page draws the dialog.
export const APPLICATION_DIALOGS = ["delete", "receive", "review"] as const;
export type ApplicationDialog = (typeof APPLICATION_DIALOGS)[number];

export function dialogHref(
  query: ApplicationsQuery,
  dialog: ApplicationDialog,
  applicationId: string,
  extra: Record<string, string> = {},
): string {
  const list = applicationsHref(query);
  const params = new URLSearchParams({ dialog, id: applicationId, ...extra });
  return `${list}${list.includes("?") ? "&" : "?"}${params.toString()}`;
}

// Which dialog the url asks for, if any. Unknown values open nothing.
export function parseDialog(params: {
  dialog?: string;
  id?: string;
}): { dialog: ApplicationDialog; id: string } | null {
  return params.id &&
    (APPLICATION_DIALOGS as readonly string[]).includes(params.dialog ?? "")
    ? { dialog: params.dialog as ApplicationDialog, id: params.id }
    : null;
}

// Which statuses a tab lists. «Всі» is every status; each other tab is its own.
export function tabStatuses(tab: ApplicationTab): readonly ApplicationStatus[] {
  return tab === "all" ? APPLICATION_STATUSES : [tab];
}
