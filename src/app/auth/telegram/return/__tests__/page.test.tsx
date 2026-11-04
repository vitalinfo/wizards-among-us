import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import messages from "../../../../../../messages/uk.json";
import TelegramReturnPage from "../page";

describe("TelegramReturnPage", () => {
  it("tells the person they are being signed in", async () => {
    const { container } = render(
      <NextIntlClientProvider locale="uk" messages={messages}>
        <TelegramReturnPage />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: messages.login.returning }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      messages.login.returning,
    );
    // No way to start the login over from here.
    expect(screen.queryByRole("link")).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
});
