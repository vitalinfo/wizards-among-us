import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
// The session is a database lookup; what is under test is who sees this page
// and what it tells them.
const session = vi.hoisted(() => ({ actor: null as unknown }));
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => session.actor,
}));
vi.mock("@/app/auth/actions", () => ({ logout: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

import messages from "../../../../../../messages/uk.json";

import BannedPage from "../page";

const t = messages.account.banned;

async function renderPage() {
  const ui = await BannedPage();
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("/account/banned", () => {
  it("tells a banned user why, and how to reach a coordinator", async () => {
    session.actor = { kind: "banned", id: "u1" };
    const { container } = await renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Ваш акаунт заблоковано" }),
    ).toBeInTheDocument();
    expect(screen.getByText(t.body)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.contact })).toHaveAttribute(
      "href",
      "/contacts",
    );
    // No shell here, so this is their only way to end the session.
    expect(
      screen.getByRole("button", { name: messages.common.signOut }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  // Unbanned since, or never banned: the account is theirs again.
  it("sends anyone who is not banned to their account", async () => {
    session.actor = {
      kind: "user",
      id: "u1",
      username: null,
      firstName: null,
      roles: [],
    };
    await expect(renderPage()).rejects.toThrow("redirect:/account");
  });
});
