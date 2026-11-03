import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// The session and the application lookup are database reads; what is under
// test is how the route answers the body it was sent.
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => ({
    kind: "user",
    id: "parent-1",
    username: "olena",
    firstName: "Олена",
    roles: ["parent"],
  }),
}));
vi.mock("@/features/applications/queries", () => ({
  getMyApplication: async () => ({ parentId: "parent-1", status: "draft" }),
}));

import { POST } from "../route";

const BOUNDARY = "----upload-boundary";
const APPLICATION_ID = "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da";
const params = Promise.resolve({ applicationId: APPLICATION_ID });

function upload(body: string) {
  return new NextRequest(
    `http://localhost/api/applications/${APPLICATION_ID}/files`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${BOUNDARY}` },
      body,
    },
  );
}

const kindPart = [
  `--${BOUNDARY}`,
  'Content-Disposition: form-data; name="kind"',
  "",
  "letter_photo",
].join("\r\n");

describe("POST /api/applications/:id/files", () => {
  it("answers 400 to an upload cut off mid-body", async () => {
    // The file part starts and the body simply ends: no closing boundary.
    const truncated = [
      kindPart,
      `--${BOUNDARY}`,
      'Content-Disposition: form-data; name="file"; filename="letter.jpg"',
      "Content-Type: image/jpeg",
      "",
      "\xff\xd8\xff\xe0 partial bytes",
    ].join("\r\n");

    const response = await POST(upload(truncated), { params });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_body" });
  });

  it("still reads a complete body", async () => {
    // Well-formed but without a file: parsing succeeds and the next check
    // answers, so the catch is not swallowing good requests.
    const complete = `${kindPart}\r\n--${BOUNDARY}--\r\n`;

    const response = await POST(upload(complete), { params });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "missing_file" });
  });

  it("answers 404 to an id that is not a uuid, before any query", async () => {
    // The lookup above is mocked to find an application for ANY id, so only
    // the guard can produce this 404. Postgres would reject the id with an
    // error — the 500 a scanner's `index.php` used to get.
    const complete = `${kindPart}\r\n--${BOUNDARY}--\r\n`;

    const response = await POST(upload(complete), {
      params: Promise.resolve({ applicationId: "index.php" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });
});
