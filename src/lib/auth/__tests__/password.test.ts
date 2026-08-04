// @vitest-environment node
import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../password";

describe("password hashing (PBKDF2)", () => {
  it("verifies a correct password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(
      true,
    );
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("s3cret");
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("uses a random salt (same password → different stored hashes)", async () => {
    expect(await hashPassword("same")).not.toEqual(await hashPassword("same"));
  });

  it("rejects a malformed stored value", async () => {
    expect(await verifyPassword("x", "not-a-valid-hash")).toBe(false);
    expect(await verifyPassword("x", "pbkdf2$notanumber$salt$hash")).toBe(
      false,
    );
  });
});
