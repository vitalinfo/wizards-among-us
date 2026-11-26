import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdminUserRow } from "@/features/users/adminQueries";
import { axe } from "@/test/axe";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
// The session and the people are database reads; what is under test is how
// the page draws them.
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => ({
    kind: "admin",
    id: "a1",
    email: "admin@example.com",
  }),
}));
const data = vi.hoisted(() => ({ users: [] as AdminUserRow[] }));
vi.mock("@/features/users/adminQueries", () => ({
  countUsers: async () => data.users.length,
  listUsers: async () => data.users,
}));
// Async server components nested in the page, which RTL cannot render; they
// are not what this spec is about.
vi.mock("@/components/admin/AdminNav", () => ({ AdminNav: () => null }));
vi.mock("@/components/admin/UserSearchForm", () => ({
  UserSearchForm: () => null,
}));
vi.mock("@/components/ui/Pager", () => ({ Pager: () => null }));

import messages from "../../../../../messages/uk.json";

import AdminUsersPage from "../page";

const t = messages.admin.users;

function user(overrides: Partial<AdminUserRow>): AdminUserRow {
  return {
    id: "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da",
    username: "olena",
    firstName: "Олена",
    lastName: "Коваль",
    phone: null,
    role: ["volunteer"],
    note: null,
    bannedAt: null,
    applicationCount: 0,
    claimCount: 0,
    createdAt: new Date("2026-11-03T08:33:41Z"),
    ...overrides,
  };
}

async function renderPage() {
  const ui = await AdminUsersPage({ searchParams: Promise.resolve({}) });
  return render(<>{ui}</>);
}

describe("the admin users list", () => {
  // Named for the person: a column of identical «Журнал дій» links tells a
  // screen-reader user nothing about which is which.
  it("links each person to their page and to their audit log", async () => {
    data.users = [
      user({}),
      user({
        id: "9b3e2c74-4d9a-4e3c-9c65-2f8d4b0a1e33",
        firstName: "Микола",
        lastName: null,
      }),
    ];
    const { container } = await renderPage();

    expect(
      screen.getByRole("link", {
        name: t.logFor.replace("{name}", "Олена Коваль"),
      }),
    ).toHaveAttribute(
      "href",
      "/admin/audit?actorType=user&actor=d75c6aa0-d3c3-468b-bffa-6ca82a25a1da",
    );
    expect(
      screen.getByRole("link", { name: t.logFor.replace("{name}", "Микола") }),
    ).toHaveAttribute(
      "href",
      "/admin/audit?actorType=user&actor=9b3e2c74-4d9a-4e3c-9c65-2f8d4b0a1e33",
    );
    expect(
      screen.getByRole("link", {
        name: t.viewFor.replace("{name}", "Олена Коваль"),
      }),
    ).toHaveAttribute(
      "href",
      "/admin/users/d75c6aa0-d3c3-468b-bffa-6ca82a25a1da",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("says so when there is nobody", async () => {
    data.users = [];
    await renderPage();

    expect(screen.getByText(t.empty)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: new RegExp(t.log) }),
    ).not.toBeInTheDocument();
  });
});
