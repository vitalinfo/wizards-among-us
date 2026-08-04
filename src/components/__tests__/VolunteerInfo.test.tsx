import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/uk.json";
import { VolunteerInfo } from "../VolunteerInfo";

function renderVolunteerInfo() {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <VolunteerInfo />
    </NextIntlClientProvider>,
  );
}

describe("VolunteerInfo", () => {
  it("renders the heading and the browse CTA", () => {
    renderVolunteerInfo();
    expect(
      screen.getByRole("heading", { level: 1, name: messages.volunteer.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: messages.volunteer.browseCta }),
    ).toBeInTheDocument();
  });

  it("shows the community rules", () => {
    renderVolunteerInfo();
    expect(
      screen.getByText(messages.volunteer.rulesCard.body),
    ).toBeInTheDocument();
  });
});
