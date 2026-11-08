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
  it("normalizes formatting to E.164 so stored numbers are comparable", () => {
    expect(userPhoneSchema.parse("+380 (67) 123-45-67")).toBe("+380671234567");
  });

  it("requires international format — no country is guessed", () => {
    expect(userPhoneSchema.safeParse("067 123 45 67").success).toBe(false);
    expect(userPhoneSchema.safeParse("380671234567").success).toBe(false);
    expect(userPhoneSchema.safeParse("00380671234567").success).toBe(false);
  });

  it("accepts a valid foreign number — a displaced family may have no Ukrainian SIM", () => {
    expect(userPhoneSchema.parse("+48 512 345 678")).toBe("+48512345678");
    expect(userPhoneSchema.parse("+49 151 12345678")).toBe("+4915112345678");
  });

  it("rejects a number that is well-formed but not a real range", () => {
    // 555 is reserved in North America; 00 is not a Ukrainian operator code.
    expect(userPhoneSchema.safeParse("+15551234567").success).toBe(false);
    expect(userPhoneSchema.safeParse("+380001234567").success).toBe(false);
  });

  it("rejects something that is not a phone number", () => {
    expect(userPhoneSchema.safeParse("12345").success).toBe(false);
    expect(userPhoneSchema.safeParse("@olha_mama").success).toBe(false);
    expect(userPhoneSchema.safeParse("").success).toBe(false);
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
