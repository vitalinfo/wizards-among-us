// Option lists for the two application fields that are a bounded range rather
// than free text: the child's age and the year the family left home.
//
// The bounds live here, next to the options, because the <select> and the zod
// schema have to agree. If they drift, the form offers a value the server then
// rejects — which is the worst version of a validation error, since the parent
// did exactly what the control let them do.

export const CHILD_AGE_MIN = 0;

// 17, not 18: the initiative is for children, and an eighteen-year-old is not
// one. It also lets the volunteer age filter close its top band at 13–17
// instead of an open-ended 13+.
export const CHILD_AGE_MAX = 17;

// Russia's occupation of Crimea and the Donbas — the start of displacement in
// Ukraine, and the earliest year any family here left home.
export const DISPLACED_YEAR_MIN = 2014;

export function currentYear(): number {
  return new Date().getFullYear();
}

export function childAgeOptions(): { value: string; label: string }[] {
  return range(CHILD_AGE_MIN, CHILD_AGE_MAX);
}

// `until` is a parameter so a test can pin the range instead of depending on
// the wall clock.
export function displacedYearOptions(
  until: number = currentYear(),
): { value: string; label: string }[] {
  return range(DISPLACED_YEAR_MIN, Math.max(until, DISPLACED_YEAR_MIN));
}

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, index) => {
    const value = String(from + index);
    return { value, label: value };
  });
}
