import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdminListRow } from "@/features/admins/adminQueries";
import { axe } from "@/test/axe";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
const session = vi.hoisted(() => ({
  actor: { kind: "admin", id: "a1", email: "admin@example.com" } as unknown,
}));
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => session.actor,
}));
const data = vi.hoisted(() => ({ rows: [] as AdminListRow[] }));
vi.mock("@/features/admins/adminQueries", () => ({
  listAdmins: async () => data.rows,
}));
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
);
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/admin/AdminNav", () => ({ AdminNav: () => null }));

import messages from "../../../../../messages/uk.json";

import AdminAdminsPage from "../page";

const t = messages.admin.admins;

function admin(overrides: Partial<AdminListRow>): AdminListRow {
  return {
    id: "6f1c0a52-2b7e-4c1a-9a43-0d6b2f8e9c11",
    email: "olena@example.com",
    displayName: "Олена",
    createdAt: new Date("2026-09-01T10:00:00Z"),
    hasAccess: true,
    ...overrides,
  };
}

async function renderPage() {
  const ui = await AdminAdminsPage();
  return render(<>{ui}</>);
}

describe("the admins list", () => {
  it("sends anyone but an admin to the login page", async () => {
    session.actor = { kind: "user", id: "u1" };
    await expect(renderPage()).rejects.toThrow("redirect:/admin/login");
    session.actor = { kind: "admin", id: "a1", email: "admin@example.com" };
  });

  it("says so when nobody has signed in as an admin", async () => {
    data.rows = [];
    await renderPage();
    expect(screen.getByText(t.empty)).toBeInTheDocument();
  });

  it("opens each admin's own log", async () => {
    data.rows = [
      admin({}),
      admin({
        id: "7a2d1b63-3c8f-4d2b-8b54-1e7c3a9f0d22",
        email: "taras@example.com",
        displayName: "Тарас",
      }),
    ];
    await renderPage();

    expect(
      screen.getByRole("link", {
        name: t.logFor.replace("{email}", "olena@example.com"),
      }),
    ).toHaveAttribute(
      "href",
      "/admin/audit?actor=6f1c0a52-2b7e-4c1a-9a43-0d6b2f8e9c11",
    );
    expect(
      screen.getByRole("link", {
        name: t.logFor.replace("{email}", "taras@example.com"),
      }),
    ).toHaveAttribute(
      "href",
      "/admin/audit?actor=7a2d1b63-3c8f-4d2b-8b54-1e7c3a9f0d22",
    );
  });

  // A row outlives its access; the list must not show a former admin as one.
  it("says in words whose access has been removed", async () => {
    data.rows = [
      admin({}),
      admin({
        id: "7a2d1b63-3c8f-4d2b-8b54-1e7c3a9f0d22",
        email: "former@example.com",
        hasAccess: false,
      }),
    ];
    await renderPage();

    const [, current, former] = screen.getAllByRole("row");
    expect(within(current).getByText(t.access.allowed)).toBeInTheDocument();
    expect(within(former).getByText(t.access.removed)).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    data.rows = [admin({})];
    const { container } = await renderPage();
    expect(await axe(container)).toHaveNoViolations();
  });
});
