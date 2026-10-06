import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { INITIATIVES, initiativeStatus } from "../catalog";

// Three states, and the difference between the last two is whether we have
// ever run that campaign — not something the copy can know. Previously this
// lived inside the landing section as a private helper with no test; it is
// domain logic and two surfaces depend on it now.
describe("initiativeStatus", () => {
  it("is open only while that campaign is active", () => {
    expect(
      initiativeStatus({ saint_nicholas_day: "active" }, "saint_nicholas_day"),
    ).toBe("open");
  });

  it("is closed once that campaign has run and stopped", () => {
    expect(
      initiativeStatus(
        { saint_nicholas_day: "inactive" },
        "saint_nicholas_day",
      ),
    ).toBe("closed");
  });

  it("is 'soon' for a campaign that has never run", () => {
    expect(initiativeStatus({}, "new_school_year")).toBe("soon");
  });

  // «Чарівник для родини» is the on-demand one — we never run it as a
  // campaign, so it has no type and must not be reported as finished.
  it("is 'soon' for an initiative with no campaign type at all", () => {
    expect(initiativeStatus({ saint_nicholas_day: "active" }, undefined)).toBe(
      "soon",
    );
  });

  // A database failure arrives here as an empty object. Nothing may read as
  // open on the strength of it.
  it("opens nothing when there is no campaign state at all", () => {
    for (const item of INITIATIVES) {
      expect(initiativeStatus({}, item.campaignType)).toBe("soon");
    }
  });
});

describe("the initiative catalog", () => {
  it("has copy for every initiative, and no orphans", () => {
    expect(Object.keys(messages.landing.initiatives.items).sort()).toEqual(
      INITIATIVES.map((i) => i.key).sort(),
    );
  });

  it("points at illustration files that exist", async () => {
    const { statSync } = await import("node:fs");
    for (const item of INITIATIVES) {
      expect(
        () => statSync(`public${item.image}`),
        `missing public${item.image}`,
      ).not.toThrow();
    }
  });

  // The slug is a URL. A duplicate would make two initiatives share a page.
  it("gives every initiative a distinct slug", () => {
    const slugs = INITIATIVES.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});
