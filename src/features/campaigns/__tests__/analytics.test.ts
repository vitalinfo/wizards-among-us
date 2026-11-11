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
      event("a", "2026-11-05", "claimed"), // fulfilled: still has a wizard
    ]);

    expect(days).toEqual([
      { day: "2026-11-01", waiting: 0, claimed: 0 },
      { day: "2026-11-02", waiting: 1, claimed: 1 },
      { day: "2026-11-03", waiting: 1, claimed: 1 },
      { day: "2026-11-04", waiting: 0, claimed: 2 },
      { day: "2026-11-05", waiting: 0, claimed: 2 },
    ]);
  });

  it("moves a released claim back to waiting, and a rejection out of both", () => {
    const days = buildAnalyticsDays([
      event("a", "2026-11-01", "waiting"),
      event("b", "2026-11-01", "waiting"),
      event("a", "2026-11-02", "claimed"),
      event("a", "2026-11-03", "waiting"), // released by an admin
      event("b", "2026-11-03", "other"), // reopened to the queue
    ]);

    expect(days.map(({ waiting, claimed }) => [waiting, claimed])).toEqual([
      [2, 0],
      [1, 1],
      [1, 0],
    ]);
  });

  it("runs on to `through` with the state unchanged, but never cuts the data short", () => {
    const events = [event("a", "2026-11-09", "waiting")];

    expect(buildAnalyticsDays(events, "2026-11-11")).toEqual([
      { day: "2026-11-09", waiting: 1, claimed: 0 },
      { day: "2026-11-10", waiting: 1, claimed: 0 },
      { day: "2026-11-11", waiting: 1, claimed: 0 },
    ]);
    expect(buildAnalyticsDays(events, "2026-11-01")).toHaveLength(1);
  });

  it("crosses month ends and the October DST change as calendar days", () => {
    const days = buildAnalyticsDays([
      event("a", "2026-10-24", "waiting"),
      event("a", "2026-11-01", "claimed"),
    ]);

    expect(days).toHaveLength(9);
    expect(days.at(-1)).toEqual({ day: "2026-11-01", waiting: 0, claimed: 1 });
  });
});
