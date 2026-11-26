import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import type { PublicReview } from "@/features/reviews/mappers";
import { axe } from "@/test/axe";

import { ReviewList } from "../ReviewList";

function review(overrides: Partial<PublicReview> = {}): PublicReview {
  return {
    id: "0c9e5c55-6a3f-4a86-9a0e-4f1d2f6b7a10",
    rating: 5,
    body: "Дякуємо Чарівнику!",
    authorFirstName: "Олена",
    createdAt: new Date("2026-11-19T10:00:00Z"),
    photoVersion: null,
    ...overrides,
  };
}

function renderList(reviews: PublicReview[]) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <ReviewList reviews={reviews} />
    </NextIntlClientProvider>,
  );
}

describe("ReviewList", () => {
  it("says so when nothing is published yet", () => {
    renderList([]);
    expect(screen.getByText(messages.reviews.list.empty)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows the author, the text, the rating and the date", () => {
    renderList([review({ rating: 4 })]);

    const item = screen.getByRole("listitem");
    expect(
      within(item).getByRole("heading", { name: "Олена" }),
    ).toBeInTheDocument();
    expect(within(item).getByText("Дякуємо Чарівнику!")).toBeInTheDocument();
    expect(
      within(item).getByRole("img", { name: "Оцінка: 4 з 5" }),
    ).toBeInTheDocument();
    expect(within(item).getByText("19.11.2026")).toBeInTheDocument();
  });

  // Text only: the family did not consent to the photo being published.
  it("shows no photo for a review without one", () => {
    renderList([review()]);
    expect(
      screen.queryByRole("img", { name: messages.reviews.list.photoAlt }),
    ).not.toBeInTheDocument();
  });

  it("shows the consented photo from the public review route", () => {
    renderList([review({ photoVersion: 7 })]);
    expect(
      screen.getByRole("img", { name: messages.reviews.list.photoAlt }),
    ).toHaveAttribute(
      "src",
      "/reviews/0c9e5c55-6a3f-4a86-9a0e-4f1d2f6b7a10/photo?v=7",
    );
  });

  it("names an author with no first name as anonymous", () => {
    renderList([review({ authorFirstName: null })]);
    expect(
      screen.getByRole("heading", { name: messages.reviews.list.anonymous }),
    ).toBeInTheDocument();
  });

  it("lists many in the order given, with no axe violations", async () => {
    const { container } = renderList([
      review({ id: "a", authorFirstName: "Олена", photoVersion: 1 }),
      review({ id: "b", authorFirstName: "Ірина" }),
      review({ id: "c", authorFirstName: "Марія", photoVersion: 2 }),
    ]);

    expect(
      screen.getByRole("list", { name: messages.reviews.list.label }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual([
      "Олена",
      "Ірина",
      "Марія",
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });
});
