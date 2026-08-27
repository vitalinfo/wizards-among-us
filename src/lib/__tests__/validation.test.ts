import { describe, expect, it } from "vitest";

import { adminLoginSchema } from "../validation";

describe("adminLoginSchema", () => {
  it("normalizes email (trim + lowercase)", () => {
    const parsed = adminLoginSchema.parse({
      email: "  Admin@Example.COM ",
      password: "longenough",
    });
    expect(parsed.email).toBe("admin@example.com");
  });

  it("rejects an invalid email or a too-short password", () => {
    expect(
      adminLoginSchema.safeParse({ email: "nope", password: "longenough" })
        .success,
    ).toBe(false);
    expect(
      adminLoginSchema.safeParse({ email: "a@b.com", password: "short" })
        .success,
    ).toBe(false);
  });
});
