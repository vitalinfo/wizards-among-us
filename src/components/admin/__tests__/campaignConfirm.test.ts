import { describe, expect, it } from "vitest";

import { isCampaignConfirm } from "../CampaignRow";

// The confirmation is a page state driven by ?confirm=…, so the value arrives
// from the query string and is attacker-controlled. It only ever selects which
// prompt to render — the action behind it is re-authorized server-side — but an
// unrecognised value must fall through to "no confirmation pending" rather than
// reaching a translation lookup for a key that doesn't exist.
describe("isCampaignConfirm", () => {
  it("accepts the four real actions", () => {
    for (const value of ["activate", "archive", "openIntake", "closeIntake"]) {
      expect(isCampaignConfirm(value)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    for (const value of [
      "delete",
      "Activate",
      "",
      "__proto__",
      "toString",
      undefined,
      null,
      0,
      {},
    ]) {
      expect(isCampaignConfirm(value)).toBe(false);
    }
  });
});
