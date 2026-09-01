/// <reference types="vitest/globals" />

import type { AxeMatchers } from "vitest-axe/matchers";

// vitest-axe ships an augmentation of the legacy global `Vi` namespace, which
// Vitest 3 no longer reads — so `toHaveNoViolations()` is registered at runtime
// (vitest.setup.ts) but invisible to TypeScript. This augments the modern
// module interface instead. AxeMatchers is not generic; the type parameter on
// Assertion is declared only to match Vitest's own signature.
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type -- augmenting Vitest's Assertion with axe's matcher
  interface Assertion<T = unknown> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- ditto for the asymmetric form
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
