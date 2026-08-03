import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/uk.json";
import { Landing } from "../landing";

function renderLanding(activeCampaignTitle: string | null = null) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <Landing activeCampaignTitle={activeCampaignTitle} />
    </NextIntlClientProvider>,
  );
}

describe("Landing", () => {
  it("renders the hero heading", () => {
    renderLanding();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: messages.landing.hero.title,
      }),
    ).toBeInTheDocument();
  });

  it("routes the two hero CTAs to the parent and volunteer pages", () => {
    renderLanding();
    expect(
      screen.getByRole("link", { name: messages.landing.hero.parentCta }),
    ).toHaveAttribute("href", "/parent");
    expect(
      screen.getByRole("link", { name: messages.landing.hero.volunteerCta }),
    ).toHaveAttribute("href", "/volunteer");
  });

  it("lists all four how-it-works steps", () => {
    renderLanding();
    for (const step of ["tell", "verify", "choose", "done"] as const) {
      expect(
        screen.getByRole("heading", {
          name: messages.landing.how.steps[step].title,
        }),
      ).toBeInTheDocument();
    }
  });

  it("shows the testimonials section", () => {
    renderLanding();
    expect(
      screen.getByRole("heading", { name: messages.landing.reviews.title }),
    ).toBeInTheDocument();
  });

  it("shows the campaign badge only when a campaign is active", () => {
    renderLanding("Новий навчальний рік 2026");
    expect(
      screen.getByText("Триває кампанія «Новий навчальний рік 2026»"),
    ).toBeInTheDocument();
  });

  it("hides the campaign badge when no campaign is active", () => {
    renderLanding(null);
    expect(screen.queryByText(/Триває кампанія/)).not.toBeInTheDocument();
  });
});
