import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Actor } from "@/lib/actor";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

// The session, the campaign list, the rows and the audit insert are database
// work. Under test: who may download, what is refused, and that the filter in
// the url is the one the query receives. The CSV itself is built for real.
const session = vi.hoisted(() => ({ actor: null as Actor | null }));
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => session.actor,
}));

const ACTIVE = "aaaaaaaa-0000-0000-0000-000000000001";
vi.mock("@/features/campaigns/adminQueries", () => ({
  listCampaigns: async () => [
    { id: ACTIVE, title: "Святий Миколай 2026", status: "active" },
  ],
}));

const listForQueueExport = vi.hoisted(() => vi.fn());
vi.mock("@/features/applications/export", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/applications/export")>()),
  listForQueueExport,
}));

const recordAuditLog = vi.hoisted(() => vi.fn());
vi.mock("@/features/audit/log", () => ({ recordAuditLog }));

import messages from "../../../../../../messages/uk.json";
import { GET } from "../route";

const admin: Actor = { kind: "admin", id: "admin-1", email: "a@example.test" };
const volunteer: Actor = {
  kind: "user",
  id: "user-1",
  username: "petro",
  firstName: "Петро",
  roles: ["volunteer"],
};

function download(search: string) {
  return new NextRequest(
    `http://dyno.internal/admin/applications/export?${search}`,
    {
      headers: {
        host: "wizards-among-us.pp.ua",
        "x-forwarded-proto": "https",
      },
    },
  );
}

beforeEach(() => {
  session.actor = admin;
  listForQueueExport.mockReset().mockResolvedValue([
    {
      application: {
        id: "app-1",
        childName: "Марія",
        childAge: 7,
        homeTown: null,
        homeRegion: null,
        currentTown: null,
        currentRegion: null,
        familyStory: null,
        giftDescription: null,
        typeFields: null,
        deliveryInformation: null,
      },
      username: null,
      phone: null,
      photos: [{ id: "file-1", kind: "letter_photo" }],
    },
  ]);
  recordAuditLog.mockReset();
});

describe("GET /admin/applications/export", () => {
  it.each([
    ["nobody", null],
    ["a volunteer", volunteer],
  ])("answers 404 to %s, before reading anything", async (_, actor) => {
    session.actor = actor;

    const response = await GET(download(`campaign=${ACTIVE}`));

    expect(response.status).toBe(404);
    expect(listForQueueExport).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it("refuses «Усі кампанії»", async () => {
    const response = await GET(download("campaign=all&status=all"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "campaign_required" });
    expect(listForQueueExport).not.toHaveBeenCalled();
  });

  it("exports the filtered queue and logs it against the campaign", async () => {
    const response = await GET(
      download(`campaign=${ACTIVE}&status=approved&q=Коваль&page=4`),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(listForQueueExport).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: ACTIVE,
        status: "approved",
        search: "Коваль",
      }),
    );
    expect(recordAuditLog).toHaveBeenCalledWith({
      actor: admin,
      action: "campaign.applications_exported",
      targetType: "campaign",
      targetId: ACTIVE,
    });

    const body = await response.text();
    expect(body).toContain(
      messages.admin.applications.export.columns.childName,
    );
    // The public origin, not the dyno's address the request arrived on.
    expect(body).toContain(
      "https://wizards-among-us.pp.ua/api/applications/app-1/files/file-1",
    );
  });
});
