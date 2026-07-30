import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/uk.json";
import { Landing } from "../landing";

function renderLanding() {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <Landing />
    </NextIntlClientProvider>,
  );
}

describe("Landing", () => {
  it("renders the Ukrainian hero heading", () => {
    renderLanding();
    expect(
      screen.getByRole("heading", { level: 1, name: messages.landing.title }),
    ).toBeInTheDocument();
  });

  it("shows both role entry points linking to the right routes", () => {
    renderLanding();
    expect(
      screen.getByRole("link", { name: messages.landing.parentCta }),
    ).toHaveAttribute("href", "/parent");
    expect(
      screen.getByRole("link", { name: messages.landing.volunteerCta }),
    ).toHaveAttribute("href", "/volunteer");
  });

  it("lists all three how-it-works steps", () => {
    renderLanding();
    expect(
      screen.getByRole("heading", {
        name: messages.landing.steps.submit.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: messages.landing.steps.match.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: messages.landing.steps.deliver.title,
      }),
    ).toBeInTheDocument();
  });
});
