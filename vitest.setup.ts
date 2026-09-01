import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";
import * as matchers from "vitest-axe/matchers";

// Accessibility assertions available everywhere: `expect(await axe(container))
// .toHaveNoViolations()`. The product is used on phones by stressed people and
// must work with a keyboard and a screen reader (plan §12) — a check that runs
// in CI is what stops that decaying between reviews.
expect.extend(matchers);

afterEach(() => {
  cleanup();
});
