import { beforeEach, describe, expect, it, vi } from "vitest";

// The insert is captured rather than run: the column this covers needs its
// migration applied, and what is under test is which address reaches the row.
const written = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
vi.mock("@/db", () => ({
  getDb: () => ({
    insert: () => ({
      values: async (row: Record<string, unknown>) => {
        written.rows.push(row);
      },
    }),
  }),
}));
const request = vi.hoisted(() => ({ headers: null as Headers | null }));
vi.mock("next/headers", () => ({
  headers: async () => {
    if (!request.headers) {
      throw new Error("`headers` was called outside a request scope");
    }
    return request.headers;
  },
}));

import { recordAuditLog } from "../log";

const admin = {
  kind: "admin",
  id: "a1",
  email: "admin@example.com",
} as const;

beforeEach(() => {
  written.rows = [];
  request.headers = null;
});

describe("recordAuditLog", () => {
  it("records the address Heroku's router saw, not one the client sent", async () => {
    request.headers = new Headers({
      "x-forwarded-for": "198.51.100.77, 109.108.250.136",
    });

    await recordAuditLog({
      actor: admin,
      action: "application.file_viewed:idp_certificate",
      targetType: "application",
    });

    expect(written.rows).toHaveLength(1);
    expect(written.rows[0]).toMatchObject({
      actorLabel: "admin@example.com",
      ip: "109.108.250.136",
    });
  });

  it("still writes the row, with no address, outside a request", async () => {
    await recordAuditLog({
      actor: admin,
      action: "application.reopened",
      targetType: "application",
    });

    expect(written.rows).toHaveLength(1);
    expect(written.rows[0]).toMatchObject({ ip: null });
  });
});
