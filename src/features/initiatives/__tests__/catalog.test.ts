import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import type { CampaignState } from "@/features/campaigns/queries";
import { INITIATIVES, initiativeStatus } from "../catalog";

const ON = { applicationsEnabled: true };
const OFF = { applicationsEnabled: false };

const campaign = (
  status: CampaignState["status"],
  acceptingApplications = true,
): CampaignState => ({ status, acceptingApplications });

// The pill sits over a button labelled «Прийняти участь», so it has to follow
// whether a parent can ACTUALLY apply — which is three conditions, not one.
// Reading only `status === 'active'` advertised recruitment above a link into
// a form that then refused the family.
describe("initiativeStatus", () => {
  it("is open only when all three intake conditions hold", () => {
    expect(
      initiativeStatus(
        { saint_nicholas_day: campaign("active") },
        ON,
        "saint_nicholas_day",
      ),
    ).toBe("open");
  });

  it("is not open while that campaign has paused submissions", () => {
    expect(
      initiativeStatus(
        { saint_nicholas_day: campaign("active", false) },
        ON,
        "saint_nicholas_day",
      ),
    ).toBe("soon");
  });

  it("is not open while the global kill switch is off", () => {
    expect(
      initiativeStatus(
        { saint_nicholas_day: campaign("active") },
        OFF,
        "saint_nicholas_day",
      ),
    ).toBe("soon");
  });

  // The bug this replaces: campaigns are CREATED as `draft`, and draft used to
  // collapse into the same answer as archived — so preparing next year's
  // Миколай told every family on the landing page that they had missed it.
  it("reads a draft campaign as not yet open, NOT as finished", () => {
    expect(
      initiativeStatus(
        { saint_nicholas_day: campaign("draft") },
        ON,
        "saint_nicholas_day",
      ),
    ).toBe("soon");
  });

  it("is closed once that campaign is archived", () => {
    expect(
      initiativeStatus(
        { saint_nicholas_day: campaign("archived") },
        ON,
        "saint_nicholas_day",
      ),
    ).toBe("closed");
  });

  it("is 'soon' for a campaign type that has never existed", () => {
    expect(initiativeStatus({}, ON, "new_school_year")).toBe("soon");
  });

  // «Чарівник для родини» is the on-demand one — we never run it as a
  // campaign, so it has no type and must not be reported as finished.
  it("is 'soon' for an initiative with no campaign type at all", () => {
    expect(
      initiativeStatus(
        { saint_nicholas_day: campaign("active") },
        ON,
        undefined,
      ),
    ).toBe("soon");
  });

  // A database failure arrives here as an empty map and a kill switch read as
  // off. Nothing may read as open on the strength of it.
  it("opens nothing when both reads have failed", () => {
    for (const item of INITIATIVES) {
      expect(initiativeStatus({}, OFF, item.campaignType)).toBe("soon");
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
