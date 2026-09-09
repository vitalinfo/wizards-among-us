import { describe, expect, it } from "vitest";

import { nextScrollLeft } from "../galleryPaging";

// 25 photos, 502px wide with 20px gaps, in a 1720px box, and a 24px
// scroll-padding so snapping stops at the gutter. A card's snap position is
// therefore its offset MINUS that padding: 0, 498, 1020, 1542, …
const OFFSETS = Array.from({ length: 25 }, (_, i) => Math.max(0, i * 522 - 24));
const MAX = 25 * 522 - 20 - 1720; // scrollWidth − clientWidth

describe("nextScrollLeft", () => {
  it("advances to the next card's snap position, not to a round multiple", () => {
    expect(
      nextScrollLeft({
        offsets: OFFSETS,
        maxScroll: MAX,
        scrollLeft: 0,
        direction: 1,
      }),
    ).toBe(498);
  });

  it("steps on from wherever it already is", () => {
    expect(
      nextScrollLeft({
        offsets: OFFSETS,
        maxScroll: MAX,
        scrollLeft: 498,
        direction: 1,
      }),
    ).toBe(1020);
    expect(
      nextScrollLeft({
        offsets: OFFSETS,
        maxScroll: MAX,
        scrollLeft: 1020,
        direction: -1,
      }),
    ).toBe(498);
  });

  it("stops at the end rather than overshooting it", () => {
    const nearEnd = MAX - 100;
    expect(
      nextScrollLeft({
        offsets: OFFSETS,
        maxScroll: MAX,
        scrollLeft: nearEnd,
        direction: 1,
      }),
    ).toBeLessThanOrEqual(MAX);
  });

  // The whole point of the arrows: they never dead-end.
  it("wraps to the first photo when it is already at the end", () => {
    expect(
      nextScrollLeft({
        offsets: OFFSETS,
        maxScroll: MAX,
        scrollLeft: MAX,
        direction: 1,
      }),
    ).toBe(0);
  });

  it("wraps to the end when it is already at the first photo", () => {
    expect(
      nextScrollLeft({
        offsets: OFFSETS,
        maxScroll: MAX,
        scrollLeft: 0,
        direction: -1,
      }),
    ).toBe(MAX);
  });

  it("treats a fraction of a pixel as being at the edge", () => {
    expect(
      nextScrollLeft({
        offsets: OFFSETS,
        maxScroll: MAX,
        scrollLeft: MAX - 0.6,
        direction: 1,
      }),
    ).toBe(0);
    expect(
      nextScrollLeft({
        offsets: OFFSETS,
        maxScroll: MAX,
        scrollLeft: 1.2,
        direction: -1,
      }),
    ).toBe(MAX);
  });

  it("snaps back to a card after a trackpad drag left it between two", () => {
    expect(
      nextScrollLeft({
        offsets: OFFSETS,
        maxScroll: MAX,
        scrollLeft: 610,
        direction: 1,
      }),
    ).toBe(1020);
  });

  it("is inert before layout, when there are no cards to measure", () => {
    expect(
      nextScrollLeft({
        offsets: [],
        maxScroll: 0,
        scrollLeft: 0,
        direction: 1,
      }),
    ).toBe(0);
  });
});
