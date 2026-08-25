import { describe, expect, it } from "vitest";

import {
  isContactable,
  resolveUserContact,
  telegramHandleSchema,
  userPhoneSchema,
} from "../contact";

// Contactability gates submit and claim, so this decides whether a volunteer can
// reach a family about a child's gift at all.
describe("resolveUserContact", () => {
  it("prefers the Telegram handle, which stays in sync on every login", () => {
    expect(
      resolveUserContact({ username: "olha_mama", phone: "+380671234567" }),
    ).toEqual({ method: "telegram", value: "olha_mama" });
  });

  it("falls back to the phone when there is no handle", () => {
    expect(
      resolveUserContact({ username: null, phone: "+380671234567" }),
    ).toEqual({ method: "phone", value: "+380671234567" });
  });

  it("returns null when neither exists — this is what blocks submit/claim", () => {
    expect(resolveUserContact({ username: null, phone: null })).toBeNull();
    expect(resolveUserContact(null)).toBeNull();
    expect(isContactable({ username: null, phone: null })).toBe(false);
    expect(isContactable({ username: null, phone: "+380671234567" })).toBe(
      true,
    );
  });
});

describe("userPhoneSchema", () => {
  it("normalizes formatting so stored numbers are comparable", () => {
    expect(userPhoneSchema.parse("+380 (67) 123-45-67")).toBe("+380671234567");
  });

  it("rejects a non-Ukrainian or malformed number", () => {
    expect(userPhoneSchema.safeParse("+15551234567").success).toBe(false);
    expect(userPhoneSchema.safeParse("0671234567").success).toBe(false);
    expect(userPhoneSchema.safeParse("@olha_mama").success).toBe(false);
  });
});

describe("telegramHandleSchema", () => {
  it("strips a leading @ so it matches users.username", () => {
    expect(telegramHandleSchema.parse(" @olha_mama ")).toBe("olha_mama");
  });

  it("rejects a too-short handle or a phone number", () => {
    expect(telegramHandleSchema.safeParse("@ab").success).toBe(false);
    expect(telegramHandleSchema.safeParse("+380671234567").success).toBe(false);
  });
});
