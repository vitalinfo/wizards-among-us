// The people list's view, parsed out of the url — same approach as the
// moderation queue: each view is addressable, and editing someone's note
// returns to the list the admin was actually looking at rather than resetting
// it.

export const USERS_PAGE_SIZE = 50;

export type UsersQuery = {
  // Free text over name, Telegram handle and phone. Empty means "everyone".
  search: string;
  page: number;
};

export function parseUsersQuery(params: {
  q?: string;
  page?: string;
}): UsersQuery {
  const page = Number(params.page);
  return {
    search: (params.q ?? "").trim(),
    // Anything unparseable is page 1 rather than an error — a bad page number
    // must never be able to blank the list.
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export function usersPageCount(total: number): number {
  // Always at least one page, so an empty result still renders coherently.
  return Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
}

// Omits what is unset, so the plain url stays clean and older links keep
// working.
// Whether the admin has narrowed anything — drives whether a "reset" is worth
// showing. Mirrors isDefaultModerationQuery.
export function isDefaultUsersQuery(query: UsersQuery): boolean {
  return query.search === "";
}

export function usersHref(query: UsersQuery, page?: number): string {
  const params = new URLSearchParams();
  if (query.search !== "") {
    params.set("q", query.search);
  }
  const target = page ?? query.page;
  if (target > 1) {
    params.set("page", String(target));
  }
  const search = params.toString();
  return search === "" ? "/admin/users" : `/admin/users?${search}`;
}

export function userNoteHref(userId: string, query: UsersQuery): string {
  const params = new URLSearchParams();
  if (query.search !== "") {
    params.set("q", query.search);
  }
  if (query.page > 1) {
    params.set("page", String(query.page));
  }
  const search = params.toString();
  return search === ""
    ? `/admin/users/${userId}`
    : `/admin/users/${userId}?${search}`;
}
