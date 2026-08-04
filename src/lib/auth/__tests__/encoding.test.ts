// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  constantTimeEqual,
  fromBase64Url,
  randomToken,
  sha256Base64Url,
  toBase64Url,
} from "../encoding";

describe("base64url", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 128, 63, 64]);
    expect(Array.from(fromBase64Url(toBase64Url(bytes)))).toEqual(
      Array.from(bytes),
    );
  });

  it("produces url-safe output (no +, /, =)", () => {
    const bytes = new Uint8Array(64).map((_, i) => (i * 7) % 256);
    expect(toBase64Url(bytes)).not.toMatch(/[+/=]/);
  });
});

describe("constantTimeEqual", () => {
  it("is true for equal arrays, false otherwise", () => {
    expect(
      constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])),
    ).toBe(true);
    expect(
      constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])),
    ).toBe(false);
    expect(
      constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3])),
    ).toBe(false);
  });
});

describe("randomToken", () => {
  it("is 32 url-safe bytes and unique per call", () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toMatch(/[+/=]/);
    expect(a).not.toEqual(b);
    expect(fromBase64Url(a).length).toBe(32);
  });
});

describe("sha256Base64Url", () => {
  it("is deterministic and differs for different inputs", async () => {
    expect(await sha256Base64Url("hello")).toEqual(
      await sha256Base64Url("hello"),
    );
    expect(await sha256Base64Url("hello")).not.toEqual(
      await sha256Base64Url("world"),
    );
  });
});
