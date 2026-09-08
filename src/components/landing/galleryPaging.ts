// Where the gallery should scroll to when an arrow is pressed.
//
// Pure, and separate from the component, because the interesting part is the
// arithmetic — the wrap at either end, and the fact that the last page is
// usually a PARTIAL step (the row is 2068 wide in a 1720 box, so the final
// position is "as far as it goes", not "card index 3"). jsdom reports every
// width as 0, so this could not be tested through the DOM.
export function nextScrollLeft({
  scrollLeft,
  maxScroll,
  step,
  direction,
}: {
  // Current horizontal scroll offset of the row.
  scrollLeft: number;
  // The largest offset it can reach (scrollWidth − clientWidth).
  maxScroll: number;
  // One card plus one gap.
  step: number;
  direction: 1 | -1;
}): number {
  if (step <= 0 || maxScroll <= 0) {
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

  // Snap to a card boundary rather than adding a delta to wherever a trackpad
  // left us, so paging cannot drift out of alignment over time.
  const index = Math.round(scrollLeft / step);
  const target = (index + direction) * step;
  return Math.max(0, Math.min(target, maxScroll));
}
