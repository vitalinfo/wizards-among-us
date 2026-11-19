import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuditLogRow } from "@/features/audit/adminQueries";

// The route's job is the gate: who may download, and whose activity. The rows
// and the session are database reads.
const state = vi.hoisted(() => ({
  actor: null as unknown,
  filters: [] as unknown[],
  logged: [] as unknown[],
}));
const ADMIN_ID = "6f1c0a52-2b7e-4c1a-9a43-0d6b2f8e9c11";
vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => state.actor,
}));
vi.mock("@/features/admins/adminQueries", () => ({
  getAdminById: async (id: string) =>
    id === ADMIN_ID ? { id, email: "olena@example.com" } : null,
}));
vi.mock("@/features/audit/adminQueries", () => ({
  listAllAuditLogs: async (filter: unknown): Promise<AuditLogRow[]> => {
    state.filters.push(filter);
    return [
      {
        id: "00000000-0000-4000-8000-000000000001",
        actorId: ADMIN_ID,
        actorType: "admin",
        actorLabel: "olena@example.com",
        action: "application.approved",
        targetType: "application",
        targetId: "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da",
        ip: null,
        createdAt: new Date("2026-11-03T08:33:41Z"),
      },
    ];
  },
}));
vi.mock("@/features/audit/log", () => ({
  recordAuditLog: async (entry: unknown) => {
    state.logged.push(entry);
  },
}));

import messages from "../../../../../../messages/uk.json";

import { GET } from "../route";

const admin = { kind: "admin", id: "a1", email: "admin@example.com" };

function get(search: string) {
  return GET(new NextRequest(`http://localhost/admin/audit/export${search}`));
}

beforeEach(() => {
  state.actor = admin;
  state.filters = [];
  state.logged = [];
});

describe("the audit export", () => {
  it("is not there for anyone but an admin", async () => {
    for (const actor of [null, { kind: "user", id: "u1" }]) {
      state.actor = actor;
      const response = await get(`?actor=${ADMIN_ID}`);
      expect(response.status).toBe(404);
    }
    expect(state.filters).toEqual([]);
    expect(state.logged).toEqual([]);
  });

  // Never the whole trail, and never a user's: an actor that is not an admin
  // is the same 404 as a missing one.
  it("refuses a view that is not one admin's", async () => {
    for (const search of [
      "",
      "?action=application.approved",
      "?actor=not-a-uuid",
      "?actor=11111111-2222-4333-8444-555555555555",
    ]) {
      expect((await get(search)).status).toBe(404);
    }
    expect(state.filters).toEqual([]);
    expect(state.logged).toEqual([]);
  });

  it("exports that admin's filtered rows, and records the download", async () => {
    const response = await get(
      `?actor=${ADMIN_ID}&action=notification.approved_failed&reason=blocked&page=3`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(state.filters).toEqual([
      {
        action: "notification.approved_failed",
        reason: "blocked",
        targetId: null,
        actorId: ADMIN_ID,
      },
    ]);
    const body = await response.text();
    expect(body.split("\r\n")).toHaveLength(2);
    expect(body).toContain("olena@example.com");
    // The type columns in words, from the real messages.
    expect(body).toContain(
      `,${messages.admin.audit.actorType.admin},${ADMIN_ID},`,
    );
    expect(body).toContain(`,${messages.admin.audit.targetType.application},`);

    expect(state.logged).toEqual([
      {
        actor: admin,
        action: "admin.audit_exported",
        targetType: "admin",
        targetId: ADMIN_ID,
      },
    ]);
  });
});
