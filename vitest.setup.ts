import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect } from "vitest";
import * as matchers from "vitest-axe/matchers";

// Accessibility assertions available everywhere: `expect(await axe(container))
// .toHaveNoViolations()`. The product is used on phones by stressed people and
// must work with a keyboard and a screen reader (plan §12) — a check that runs
// in CI is what stops that decaying between reviews.
expect.extend(matchers);

// A missing message must FAIL a test, not decorate its output.
//
// next-intl's default error handler logs and then renders the key path as the
// string, so `t("card.price")` with no such key renders
// «volunteer.children.card.price» and every assertion about other strings still
// passes. src/test/serverIntl.ts throws for server components; a CLIENT
// component gets its provider from each spec, and there are too many of those
// to thread a prop through — so the log is the seam. Narrow on purpose: only
// next-intl's own missing-message error, not console.error in general, which
// several specs trigger deliberately.
const consoleError = console.error;
let missingMessages: string[] = [];

beforeEach(() => {
  missingMessages = [];
  console.error = (...args: unknown[]) => {
    const text = args.map(String).join(" ");
    if (text.includes("MISSING_MESSAGE")) {
      missingMessages.push(text);
    }
    consoleError(...args);
  };
});

afterEach(() => {
  console.error = consoleError;
  cleanup();
  if (missingMessages.length > 0) {
    const seen = missingMessages;
    missingMessages = [];
    throw new Error(
      `messages/uk.json is missing a key this render asked for:\n${seen.join("\n")}`,
    );
  }
});
