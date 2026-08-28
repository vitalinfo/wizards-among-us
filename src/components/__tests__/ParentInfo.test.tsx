import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/uk.json";
import { ParentInfo } from "../ParentInfo";

function renderParentInfo() {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <ParentInfo />
    </NextIntlClientProvider>,
  );
}

describe("ParentInfo", () => {
  it("renders the heading", () => {
    renderParentInfo();
    expect(
      screen.getByRole("heading", { level: 1, name: messages.parent.title }),
    ).toBeInTheDocument();
  });

  // Regression: both CTAs were plain <button>s with no handler, so clicking
  // them did nothing — and this suite passed, because it only asserted the
  // button EXISTED. Assert the destination, not the presence.
  it("points both CTAs at the applications page", () => {
    renderParentInfo();
    expect(
      screen.getByRole("link", { name: messages.parent.applyCta }),
    ).toHaveAttribute("href", "/parent/applications");
    expect(
      screen.getByRole("link", { name: messages.parent.myApplicationsCta }),
    ).toHaveAttribute("href", "/parent/applications");
  });

  it("leaves no dead buttons on the page", () => {
    renderParentInfo();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("explains what the volunteer can see (privacy guardrail)", () => {
    renderParentInfo();
    expect(
      screen.getByText(messages.parent.privacyCard.body),
    ).toBeInTheDocument();
  });
});
