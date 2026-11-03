import { afterEach, describe, expect, it, vi } from "vitest";

import { SITE, siteOrigin } from "../site";

describe("siteOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is the deploy's canonical host when one is set", () => {
    vi.stubEnv("CANONICAL_HOST", "staging.wizards-among-us.pp.ua");

    expect(siteOrigin()).toBe("https://staging.wizards-among-us.pp.ua");
  });

  it("falls back to production's URL when it isn't", () => {
    vi.stubEnv("CANONICAL_HOST", "");

    expect(siteOrigin()).toBe(SITE.url);
  });
});
