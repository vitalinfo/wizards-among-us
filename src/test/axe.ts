import { act } from "@testing-library/react";
import { axe as runAxe } from "vitest-axe";

// Shared axe runner for component specs.
//
// Two rules are off, for different reasons — both worth knowing:
//
//   region        — requires all content to sit inside a landmark, which is a
//                   PAGE-level property. Specs render a fragment with no <main>
//                   around it, so it fires on markup that is correct in the app.
//
//   color-contrast— CANNOT RUN in jsdom: axe measures rendered pixels through a
//                   canvas, and jsdom has no canvas. Left enabled it throws a
//                   stack trace per check and reports nothing, which is worse
//                   than absent — a green test that verifies no contrast at all.
//                   Contrast is covered properly by contrast.test.ts, which
//                   computes WCAG ratios from the tokens in globals.css.
//
// Every other default rule stays on.
export async function axe(container: Element) {
  // The whole walk runs INSIDE act. next/link schedules a state update after
  // render (its prefetch observer), and axe's traversal is async and slow
  // enough that the update lands mid-walk — outside act, React warns. Flushing
  // beforehand is not enough; the update has not been scheduled yet at that
  // point. Noisy test output is how real warnings get missed, so this matters
  // beyond tidiness.
  let results!: Awaited<ReturnType<typeof runAxe>>;
  await act(async () => {
    results = await runAxe(container, {
      rules: {
        region: { enabled: false },
        "color-contrast": { enabled: false },
      },
    });
  });
  return results;
}
