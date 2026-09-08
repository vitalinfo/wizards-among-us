import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/uk.json";
import { GlobalErrorContent } from "../GlobalErrorContent";

// The root-layout boundary reads the same uk.json as the rest of the app, so
// copy can't drift between "the site broke" and "this page broke".
describe("GlobalErrorContent", () => {
  function renderContent(reset = vi.fn()) {
    render(
      <NextIntlClientProvider locale="uk" messages={messages}>
        <GlobalErrorContent reset={reset} />
      </NextIntlClientProvider>,
    );
    return reset;
  }

  it("renders the shared Ukrainian error copy from the locale file", () => {
    renderContent();

    expect(
      screen.getByRole("heading", { name: messages.errors.generic.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.errors.generic.body)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: messages.errors.generic.home }),
    ).toHaveAttribute("href", "/");
  });

  // The root-layout boundary is a 500, and shares its artwork with the 404 —
  // the only difference is the number on the blob.
  it("shows the 500 artwork rather than the 404 one", () => {
    const { container } = render(
      <NextIntlClientProvider locale="uk" messages={messages}>
        <GlobalErrorContent reset={vi.fn()} />
      </NextIntlClientProvider>,
    );
    const art = container.querySelector('main [aria-hidden="true"]');
    expect(art).toHaveTextContent("500");
    expect(art).not.toHaveTextContent("404");
  });

  it("calls reset when retry is pressed", async () => {
    const user = userEvent.setup();
    const reset = renderContent();

    await user.click(
      screen.getByRole("button", { name: messages.errors.generic.retry }),
    );
    expect(reset).toHaveBeenCalledOnce();
  });
});
