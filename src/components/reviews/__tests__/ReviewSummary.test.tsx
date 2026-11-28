import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { locale, timeZone } from "@/i18n/config";
import { axe } from "@/test/axe";

import { ReviewSummary } from "../ReviewSummary";

const rating = (n: number) =>
  messages.reviews.list.rating.replace("{rating}", String(n));

function renderSummary(review: Parameters<typeof ReviewSummary>[0]["review"]) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      timeZone={timeZone}
      messages={messages}
    >
      <ReviewSummary review={review} />
    </NextIntlClientProvider>,
  );
}

describe("ReviewSummary", () => {
  it("shows the text, the rating and the date", async () => {
    const { container } = renderSummary({
      rating: 4,
      body: "Дякуємо!\nДитина в захваті.",
      createdAt: new Date("2026-11-20T10:00:00Z"),
    });

    // By role, so the rating-alone case below can assert its absence.
    expect(screen.getByRole("paragraph")).toHaveTextContent(
      "Дякуємо! Дитина в захваті.",
    );
    // One image to assistive tech, not five unlabelled stars.
    expect(screen.getByRole("img", { name: rating(4) })).toBeInTheDocument();
    expect(screen.getByText("20.11.2026")).toHaveAttribute(
      "datetime",
      "2026-11-20T10:00:00.000Z",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows a review that is a rating alone", () => {
    renderSummary({
      rating: 5,
      body: null,
      createdAt: new Date("2026-11-20T10:00:00Z"),
    });

    expect(screen.getByRole("img", { name: rating(5) })).toBeInTheDocument();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });
});
