import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SITE } from "@/lib/site";
import { landingJsonLd, serializeJsonLd } from "@/lib/structuredData";

const data = landingJsonLd({ name: "Назва", description: "Опис" });
const node = (type: string) =>
  data["@graph"].find((entry) => entry["@type"] === type);

describe("landing structured data", () => {
  it("names the organisation, its logo and its other accounts", () => {
    expect(node("Organization")).toMatchObject({
      name: "Назва",
      url: SITE.url,
      logo: `${SITE.url}/icon-192.png`,
      sameAs: [SITE.instagramUrl, SITE.telegramUrl],
    });
  });

  // Not a gallery photo: those are real children.
  it("offers the brand artwork as the page's image", () => {
    expect(node("WebPage")).toMatchObject({
      url: SITE.url,
      description: "Опис",
      primaryImageOfPage: { url: `${SITE.url}/opengraph-image.png` },
    });
  });

  it("points only at production", () => {
    const external = [
      "https://schema.org",
      SITE.instagramUrl,
      SITE.telegramUrl,
    ];
    const own = (JSON.stringify(data).match(/https:\/\/[^"]+/g) ?? []).filter(
      (url) => !external.includes(url),
    );
    expect(own.length).toBeGreaterThan(0);
    for (const url of own) {
      expect(url.startsWith(SITE.url), url).toBe(true);
    }
  });

  it("cannot close its own script tag", () => {
    const html = serializeJsonLd({ name: "</script><script>alert(1)" });
    expect(html).not.toContain("</script>");
    expect(JSON.parse(html)).toEqual({
      name: "</script><script>alert(1)",
    });
  });
});

// The logo and the result favicon: Google wants a square larger than 48px.
describe("public/icon-192.png", () => {
  it("is a 192×192 PNG", () => {
    const png = readFileSync(path.join(process.cwd(), "public/icon-192.png"));
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(192);
    expect(png.readUInt32BE(20)).toBe(192);
  });
});
