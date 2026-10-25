import { APPLICATION_STATUSES, type ApplicationStatus } from "@/db/enums";

// The url grammar for «Мої заявки» — the tab and the page, so every view is
// addressable and the browser's back button returns to the one you were on.
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

export const APPLICATIONS_PAGE_SIZE = 10;

export type ApplicationsQuery = { tab: ApplicationTab; page: number };

export function parseApplicationsQuery(params: {
  tab?: string;
  page?: string;
}): ApplicationsQuery {
  const page = Number(params.page);
  return {
    // An unknown tab falls back to «Всі» rather than erroring: a hand-edited
    // url must never blank the list.
    tab: (APPLICATION_TABS as readonly string[]).includes(params.tab ?? "")
      ? (params.tab as ApplicationTab)
      : "all",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

// Only ever builds a path under /account/parent/applications, from a tab that
// is one of the known values and a page that is a positive integer — so it is
// safe to redirect to with values that came off a form.
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
  const qs = params.toString();
  return `/account/parent/applications${qs ? `?${qs}` : ""}`;
}

// The list with the delete confirmation open over it, for one draft. The
// dialog is page state rather than client script (see ConfirmModal): the bin
// is a link to this, and the page draws the question.
export function confirmDeleteHref(
  query: ApplicationsQuery,
  applicationId: string,
): string {
  const list = applicationsHref(query);
  const params = new URLSearchParams({ confirm: "delete", id: applicationId });
  return `${list}${list.includes("?") ? "&" : "?"}${params.toString()}`;
}

export function applicationsPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / APPLICATIONS_PAGE_SIZE));
}

// Which statuses a tab lists. «Всі» is every status; each other tab is its own.
export function tabStatuses(tab: ApplicationTab): readonly ApplicationStatus[] {
  return tab === "all" ? APPLICATION_STATUSES : [tab];
}
