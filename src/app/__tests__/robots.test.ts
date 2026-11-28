import { describe, expect, it } from "vitest";

import { SITE } from "@/lib/site";

import robots from "../robots";

const { rules, sitemap } = robots();
const rule = Array.isArray(rules) ? rules[0] : rules;

describe("robots.txt", () => {
  it("lets every crawler in and points at the sitemap", () => {
    expect(rule.userAgent).toBe("*");
    expect(rule.allow).toBe("/");
    expect(sitemap).toBe(`${SITE.url}/sitemap.xml`);
  });

  // Children's photos: kept out of image search and the result thumbnail.
  // The gallery serves them from /gallery/<review>/photo (unoptimized, no
  // /_next/image); the old static files were /gallery-N.webp.
  it("keeps the gallery photos out, and nothing else", () => {
    expect(rule.disallow).toBe("/gallery");
    for (const path of [
      "/gallery/0c9e5c55-6a3f-4a86-9a0e-4f1d2f6b7a10/photo?v=1",
      "/gallery-1.webp",
    ]) {
      expect(path.startsWith(rule.disallow as string), path).toBe(true);
    }
    for (const path of [
      "/",
      "/reviews",
      "/hero-family.webp",
      "/opengraph-image.png",
    ]) {
      expect(path.startsWith(rule.disallow as string), path).toBe(false);
    }
  });
});
