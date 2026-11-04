import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import messages from "../../../../messages/uk.json";
import { TelegramLoginButton } from "../TelegramLoginButton";

function renderButton(href: string | null) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <TelegramLoginButton href={href} />
    </NextIntlClientProvider>,
  );
}

describe("TelegramLoginButton", () => {
  it("links to the Telegram login route", async () => {
    const href = "/auth/telegram/start?next=%2Faccount";
    const { container } = renderButton(href);
    expect(
      screen.getByRole("link", {
        name: messages.login.cta.replace(/<\/?b>/g, ""),
      }),
    ).toHaveAttribute("href", href);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders nothing when Telegram login is not configured", () => {
    renderButton(null);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
