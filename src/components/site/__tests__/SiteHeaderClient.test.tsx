import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { SiteHeaderClient } from "../SiteHeaderClient";

function renderHeader(user: { username: string | null } | null) {
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
    renderHeader({ username: "petro" });

    expect(screen.getByText("@petro")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: messages.common.signOut }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: messages.common.login }),
    ).not.toBeInTheDocument();
  });

  it("falls back to the account label when the user has no username", () => {
    renderHeader({ username: null });

    expect(screen.getByText(messages.common.account)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: messages.common.signOut }),
    ).toBeInTheDocument();
  });
});
