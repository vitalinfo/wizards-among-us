// Where a row lands when an admin moves it.
//
// A pure function over the ordered ids so the interesting part — the ends, a
// stale id, a single-row list — is testable without a database. adminQueries
// reads the current order, calls this, and writes the result back as
// ordinal 0..n-1, which is also what repairs any gaps or duplicate ordinals a
// hand-edited row might have left behind.
export type MoveDirection = "up" | "down";

export function moveInOrder(
  ids: readonly string[],
  id: string,
  direction: MoveDirection,
): string[] {
  const from = ids.indexOf(id);
  // Not in the list (deleted under us), or already at the end it is moving
  // toward: nothing to do. Returning the input unchanged lets the caller skip
  // the write rather than needing a separate "can I move?" check.
  if (from === -1) {
    return [...ids];
  }
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) {
    return [...ids];
  }
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
