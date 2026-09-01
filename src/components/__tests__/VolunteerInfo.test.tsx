import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/uk.json";
import { VolunteerInfo } from "../VolunteerInfo";

// The CTA is injected by the page's server component (VolunteerCta), because
// which of sign-in / opt-in / browse to show depends on the session. This
// component only has to place it.
function renderVolunteerInfo(cta = <a href="/volunteer/children">browse</a>) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <VolunteerInfo cta={cta} />
    </NextIntlClientProvider>,
  );
}

describe("VolunteerInfo", () => {
  it("renders the heading and places the CTA it was given", () => {
    renderVolunteerInfo();
    expect(
      screen.getByRole("heading", { level: 1, name: messages.volunteer.title }),
    ).toBeInTheDocument();
    // Regression: this used to assert a <button> existed, which a button that
    // went nowhere satisfied perfectly — the same trap as the dead /parent CTAs.
    // Assert the destination instead.
    expect(screen.getByRole("link", { name: "browse" })).toHaveAttribute(
      "href",
      "/volunteer/children",
    );
  });

  it("shows the community rules", () => {
    renderVolunteerInfo();
    expect(
      screen.getByText(messages.volunteer.rulesCard.body),
    ).toBeInTheDocument();
  });
});
