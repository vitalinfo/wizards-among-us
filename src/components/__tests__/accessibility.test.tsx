import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import messages from "../../../messages/uk.json";
import { formats, locale, timeZone } from "@/i18n/request";
import { axe } from "@/test/axe";

// Automated accessibility smoke checks.
//
// These do NOT replace the rules in .claude/rules/accessibility.md — axe cannot
// tell whether a label makes sense or whether focus lands somewhere useful. What
// it does catch is the decay: an input that loses its label, a control whose
// contrast slips, an aria-* attribute that stops matching its element. Those are
// the regressions that arrive silently in a diff nobody reads twice.
//
// The product is used on phones by stressed people and must work with a keyboard
// and a screen reader (plan §12), so this runs in CI.

vi.mock("@/app/parent/applications/actions", () => ({
  startApplication: vi.fn(),
  confirmReceiptAction: vi.fn(),
}));
vi.mock("@/app/parent/review/actions", () => ({
  submitReviewAction: vi.fn(async () => ({ status: "idle" })),
}));
vi.mock("@/app/auth/actions", () => ({ logout: vi.fn() }));

const { ReviewForm } = await import("@/components/parent/ReviewForm");
const { MyApplicationsList } =
  await import("@/components/parent/MyApplicationsList");
const { SiteHeaderClient } = await import("@/components/site/SiteHeaderClient");
const { ApplicationStatusBadge } =
  await import("@/components/ui/ApplicationStatusBadge");

// The REAL provider config, not a partial one. Without `formats` and
// `timeZone`, next-intl throws MISSING_FORMAT on `format.dateTime(d, "short")`
// and falls back to Date.toString() — the exact bug we hit in Phase 4. A test
// that renders dates differently from production is testing something else.
function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      formats={formats}
      timeZone={timeZone}
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("accessibility smoke checks", () => {
  it("the review form has no violations", async () => {
    const { container } = renderWithIntl(<ReviewForm applicationId="a1" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("the applications list has no violations", async () => {
    const { container } = renderWithIntl(
      <MyApplicationsList
        applications={[
          {
            id: "a1",
            childName: "Софійка",
            childAge: 7,
            giftDescription: "Лялька",
            status: "claimed",
            submittedAt: new Date("2026-08-25T10:00:00Z"),
            updatedAt: new Date("2026-08-25T10:00:00Z"),
          },
        ]}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("the header has no violations, signed in and out", async () => {
    const out = renderWithIntl(<SiteHeaderClient user={null} />);
    expect(await axe(out.container)).toHaveNoViolations();
    out.unmount();

    const inn = renderWithIntl(
      <SiteHeaderClient user={{ username: "petro", firstName: "Петро" }} />,
    );
    expect(await axe(inn.container)).toHaveNoViolations();
  });

  // Contrast is NOT checked here — axe cannot measure it in jsdom (see
  // src/test/axe.ts). See contrast.test.ts for the real check. This asserts the
  // badges are otherwise sound markup.
  it("every status badge is sound markup", async () => {
    for (const status of [
      "draft",
      "submitted",
      "approved",
      "rejected",
      "claimed",
      "fulfilled",
    ] as const) {
      const { container, unmount } = renderWithIntl(
        <ApplicationStatusBadge status={status} />,
      );
      expect(await axe(container)).toHaveNoViolations();
      unmount();
    }
  });
});
