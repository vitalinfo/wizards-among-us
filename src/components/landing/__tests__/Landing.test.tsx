import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../messages/uk.json";
import type { PublishedReview } from "@/features/reviews/queries";

import { Landing } from "../Landing";

const review: PublishedReview = {
  id: "r1",
  rating: 5,
  body: "Донька плакала від щастя.",
  authorFirstName: "Олена",
};

function renderLanding(
  activeCampaignTitle: string | null = null,
  reviews: PublishedReview[] = [review],
) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <Landing activeCampaignTitle={activeCampaignTitle} reviews={reviews} />
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

  it("shows published reviews, byline as a first name only", () => {
    renderLanding();
    expect(
      screen.getByRole("heading", { name: messages.landing.reviews.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(review.body!)).toBeInTheDocument();
    expect(screen.getByText("Олена")).toBeInTheDocument();
  });

  // The section used to render three hardcoded testimonials. On a public page
  // those read as real people vouching for the project, so with nothing
  // published the section must disappear rather than invent praise.
  it("hides the reviews section entirely when nothing is published", () => {
    renderLanding(null, []);
    expect(
      screen.queryByRole("heading", { name: messages.landing.reviews.title }),
    ).not.toBeInTheDocument();
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
