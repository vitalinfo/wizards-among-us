import { describe, expect, it } from "vitest";

import { buildAnalyticsDays, type StateEvent } from "../analytics";

function event(
  applicationId: string,
  day: string,
  state: StateEvent["state"],
): StateEvent {
  return { applicationId, day, state };
}

describe("buildAnalyticsDays", () => {
  it("is empty when nothing has happened", () => {
    expect(buildAnalyticsDays([], "2026-11-11")).toEqual([]);
  });

  it("counts each application by its last state at the end of every day", () => {
    const days = buildAnalyticsDays([
      event("a", "2026-11-01", "other"), // submitted
      event("b", "2026-11-01", "other"),
      event("a", "2026-11-02", "waiting"), // approved
      event("b", "2026-11-02", "waiting"),
      event("a", "2026-11-02", "claimed"), // claimed the same day
      event("b", "2026-11-04", "claimed"),
      event("a", "2026-11-05", "fulfilled"), // still has a wizard, too
    ]);

    expect(days).toEqual([
      { day: "2026-11-01", waiting: 0, claimed: 0, fulfilled: 0, rejected: 0 },
      { day: "2026-11-02", waiting: 1, claimed: 1, fulfilled: 0, rejected: 0 },
      { day: "2026-11-03", waiting: 1, claimed: 1, fulfilled: 0, rejected: 0 },
      { day: "2026-11-04", waiting: 0, claimed: 2, fulfilled: 0, rejected: 0 },
      { day: "2026-11-05", waiting: 0, claimed: 2, fulfilled: 1, rejected: 0 },
    ]);
  });

  it("moves a released claim back to waiting, and a reopened decision out of all three", () => {
    const days = buildAnalyticsDays([
      event("a", "2026-11-01", "waiting"),
      event("b", "2026-11-01", "waiting"),
      event("a", "2026-11-02", "claimed"),
      event("a", "2026-11-03", "waiting"), // released by an admin
      event("b", "2026-11-03", "other"), // reopened to the queue
    ]);

    expect(
      days.map(({ waiting, claimed, rejected }) => [
        waiting,
        claimed,
        rejected,
      ]),
    ).toEqual([
      [2, 0, 0],
      [1, 1, 0],
      [1, 0, 0],
    ]);
  });

  it("counts a rejection until an admin reopens it", () => {
    const days = buildAnalyticsDays([
      event("a", "2026-11-01", "other"), // submitted
      event("b", "2026-11-01", "other"),
      event("a", "2026-11-02", "rejected"),
      event("b", "2026-11-02", "rejected"),
      event("b", "2026-11-03", "other"), // reopened to the queue
      event("b", "2026-11-04", "waiting"), // approved this time
    ]);

    expect(
      days.map(({ waiting, claimed, rejected }) => [
        waiting,
        claimed,
        rejected,
      ]),
    ).toEqual([
      [0, 0, 0],
      [0, 0, 2],
      [0, 0, 1],
      [1, 0, 1],
    ]);
  });

  it("takes a reverted «отримали» out of fulfilled but leaves the wizard", () => {
    const days = buildAnalyticsDays([
      event("a", "2026-11-01", "claimed"),
      event("b", "2026-11-01", "claimed"),
      event("a", "2026-11-02", "fulfilled"),
      event("b", "2026-11-02", "fulfilled"), // the parent's mistake…
      event("b", "2026-11-03", "claimed"), // …reverted by hand
      event("b", "2026-11-05", "fulfilled"), // the real one
    ]);

    expect(days.map(({ claimed, fulfilled }) => [claimed, fulfilled])).toEqual([
      [2, 0],
      [2, 2],
      [2, 1],
      [2, 1],
      [2, 2],
    ]);
  });

  it("runs on to `through` with the state unchanged, but never cuts the data short", () => {
    const events = [event("a", "2026-11-09", "waiting")];

    expect(buildAnalyticsDays(events, "2026-11-11")).toEqual([
      { day: "2026-11-09", waiting: 1, claimed: 0, fulfilled: 0, rejected: 0 },
      { day: "2026-11-10", waiting: 1, claimed: 0, fulfilled: 0, rejected: 0 },
      { day: "2026-11-11", waiting: 1, claimed: 0, fulfilled: 0, rejected: 0 },
    ]);
    expect(buildAnalyticsDays(events, "2026-11-01")).toHaveLength(1);
  });

  it("crosses month ends and the October DST change as calendar days", () => {
    const days = buildAnalyticsDays([
      event("a", "2026-10-24", "waiting"),
      event("a", "2026-11-01", "claimed"),
    ]);

    expect(days).toHaveLength(9);
    expect(days.at(-1)).toEqual({
      day: "2026-11-01",
      waiting: 0,
      claimed: 1,
      fulfilled: 0,
      rejected: 0,
    });
  });
});
