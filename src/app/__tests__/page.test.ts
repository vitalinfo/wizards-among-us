import { describe, expect, it } from "vitest";

import { SITE } from "@/lib/site";

import { metadata } from "../page";

describe("landing page metadata", () => {
  it("is indexable, with production's URL as the canonical", () => {
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe(SITE.url);
  });
});
