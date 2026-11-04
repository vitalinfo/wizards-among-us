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
  // Gallery.tsx serves them as /gallery-N.webp (unoptimized, no /_next/image).
  it("keeps the gallery photos out, and nothing else", () => {
    expect(rule.disallow).toBe("/gallery-");
    expect("/gallery-1.webp".startsWith(rule.disallow as string)).toBe(true);
    for (const path of ["/", "/hero-family.webp", "/opengraph-image.png"]) {
      expect(path.startsWith(rule.disallow as string), path).toBe(false);
    }
  });
});
