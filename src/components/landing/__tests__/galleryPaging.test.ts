import { describe, expect, it } from "vitest";

import { nextScrollLeft } from "../galleryPaging";

// Four 502px photos with 20px gaps in a 1720px box: step 522, maxScroll 348.
const ROW = { step: 522, maxScroll: 348 };

describe("nextScrollLeft", () => {
  it("advances by one card", () => {
    expect(
      nextScrollLeft({ ...ROW, scrollLeft: 0, direction: 1, maxScroll: 2000 }),
    ).toBe(522);
  });

  it("stops at the end rather than overshooting it", () => {
    expect(nextScrollLeft({ ...ROW, scrollLeft: 0, direction: 1 })).toBe(348);
  });

  // The whole point of the change: the arrows never dead-end.
  it("wraps to the first photo when it is already at the end", () => {
    expect(nextScrollLeft({ ...ROW, scrollLeft: 348, direction: 1 })).toBe(0);
  });

  it("wraps to the end when it is already at the first photo", () => {
    expect(nextScrollLeft({ ...ROW, scrollLeft: 0, direction: -1 })).toBe(348);
  });

  it("treats a fraction of a pixel as being at the edge", () => {
    expect(nextScrollLeft({ ...ROW, scrollLeft: 347.4, direction: 1 })).toBe(0);
    expect(nextScrollLeft({ ...ROW, scrollLeft: 1.2, direction: -1 })).toBe(
      348,
    );
  });

  it("snaps back to a card boundary after a trackpad drag", () => {
    expect(
      nextScrollLeft({
        step: 522,
        maxScroll: 2000,
        scrollLeft: 610,
        direction: 1,
      }),
    ).toBe(1044);
  });

  it("is inert before layout, when every width is still zero", () => {
    expect(
      nextScrollLeft({ step: 0, maxScroll: 0, scrollLeft: 0, direction: 1 }),
    ).toBe(0);
  });
});
