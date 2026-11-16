// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signFileLink, type FileLink } from "@/features/applications/fileLinks";

// The application, the file row, the admin, the bucket and the audit insert
// are database and storage work. Under test: which links open, which are
// refused, and that an open is logged against the admin who exported it. The
// token is signed and verified for real.
const db = vi.hoisted(() => ({
  campaignActive: true,
  file: null as null | Record<string, unknown>,
  admin: null as null | Record<string, unknown>,
}));
vi.mock("@/features/applications/queries", () => ({
  getApplicationForFileAccess: async () => ({
    campaignActive: db.campaignActive,
  }),
}));
vi.mock("@/features/applications/fileQueries", () => ({
  getApplicationFile: async () => db.file,
}));
vi.mock("@/features/admins/adminQueries", () => ({
  getAdminById: async () => db.admin,
}));

const send = vi.hoisted(() => vi.fn());
vi.mock("@/lib/storage/client", () => ({
  getStorage: () => ({ send }),
  storageBucket: () => "bucket",
}));

const recordAuditLog = vi.hoisted(() => vi.fn());
vi.mock("@/features/audit/log", () => ({ recordAuditLog }));

import { GET } from "../route";

const APPLICATION_ID = "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da";
const FILE_ID = "5f0e2a52-8a3c-4c1e-9d0e-0c6b1f9e2a11";
const ADMIN_ID = "9b7d1c2e-3f4a-4b5c-8d6e-7f8091a2b3c4";

const link: FileLink = {
  applicationId: APPLICATION_ID,
  fileId: FILE_ID,
  kind: "child_with_letter_photo",
  adminId: ADMIN_ID,
};

const BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

function open(token: string) {
  return GET(new NextRequest(`http://localhost/photos/${token}/file`), {
    params: Promise.resolve({ token }),
  });
}

beforeEach(() => {
  vi.stubEnv("FILE_LINK_SECRET", "test-file-link-secret-0123456789abcdef");
  db.campaignActive = true;
  db.file = {
    id: FILE_ID,
    applicationId: APPLICATION_ID,
    kind: "child_with_letter_photo",
    storageKey: "applications/x/child_with_letter_photo/y.jpg",
    contentType: "image/jpeg",
    sizeBytes: BYTES.length,
  };
  db.admin = {
    id: ADMIN_ID,
    email: "coordinator@example.test",
    hasAccess: true,
  };
  send.mockReset().mockResolvedValue({
    Body: { transformToByteArray: async () => BYTES },
  });
  recordAuditLog.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /photos/:token/file", () => {
  it("serves the photo without a session and logs it against the exporting admin", async () => {
    const response = await open(await signFileLink(link));

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(BYTES);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(recordAuditLog).toHaveBeenCalledWith({
      actor: {
        kind: "admin",
        id: ADMIN_ID,
        email: "coordinator@example.test",
      },
      action: "application.file_viewed_via_link:child_with_letter_photo",
      targetType: "application",
      targetId: APPLICATION_ID,
    });
  });

  it.each([
    [
      "an expired link",
      async () =>
        signFileLink(link, new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)),
    ],
    ["something that is not a token", async () => "not-a-token"],
    [
      "a link whose campaign is no longer active",
      async () => {
        db.campaignActive = false;
        return signFileLink(link);
      },
    ],
    [
      "a link to a photo that was replaced",
      async () => {
        db.file = null;
        return signFileLink(link);
      },
    ],
    [
      "a link whose file is now of another kind",
      async () => {
        db.file = { ...db.file, kind: "idp_certificate" };
        return signFileLink(link);
      },
    ],
    [
      "a link from an admin who no longer has access",
      async () => {
        db.admin = { ...db.admin, hasAccess: false };
        return signFileLink(link);
      },
    ],
    [
      "a link from an admin who was deleted",
      async () => {
        db.admin = null;
        return signFileLink(link);
      },
    ],
  ])("answers 404 to %s, reading and logging nothing", async (_, token) => {
    const response = await open(await token());

    expect(response.status).toBe(404);
    expect(send).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
