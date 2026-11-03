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
const data = vi.hoisted(() => ({ rows: [] as AuditLogRow[] }));
vi.mock("@/features/audit/adminQueries", () => ({
  countAuditLogs: async () => data.rows.length,
  listAuditLogs: async () => data.rows,
}));
// Async server components nested in the page, which RTL cannot render; they
// are not what this spec is about (Pager has its own).
vi.mock("@/components/admin/AdminNav", () => ({ AdminNav: () => null }));
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

async function renderPage() {
  const ui = await AdminAuditPage({ searchParams: Promise.resolve({}) });
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

  it("has no accessibility violations", async () => {
    data.rows = [row({ ip: "109.108.250.136" })];
    const { container } = await renderPage();

    expect(await axe(container)).toHaveNoViolations();
  });
});
