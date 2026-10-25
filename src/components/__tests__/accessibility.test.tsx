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

vi.mock("@/app/account/(shell)/parent/applications/actions", () => ({
  startApplication: vi.fn(),
  confirmReceiptAction: vi.fn(),
}));
vi.mock("@/app/account/(shell)/parent/review/actions", () => ({
  submitReviewAction: vi.fn(async () => ({ status: "idle" })),
}));
vi.mock("@/app/auth/actions", () => ({ logout: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/account/volunteer" }));

const { ReviewForm } = await import("@/components/parent/ReviewForm");
const { SiteHeaderClient } = await import("@/components/site/SiteHeaderClient");
const { AccountShell } = await import("@/components/account");
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
    const { container } = renderWithIntl(
      <ReviewForm applicationId="a1" view={{ tab: "all", page: 1, per: 10 }} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  // The applications list is swept in its own spec
  // (components/parent/__tests__/ApplicationsTable.test.tsx): it is a server
  // component now, and renders through the server-intl shim.

  it("the header has no violations, signed in and out", async () => {
    const out = renderWithIntl(<SiteHeaderClient account={null} />);
    expect(await axe(out.container)).toHaveNoViolations();
    out.unmount();

    // The signed-in header is the same round button with a different name and
    // destination, and the name is all a screen-reader user gets — so it is
    // worth sweeping both states rather than assuming one covers the other.
    const inn = renderWithIntl(
      <SiteHeaderClient account={{ href: "/account", labelKey: "account" }} />,
    );
    expect(await axe(inn.container)).toHaveNoViolations();
  });

  // The account chrome renders its navigation AND its sign-out twice — once
  // for the sidebar, once for the phone panel — because a <details> panel
  // cannot move the sidebar's markup, only hide one copy of it. Exactly one of
  // each is exposed at a time, but the duplication is the kind axe is good at
  // catching if it ever stops being hidden: duplicate landmarks, repeated ids,
  // two controls with one name.
  it("the account shell has no violations", async () => {
    const { container } = renderWithIntl(
      <AccountShell
        identity="@olena"
        cabinets={[
          {
            key: "volunteer",
            href: "/account/volunteer",
            emoji: "🧙",
            available: true,
            links: [
              {
                key: "children",
                href: "/account/volunteer/children",
                labelKey: "volunteer.links.children",
                emoji: "🔍",
              },
            ],
          },
          {
            key: "parent",
            href: "/account/parent",
            emoji: "👫",
            available: false,
            links: [],
          },
        ]}
      >
        <h1>Кабінет</h1>
      </AccountShell>,
    );
    expect(await axe(container)).toHaveNoViolations();
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
