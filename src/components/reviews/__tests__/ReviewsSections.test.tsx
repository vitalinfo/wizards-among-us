import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";

import { ReviewsClosing } from "../ReviewsClosing";
import { ReviewsHero } from "../ReviewsHero";

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ReviewsHero", () => {
  it("names the page and sends a would-be volunteer to «Волонтерам»", async () => {
    const { container } = wrap(<ReviewsHero />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Тепло, яким діляться" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: messages.reviews.hero.cta }),
    ).toHaveAttribute("href", "/volunteer");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("ReviewsClosing", () => {
  // No action for now (Vital, 2026-11-27): the design's «Поділитися історією»
  // is left out until there is somewhere for it to go.
  it("closes the page with the invitation and no button", async () => {
    const { container } = wrap(<ReviewsClosing />);

    expect(
      screen.getByText(/Маєте свою історію з Чарівниками поруч\?/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
