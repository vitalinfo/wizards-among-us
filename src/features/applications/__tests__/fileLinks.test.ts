// @vitest-environment node
import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FILE_LINK_TTL_SECONDS,
  signFileLink,
  verifyFileLink,
  type FileLink,
} from "../fileLinks";

const SECRET = "test-file-link-secret-0123456789abcdef";

const link: FileLink = {
  applicationId: "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da",
  fileId: "5f0e2a52-8a3c-4c1e-9d0e-0c6b1f9e2a11",
  kind: "child_with_letter_photo",
  adminId: "9b7d1c2e-3f4a-4b5c-8d6e-7f8091a2b3c4",
};

const now = new Date("2026-11-16T10:00:00Z");

beforeEach(() => {
  vi.stubEnv("FILE_LINK_SECRET", SECRET);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

// The same claims the signer writes, with any of them overridden — what a
// token minted with the right secret but the wrong contents looks like.
function forge(claims: Record<string, unknown>, secret = SECRET) {
  return new SignJWT({
    app: link.applicationId,
    kind: link.kind,
    adm: link.adminId,
    ...claims,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(link.fileId)
    .setAudience("file-link")
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}

describe("file links", () => {
  it("opens the file it was signed for", async () => {
    const token = await signFileLink(link, now);

    expect(await verifyFileLink(token, now)).toEqual(link);
  });

  it("opens for 30 days and not a second longer", async () => {
    const token = await signFileLink(link, now);
    const at = (seconds: number) => new Date(now.getTime() + seconds * 1000);

    expect(await verifyFileLink(token, at(FILE_LINK_TTL_SECONDS - 1))).toEqual(
      link,
    );
    expect(await verifyFileLink(token, at(FILE_LINK_TTL_SECONDS))).toBeNull();
  });

  it("never signs the ВПО certificate", async () => {
    await expect(
      signFileLink({ ...link, kind: "idp_certificate" as never }, now),
    ).rejects.toThrow(/idp_certificate/);
  });

  it("refuses a validly signed token for the ВПО certificate", async () => {
    // A bug in the signer must not become a certificate link: the kind is
    // checked again on the way in.
    expect(
      await verifyFileLink(await forge({ kind: "idp_certificate" }), now),
    ).toBeNull();
  });

  it("refuses a token signed with another secret", async () => {
    expect(
      await verifyFileLink(
        await forge({}, "another-secret-0123456789abcdef"),
        now,
      ),
    ).toBeNull();
  });

  it("refuses a token whose ids are not uuids", async () => {
    expect(
      await verifyFileLink(await forge({ app: "index.php" }), now),
    ).toBeNull();
  });

  it("refuses a tampered token", async () => {
    const token = await signFileLink(link, now);
    const [header, , signature] = token.split(".");
    const payload = Buffer.from(
      JSON.stringify({
        app: link.applicationId,
        kind: "letter_photo",
        adm: link.adminId,
        sub: link.fileId,
        aud: "file-link",
        exp: 9_999_999_999,
      }),
    ).toString("base64url");

    expect(
      await verifyFileLink(`${header}.${payload}.${signature}`, now),
    ).toBeNull();
  });

  it("refuses something that is not a token", async () => {
    expect(await verifyFileLink("not-a-token", now)).toBeNull();
  });

  it("fails loudly without a secret rather than refusing every link", async () => {
    vi.stubEnv("FILE_LINK_SECRET", "");

    await expect(verifyFileLink("anything", now)).rejects.toThrow(
      /FILE_LINK_SECRET/,
    );
    await expect(signFileLink(link, now)).rejects.toThrow(/FILE_LINK_SECRET/);
  });
});
