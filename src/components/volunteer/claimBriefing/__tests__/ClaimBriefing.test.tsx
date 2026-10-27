import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../../messages/uk.json";
import { locale } from "@/i18n/config";
import { axe } from "@/test/axe";

import { ClaimBriefing } from "../ClaimBriefing";
import { briefingForCampaignType } from "../briefings";

// The chrome's own copy, and the campaign's.
const tChrome = messages.volunteer.claim;
const t = messages.volunteer.claim.briefings.saint_nicholas_day;

async function renderBriefing(
  overrides: Partial<Parameters<typeof ClaimBriefing>[0]> = {},
) {
  const ui = await ClaimBriefing({
    backHref: "/account/volunteer/children",
    campaignType: "saint_nicholas_day",
    giftPriceCap: "699.00",
    deadline: "5 грудня",
    action: async () => {},
    ...overrides,
  });
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("briefingForCampaignType", () => {
  it("has a briefing for the campaign we run", () => {
    expect(briefingForCampaignType("saint_nicholas_day")).not.toBeNull();
  });

  // The whole point of the lookup. A type without a briefing must come back
  // empty rather than falling through to «Святий Миколай» — the parent form
  // refuses the same way, and the claim path used not to.
  it("refuses a type it has no briefing for, and a missing campaign", () => {
    expect(briefingForCampaignType("new_school_year")).toBeNull();
    expect(briefingForCampaignType(null)).toBeNull();
    expect(briefingForCampaignType(undefined)).toBeNull();
  });
});

describe("ClaimBriefing", () => {
  it("prints the campaign's cap and deadline rather than a date in the copy", async () => {
    await renderBriefing();

    expect(screen.getByText(/699 грн/)).toBeInTheDocument();
    expect(screen.getByText(t.deadline.label)).toBeInTheDocument();
    expect(screen.getByText(/5 грудня/)).toBeInTheDocument();
  });

  // The whole deadline block goes when the campaign has no end date — there is
  // no «не пізніше —» to render, and a briefing that promises a blank date is
  // worse than one that does not mention it.
  it("drops the deadline block when the campaign has no end date", async () => {
    await renderBriefing({ deadline: null });

    expect(screen.queryByText(t.deadline.label)).not.toBeInTheDocument();
  });

  it("falls back to the capless gift copy when the campaign sets no cap", async () => {
    await renderBriefing({ giftPriceCap: null });

    expect(screen.getByText(t.gift.bodyNoCap)).toBeInTheDocument();
  });

  // Figma 118:1806 sets the deadline label apart in the one red of the system,
  // and the headings it carries at 800 rather than the 600 the rest of the page
  // uses. Both are what tells a volunteer which lines are the rules.
  it("draws the deadline label in the danger colour and the headings extrabold", async () => {
    await renderBriefing();

    expect(screen.getByText(t.deadline.label)).toHaveClass(
      "text-danger",
      "font-extrabold",
    );
    expect(screen.getByText(t.letter.title)).toHaveClass("font-extrabold");
    expect(screen.getByText(t.delivery.title)).toHaveClass("font-extrabold");
  });

  it("offers the action as a form, and explains instead when there is none", async () => {
    const { unmount } = await renderBriefing();
    expect(
      screen.getByRole("button", { name: tChrome.cta }),
    ).toBeInTheDocument();
    unmount();

    await renderBriefing({ action: null });
    expect(
      screen.queryByRole("button", { name: tChrome.cta }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(tChrome.blocked.notAvailable)).toBeInTheDocument();
  });

  // A back-to-school campaign must not be handed the St Nicholas briefing: no
  // letter to Миколай, no gift under the pillow, and no button — a volunteer
  // cannot agree to terms they were never shown.
  it("shows no briefing and no claim button for a type it has none for", async () => {
    await renderBriefing({ campaignType: "new_school_year" });

    expect(screen.getByText(tChrome.blocked.noBriefing)).toBeInTheDocument();
    expect(screen.queryByText(t.letter.title)).not.toBeInTheDocument();
    expect(screen.queryByText(t.remember)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: tChrome.cta }),
    ).not.toBeInTheDocument();
  });

  it("treats a missing campaign the same way", async () => {
    await renderBriefing({ campaignType: null });

    expect(screen.getByText(tChrome.blocked.noBriefing)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: tChrome.cta }),
    ).not.toBeInTheDocument();
  });

  // «×» is a link back to wherever the volunteer came from, and the only thing
  // naming it is its label — the icon inside is decorative. It survives the
  // no-briefing state, which is the one case where it is the only way out.
  it("names the close link and points it at the return path", async () => {
    await renderBriefing({
      backHref: "/account/volunteer/claims",
      campaignType: "new_school_year",
    });

    expect(screen.getByRole("link", { name: tChrome.close })).toHaveAttribute(
      "href",
      "/account/volunteer/claims",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderBriefing();
    expect(await axe(container)).toHaveNoViolations();
  });
});
