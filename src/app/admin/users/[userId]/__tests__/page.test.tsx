import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { userApplicationsHref } from "@/features/applications/moderationFilter";
import type { AdminUserRow } from "@/features/users/adminQueries";
import { axe } from "@/test/axe";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
// The session and the person are database reads; what is under test is how
// the page draws them.
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => ({
    kind: "admin",
    id: "a1",
    email: "admin@example.com",
  }),
}));
const data = vi.hoisted(() => ({ user: null as AdminUserRow | null }));
vi.mock("@/features/users/adminQueries", () => ({
  getUserForAdmin: async () => data.user,
}));
// AdminNav is async (RTL cannot render it nested); UserNoteForm has its own
// spec and pulls in a server action.
vi.mock("@/components/admin/AdminNav", () => ({ AdminNav: () => null }));
vi.mock("@/components/admin/UserNoteForm", () => ({
  UserNoteForm: () => null,
}));

import messages from "../../../../../../messages/uk.json";

import AdminUserPage from "../page";

const t = messages.admin.users;
const USER_ID = "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da";

function user(overrides: Partial<AdminUserRow>): AdminUserRow {
  return {
    id: USER_ID,
    username: "olena",
    firstName: "Олена",
    lastName: "Коваль",
    phone: null,
    role: ["parent", "volunteer"],
    note: null,
    applicationCount: 0,
    claimCount: 0,
    createdAt: new Date("2026-11-03T08:33:41Z"),
    ...overrides,
  };
}

async function renderPage() {
  const ui = await AdminUserPage({
    params: Promise.resolve({ userId: USER_ID }),
    searchParams: Promise.resolve({}),
  });
  return render(<>{ui}</>);
}

describe("the admin user page", () => {
  it("links each count to that person's applications", async () => {
    data.user = user({ applicationCount: 3, claimCount: 2 });
    const { container } = await renderPage();

    expect(
      screen.getByRole("link", {
        name: t.applicationsFor
          .replace("{name}", "Олена Коваль")
          .replace("{count}", "3"),
      }),
    ).toHaveAttribute("href", userApplicationsHref("parent", USER_ID));
    expect(
      screen.getByRole("link", {
        name: t.claimsFor
          .replace("{name}", "Олена Коваль")
          .replace("{count}", "2"),
      }),
    ).toHaveAttribute("href", userApplicationsHref("claimedBy", USER_ID));
    expect(await axe(container)).toHaveNoViolations();
  });

  // A link to an empty list is a tab stop that leads nowhere.
  it("leaves a zero count as plain text", async () => {
    data.user = user({ applicationCount: 0, claimCount: 0 });
    await renderPage();

    const applicationsLink = new RegExp(t.applicationsFor.split(":")[0]);
    const claimsLink = new RegExp(t.claimsFor.split(":")[0]);
    expect(
      screen.queryByRole("link", { name: applicationsLink }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: claimsLink }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
  });
});
