import { describe, expect, it } from "vitest";

import { moveInOrder } from "../ordering";

const ids = ["a", "b", "c"];

describe("moveInOrder", () => {
  it("swaps a row with the one above it", () => {
    expect(moveInOrder(ids, "c", "up")).toEqual(["a", "c", "b"]);
  });

  it("swaps a row with the one below it", () => {
    expect(moveInOrder(ids, "a", "down")).toEqual(["b", "a", "c"]);
  });

  // The list page disables the button at each end, but the action is a public
  // endpoint: a hand-posted move off the end must be a no-op, not an index
  // error or a row that disappears from the sequence.
  it("leaves the order alone at either end", () => {
    expect(moveInOrder(ids, "a", "up")).toEqual(ids);
    expect(moveInOrder(ids, "c", "down")).toEqual(ids);
  });

  // Deleted between the page render and the click.
  it("leaves the order alone for an id that isn't there", () => {
    expect(moveInOrder(ids, "zz", "up")).toEqual(ids);
    expect(moveInOrder([], "a", "down")).toEqual([]);
  });

  it("never drops or duplicates a row", () => {
    for (const id of ids) {
      for (const direction of ["up", "down"] as const) {
        expect([...moveInOrder(ids, id, direction)].sort()).toEqual([
          "a",
          "b",
          "c",
        ]);
      }
    }
  });

  it("does not mutate the input", () => {
    const input = [...ids];
    moveInOrder(input, "a", "down");
    expect(input).toEqual(ids);
  });
});
