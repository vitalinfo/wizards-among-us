import { STATE_EVENTS } from "@/features/campaigns/analytics";

import { fulfilRevertBlocker, statusBeforeFulfilment } from "../fulfilRevert";

describe("statusBeforeFulfilment", () => {
  it("is claimed when the volunteer never marked it processed", () => {
    expect(
      statusBeforeFulfilment([
        "application.submitted",
        "application.approved",
        "claim.created",
        "application.fulfilled",
      ]),
    ).toBe("claimed");
  });

  it("restores the volunteer's processed mark", () => {
    expect(
      statusBeforeFulfilment([
        "claim.created",
        "claim.processed",
        "application.fulfilled",
      ]),
    ).toBe("processed");
  });

  it("follows the mark being taken off again", () => {
    expect(
      statusBeforeFulfilment([
        "claim.created",
        "claim.processed",
        "claim.unprocessed",
        "application.fulfilled",
      ]),
    ).toBe("claimed");
  });

  // assignClaim drops the previous volunteer's mark on a takeover.
  it("resets on an admin's reassignment", () => {
    expect(
      statusBeforeFulfilment([
        "claim.created",
        "claim.processed",
        "claim.assigned_by_admin",
        "application.fulfilled",
      ]),
    ).toBe("claimed");
  });

  it("uses the last fulfilment when one was reverted before", () => {
    expect(
      statusBeforeFulfilment([
        "claim.created",
        "application.fulfilled",
        "application.fulfil_reverted",
        "claim.processed",
        "application.fulfilled",
      ]),
    ).toBe("processed");
  });

  it("ignores audit rows that do not change the status", () => {
    expect(
      statusBeforeFulfilment([
        "claim.created",
        "claim.processed",
        "application.file_viewed:letter_photo",
        "notification.fulfilled",
        "application.fulfilled",
        "review.created",
      ]),
    ).toBe("processed");
  });

  it("falls back to claimed with no history", () => {
    expect(statusBeforeFulfilment([])).toBe("claimed");
  });
});

describe("fulfilRevertBlocker", () => {
  const held = { releasedAt: null };

  it("allows a fulfilled application a volunteer still holds", () => {
    expect(fulfilRevertBlocker({ status: "fulfilled", claim: held })).toBe(
      null,
    );
  });

  it.each(["approved", "claimed", "processed", "rejected"] as const)(
    "refuses a %s application",
    (status) => {
      expect(fulfilRevertBlocker({ status, claim: held })).toBe(
        "not_fulfilled",
      );
    },
  );

  it("refuses when nobody holds the claim", () => {
    expect(fulfilRevertBlocker({ status: "fulfilled", claim: null })).toBe(
      "no_active_claim",
    );
    expect(
      fulfilRevertBlocker({
        status: "fulfilled",
        claim: { releasedAt: new Date() },
      }),
    ).toBe("no_active_claim");
  });
});

// The revert's audit row is what takes the application out of «Мрію виконано»
// in the campaign analytics; if it stopped being a state event, the chart
// would keep counting the child as fulfilled.
it("writes an action the analytics replay reads as claimed", () => {
  expect(STATE_EVENTS["application.fulfil_reverted"]).toBe("claimed");
});
