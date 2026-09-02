import { describe, expect, it } from "vitest";

import {
  isDefaultUsersQuery,
  parseUsersQuery,
  userNoteHref,
  usersHref,
  usersPageCount,
  USERS_PAGE_SIZE,
} from "../listQuery";

describe("parseUsersQuery", () => {
  it("defaults to everyone, page 1", () => {
    expect(parseUsersQuery({})).toEqual({ search: "", page: 1 });
  });

  it("reads the search and page out of the url", () => {
    expect(parseUsersQuery({ q: "  Коваль ", page: "3" })).toEqual({
      search: "Коваль",
      page: 3,
    });
  });

  // A bad page in a url must never be able to blank the list.
  it("falls back to page 1 rather than erroring", () => {
    for (const page of ["0", "-2", "abc", "1.5", ""]) {
      expect(parseUsersQuery({ page }).page).toBe(1);
    }
  });
});

describe("usersPageCount", () => {
  it("is at least one, so an empty list still renders", () => {
    expect(usersPageCount(0)).toBe(1);
  });

  it("rounds a partial page up", () => {
    expect(usersPageCount(USERS_PAGE_SIZE)).toBe(1);
    expect(usersPageCount(USERS_PAGE_SIZE + 1)).toBe(2);
  });
});

describe("usersHref", () => {
  it("keeps the plain url clean", () => {
    expect(usersHref(parseUsersQuery({}))).toBe("/admin/users");
  });

  it("round-trips a searched, paged view", () => {
    const query = parseUsersQuery({ q: "Коваль", page: "2" });
    const href = usersHref(query);

    expect(
      parseUsersQuery(
        Object.fromEntries(new URLSearchParams(href.split("?")[1])),
      ),
    ).toEqual(query);
  });

  it("takes an explicit page for the pager", () => {
    const query = parseUsersQuery({ q: "Коваль", page: "2" });
    expect(usersHref(query, 3)).toBe(
      "/admin/users?q=%D0%9A%D0%BE%D0%B2%D0%B0%D0%BB%D1%8C&page=3",
    );
  });
});

// Editing a note has to come back to the list the admin was looking at, not
// reset it — the same reason the moderation queue carries its filter through.
describe("userNoteHref", () => {
  it("carries the view into the note page", () => {
    const query = parseUsersQuery({ q: "Коваль", page: "2" });
    const href = userNoteHref("u1", query);

    expect(href.startsWith("/admin/users/u1?")).toBe(true);
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("q")).toBe("Коваль");
    expect(params.get("page")).toBe("2");
  });

  it("omits an empty view", () => {
    expect(userNoteHref("u1", parseUsersQuery({}))).toBe("/admin/users/u1");
  });
});

// Mirrors isDefaultModerationQuery — the two lists answer "has the admin
// narrowed anything?" the same way.
describe("isDefaultUsersQuery", () => {
  it("is true only when nothing is searched", () => {
    expect(isDefaultUsersQuery(parseUsersQuery({}))).toBe(true);
    expect(isDefaultUsersQuery(parseUsersQuery({ page: "3" }))).toBe(true);
    expect(isDefaultUsersQuery(parseUsersQuery({ q: "Коваль" }))).toBe(false);
  });
});
