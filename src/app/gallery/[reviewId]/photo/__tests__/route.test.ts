// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The gate itself — in the gallery, consented, a confirmation photo — is SQL
// in getGalleryPhoto and needs a database to prove. Under test here: what the
// route does with its answer, and that a malformed id never reaches it.
const db = vi.hoisted(() => ({
  photo: null as null | {
    storageKey: string;
    contentType: string;
    sizeBytes: number;
  },
  asked: [] as string[],
}));
vi.mock("@/features/reviews/queries", () => ({
  getGalleryPhoto: async (reviewId: string) => {
    db.asked.push(reviewId);
    return db.photo;
  },
}));

const send = vi.hoisted(() => vi.fn());
vi.mock("@/lib/storage/client", () => ({
  getStorage: () => ({ send }),
  storageBucket: () => "bucket",
}));

import { GET } from "../route";

const REVIEW_ID = "0c9e5c55-6a3f-4a86-9a0e-4f1d2f6b7a10";
const BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

function open(reviewId: string) {
  return GET(new NextRequest(`http://localhost/gallery/${reviewId}/photo`), {
    params: Promise.resolve({ reviewId }),
  });
}

beforeEach(() => {
  db.photo = null;
  db.asked = [];
  send.mockReset();
  send.mockResolvedValue({
    Body: { transformToByteArray: async () => BYTES },
  });
});

describe("GET /gallery/[reviewId]/photo", () => {
  it("404s a malformed id without querying", async () => {
    const res = await open("not-a-uuid");
    expect(res.status).toBe(404);
    expect(db.asked).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  // Not in the gallery, no consent, or no confirmation photo all look the
  // same from outside: nothing here.
  it("404s when the review has no gallery photo", async () => {
    const res = await open(REVIEW_ID);
    expect(res.status).toBe(404);
    expect(db.asked).toEqual([REVIEW_ID]);
    expect(send).not.toHaveBeenCalled();
  });

  it("serves the photo with no session, privately cached for minutes", async () => {
    db.photo = {
      storageKey: "applications/a/confirmation/x.jpg",
      contentType: "image/jpeg",
      sizeBytes: BYTES.length,
    };
    const res = await open(REVIEW_ID);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=300");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: "bucket",
      Key: "applications/a/confirmation/x.jpg",
    });
  });

  it("404s when the object is gone from storage", async () => {
    db.photo = { storageKey: "k", contentType: "image/jpeg", sizeBytes: 1 };
    send.mockResolvedValue({ Body: undefined });
    expect((await open(REVIEW_ID)).status).toBe(404);
  });
});
