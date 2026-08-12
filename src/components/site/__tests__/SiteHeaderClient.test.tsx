import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { SiteHeaderClient } from "../SiteHeaderClient";

function renderHeader(
  user: { username: string | null; firstName: string | null } | null,
) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <SiteHeaderClient user={user} />
    </NextIntlClientProvider>,
  );
}

describe("SiteHeaderClient auth state", () => {
  it("shows a sign-in link to /login when signed out", () => {
    renderHeader(null);

    const link = screen.getByRole("link", { name: messages.common.login });
    expect(link).toHaveAttribute("href", "/login");
    expect(
      screen.queryByRole("button", { name: messages.common.signOut }),
    ).not.toBeInTheDocument();
  });

  it("shows the @username and a sign-out control when signed in", () => {
    renderHeader({ username: "petro", firstName: "Петро" });

    expect(screen.getByText("@petro")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: messages.common.signOut }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: messages.common.login }),
    ).not.toBeInTheDocument();
  });

  // A Telegram @username is optional, so this is a real signed-in user, not an
  // edge case — the header must still name them.
  it("falls back to the first name when the user has no username", () => {
    renderHeader({ username: null, firstName: "Оксана" });

    expect(screen.getByText("Оксана")).toBeInTheDocument();
    expect(screen.queryByText(messages.common.account)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: messages.common.signOut }),
    ).toBeInTheDocument();
  });

  it("falls back to the account label only when neither is known", () => {
    renderHeader({ username: null, firstName: null });

    expect(screen.getByText(messages.common.account)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: messages.common.signOut }),
    ).toBeInTheDocument();
  });
});
