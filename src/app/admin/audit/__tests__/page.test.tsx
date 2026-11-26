import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AuditLogRow } from "@/features/audit/adminQueries";
import { axe } from "@/test/axe";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
// The session and the rows are database reads; what is under test is how the
// page draws them.
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => ({
    kind: "admin",
    id: "a1",
    email: "admin@example.com",
  }),
}));
const data = vi.hoisted(() => ({
  rows: [] as AuditLogRow[],
  filters: [] as unknown[],
}));
vi.mock("@/features/audit/adminQueries", () => ({
  countAuditLogs: async (filter: unknown) => {
    data.filters.push(filter);
    return data.rows.length;
  },
  listAuditLogs: async (params: { filter: unknown }) => {
    data.filters.push(params.filter);
    return data.rows;
  },
  listAuditActions: async () => [],
}));
const admin = vi.hoisted(() => ({
  id: "6f1c0a52-2b7e-4c1a-9a43-0d6b2f8e9c11",
  email: "olena@example.com",
  displayName: "Олена",
  createdAt: new Date("2026-09-01T10:00:00Z"),
  hasAccess: true,
}));
vi.mock("@/features/admins/adminQueries", () => ({
  getAdminById: async (id: string) => (id === admin.id ? admin : null),
}));
const USER_ID = vi.hoisted(() => "9b3e2c74-4d9a-4e3c-9c65-2f8d4b0a1e33");
vi.mock("@/features/users/adminQueries", () => ({
  getUserForAdmin: async (id: string) =>
    id === USER_ID ? { id, username: "mykola" } : null,
}));
// Async server components nested in the page, which RTL cannot render; they
// are not what this spec is about (Pager has its own).
vi.mock("@/components/admin/AdminNav", () => ({ AdminNav: () => null }));
vi.mock("@/components/admin/AuditFilterForm", () => ({
  AuditFilterForm: () => null,
}));
vi.mock("@/components/ui/Pager", () => ({ Pager: () => null }));

import messages from "../../../../../messages/uk.json";

import AdminAuditPage from "../page";

function row(overrides: Partial<AuditLogRow>): AuditLogRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    actorId: "a1",
    actorType: "admin",
    actorLabel: "admin@example.com",
    action: "application.file_viewed:idp_certificate",
    targetType: "application",
    targetId: "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da",
    ip: null,
    createdAt: new Date("2026-11-03T08:33:41Z"),
    ...overrides,
  };
}

async function renderPage(
  searchParams: {
    action?: string;
    target?: string;
    actorType?: string;
    actor?: string;
  } = {},
) {
  data.filters = [];
  const ui = await AdminAuditPage({
    searchParams: Promise.resolve(searchParams),
  });
  return render(<>{ui}</>);
}

describe("the admin audit log", () => {
  it("shows where each request came from, and a dash where nothing was recorded", async () => {
    data.rows = [
      row({ ip: "109.108.250.136" }),
      row({ id: "00000000-0000-4000-8000-000000000002", ip: null }),
    ];
    await renderPage();

    expect(
      screen.getByRole("columnheader", {
        name: messages.admin.audit.columns.ip,
      }),
    ).toBeInTheDocument();

    const [, recorded, unrecorded] = screen.getAllByRole("row");
    expect(within(recorded).getByText("109.108.250.136")).toBeInTheDocument();
    // The target is present on both rows, so the only dash is the address.
    expect(within(unrecorded).getByText("—")).toBeInTheDocument();
  });

  it("names each action, with the stored code under it", async () => {
    data.rows = [
      row({ action: "application.file_viewed:idp_certificate" }),
      row({
        id: "00000000-0000-4000-8000-000000000002",
        action: "application.teleported",
      }),
    ];
    await renderPage();

    const [, named, unnamed] = screen.getAllByRole("row");
    expect(
      within(named).getByText(
        messages.admin.audit.actions.application.file_viewed,
      ),
    ).toBeInTheDocument();
    expect(
      within(named).getByText("application.file_viewed:idp_certificate"),
    ).toBeInTheDocument();
    // No copy for it: the code is all there is, and it still reads.
    expect(
      within(unnamed).getByText("application.teleported"),
    ).toBeInTheDocument();
  });

  // A detail with copy — why a notification failed — joins the label in words.
  it("says in words why a notification failed", async () => {
    const a = messages.admin.audit;
    data.rows = [row({ action: "notification.approved_failed:blocked" })];
    await renderPage();

    const [, failed] = screen.getAllByRole("row");
    expect(
      within(failed).getByText(
        `${a.actions.notification.approved_failed}: ${a.actionDetails.notification.blocked}`,
      ),
    ).toBeInTheDocument();
    expect(
      within(failed).getByText("notification.approved_failed:blocked"),
    ).toBeInTheDocument();
  });

  it("names each target's type, and a type without copy by its code", async () => {
    data.rows = [
      row({ targetType: "application" }),
      row({
        id: "00000000-0000-4000-8000-000000000002",
        targetType: "something_new",
      }),
    ];
    await renderPage();

    const [, named, unnamed] = screen.getAllByRole("row");
    expect(
      within(named).getByText(messages.admin.audit.targetType.application),
    ).toBeInTheDocument();
    expect(within(unnamed).getByText("something_new")).toBeInTheDocument();
  });

  it("narrows the count and the page by the url's filters", async () => {
    data.rows = [];
    const target = "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da";
    await renderPage({ action: "application.approved", target });

    const filter = { action: "application.approved", targetId: target };
    expect(data.filters).toEqual([
      expect.objectContaining(filter),
      expect.objectContaining(filter),
    ]);
    // "The log is empty" would be false — only this filter is.
    expect(
      screen.getByText(messages.admin.audit.emptyFiltered),
    ).toBeInTheDocument();
  });

  it("says the log is empty only when nothing is filtered", async () => {
    data.rows = [];
    await renderPage();

    expect(screen.getByText(messages.admin.audit.empty)).toBeInTheDocument();
  });

  it("links an admin actor to their own log", async () => {
    data.rows = [row({ actorId: admin.id, actorLabel: admin.email })];
    await renderPage();

    expect(screen.getByRole("link", { name: admin.email })).toHaveAttribute(
      "href",
      `/admin/audit?actorType=admin&actor=${admin.id}`,
    );
  });

  it("narrows to one admin and offers that view as CSV", async () => {
    data.rows = [row({ actorId: admin.id })];
    await renderPage({ actor: admin.id, action: "application.approved" });

    expect(data.filters).toEqual([
      expect.objectContaining({ actorId: admin.id }),
      expect.objectContaining({ actorId: admin.id }),
    ]);
    expect(
      screen.getByRole("link", {
        name: messages.admin.audit.actorFilter.export,
      }),
    ).toHaveAttribute(
      "href",
      `/admin/audit/export?action=application.approved&actor=${admin.id}`,
    );
  });

  it("narrows to one kind of actor", async () => {
    data.rows = [row({})];
    await renderPage({ actorType: "admin" });

    expect(data.filters).toEqual([
      expect.objectContaining({ actorType: "admin", actorId: null }),
      expect.objectContaining({ actorType: "admin", actorId: null }),
    ]);
    // A type alone is not one admin: nothing to export.
    expect(
      screen.queryByRole("link", {
        name: messages.admin.audit.actorFilter.export,
      }),
    ).not.toBeInTheDocument();
  });

  it("offers one user's view as CSV too", async () => {
    data.rows = [row({ actorId: USER_ID, actorType: "user" })];
    await renderPage({ actorType: "user", actor: USER_ID });

    expect(
      screen.getByRole("link", {
        name: messages.admin.audit.actorFilter.export,
      }),
    ).toHaveAttribute(
      "href",
      `/admin/audit/export?actorType=user&actor=${USER_ID}`,
    );
  });

  // The whole trail is volunteers' addresses beside the children they opened;
  // only one actor's activity is exportable.
  it("offers no export unless narrowed to one actor", async () => {
    data.rows = [row({})];
    await renderPage();
    expect(
      screen.queryByRole("link", {
        name: messages.admin.audit.actorFilter.export,
      }),
    ).not.toBeInTheDocument();

    // An id that names nobody still filters, but has no export.
    await renderPage({ actor: "11111111-2222-4333-8444-555555555555" });
    expect(
      screen.queryByRole("link", {
        name: messages.admin.audit.actorFilter.export,
      }),
    ).not.toBeInTheDocument();

    // Nor does an admin's id under the user type: it matches no row.
    await renderPage({ actorType: "user", actor: admin.id });
    expect(
      screen.queryByRole("link", {
        name: messages.admin.audit.actorFilter.export,
      }),
    ).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    data.rows = [row({ ip: "109.108.250.136" })];
    const { container } = await renderPage();

    expect(await axe(container)).toHaveNoViolations();
  });
});
