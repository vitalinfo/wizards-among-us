// Where the gallery should scroll to when an arrow is pressed.
//
// Pure, and separate from the component, because the interesting part is the
// arithmetic — the wrap at either end, and the fact that the last page is
// usually a PARTIAL step (the row is far wider than the box, so the final
// position is "as far as it goes", not "the last card's offset"). jsdom
// reports every width as 0, so this could not be tested through the DOM.
//
// It takes the cards' actual SNAP POSITIONS rather than a card width and a
// gap. Those are not the same number: the row carries a scroll-padding so
// that snapping stops at the page gutter instead of scrolling it out of
// sight, and a snap position is the card's offset MINUS that padding.
// Computing `index * step` instead landed 24px off every time, and restoring
// scroll-snap after the animation yanked it the rest of the way — a visible
// jerk at the end of every page.
export function nextScrollLeft({
  scrollLeft,
  maxScroll,
  offsets,
  direction,
}: {
  // Current horizontal scroll offset of the row.
  scrollLeft: number;
  // The largest offset it can reach (scrollWidth − clientWidth).
  maxScroll: number;
  // Each card's snap position, ascending. Measured, not derived.
  offsets: readonly number[];
  direction: 1 | -1;
}): number {
  if (offsets.length === 0 || maxScroll <= 0) {
    return 0;
  }

  // A pixel or two of slack: browsers report fractional offsets, and a row
  // that is visually at its end can sit at maxScroll − 0.5.
  const EDGE = 2;

  if (direction === 1 && scrollLeft >= maxScroll - EDGE) {
    return 0;
  }
  if (direction === -1 && scrollLeft <= EDGE) {
    return maxScroll;
  }

  // Step from the card we are nearest to, so paging cannot drift out of
  // alignment after a trackpad drag has left us between two cards.
  let nearest = 0;
  for (let i = 1; i < offsets.length; i++) {
    if (
      Math.abs(offsets[i] - scrollLeft) <
      Math.abs(offsets[nearest] - scrollLeft)
    ) {
      nearest = i;
    }
  }

  const target = offsets[nearest + direction];
  if (target === undefined) {
    return direction === 1 ? maxScroll : 0;
  }
  return Math.max(0, Math.min(target, maxScroll));
}
