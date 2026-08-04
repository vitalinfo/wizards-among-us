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
  it("renders the heading and the apply CTA", () => {
    renderParentInfo();
    expect(
      screen.getByRole("heading", { level: 1, name: messages.parent.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: messages.parent.applyCta }),
    ).toBeInTheDocument();
  });

  it("explains what the volunteer can see (privacy guardrail)", () => {
    renderParentInfo();
    expect(
      screen.getByText(messages.parent.privacyCard.body),
    ).toBeInTheDocument();
  });
});
