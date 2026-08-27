import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/uk.json";
// Imported under a different name on purpose: `Error` would shadow the global
// Error constructor in this file, so `new Error(...)` would build the component.
import ErrorBoundary from "../error";

function renderError(error: Error & { digest?: string }, reset = vi.fn()) {
  render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <ErrorBoundary error={error} reset={reset} />
    </NextIntlClientProvider>,
  );
  return reset;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("app error boundary", () => {
  it("shows the Ukrainian error copy and both actions", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderError(new Error("boom"));

    expect(
      screen.getByRole("heading", { name: messages.errors.generic.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: messages.errors.generic.retry }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: messages.errors.generic.home }),
    ).toHaveAttribute("href", "/");
  });

  // A server-side failure can carry a DB error or personal data, and this app
  // handles children's data — the raw message must never reach the page.
  it("never renders the underlying error message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const secret = "column parents.delivery_information does not exist";
    renderError(new Error(secret));

    expect(screen.queryByText(secret)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(secret);
  });

  it("calls reset when the retry button is pressed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    const reset = renderError(new Error("boom"));

    await user.click(
      screen.getByRole("button", { name: messages.errors.generic.retry }),
    );
    expect(reset).toHaveBeenCalledOnce();
  });

  it("logs the digest rather than the message when one is present", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("raw detail"), { digest: "abc123" });
    renderError(error);

    expect(logged).toHaveBeenCalledWith("Unhandled error", "abc123");
  });
});
