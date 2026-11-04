import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
// The session and intake are database lookups; what is under test is where
// each kind of visitor is sent, and what the page offers someone it keeps.
const session = vi.hoisted(() => ({ actor: null as unknown }));
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => session.actor,
}));
const intake = vi.hoisted(() => ({ open: true }));
vi.mock("@/features/campaigns/queries", () => ({
  getActiveCampaignForIntake: async () =>
    intake.open
      ? { id: "c1", status: "active", acceptingApplications: true }
      : null,
}));
vi.mock("@/features/settings/queries", () => ({
  getResolvedSettings: async () => ({ applicationsEnabled: true }),
}));
vi.mock("@/app/volunteer/actions", () => ({
  becomeVolunteerAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

import messages from "../../../../../messages/uk.json";

import AccountPage from "../page";

function user(roles: ("parent" | "volunteer")[]) {
  return {
    kind: "user",
    id: "u1",
    username: "olena",
    firstName: "Олена",
    roles,
  };
}

async function renderPage() {
  const ui = await AccountPage();
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("/account", () => {
  it("sends a parent to the parent cabinet", async () => {
    session.actor = user(["parent"]);
    await expect(renderPage()).rejects.toThrow("redirect:/account/parent");
  });

  it("sends someone with both roles to the parent cabinet", async () => {
    session.actor = user(["volunteer", "parent"]);
    await expect(renderPage()).rejects.toThrow("redirect:/account/parent");
  });

  it("sends a volunteer to the volunteer cabinet", async () => {
    session.actor = user(["volunteer"]);
    await expect(renderPage()).rejects.toThrow("redirect:/account/volunteer");
  });

  it("sends a signed-out visitor to sign in", async () => {
    session.actor = null;
    await expect(renderPage()).rejects.toThrow(
      "redirect:/login?next=%2Faccount",
    );
  });

  // Not guessed for them: both cabinets' own actions, side by side.
  it("lets someone with no role choose between the two", async () => {
    session.actor = user([]);
    intake.open = true;
    const { container } = await renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "З чого почнемо?",
    );
    expect(
      screen.getByRole("link", { name: messages.account.parent.cta }),
    ).toHaveAttribute("href", "/account/parent/applications/new");

    const join = screen.getByRole("button", {
      name: messages.initiatives.volunteer,
    });
    expect(
      join
        .closest("form")
        ?.querySelector<HTMLInputElement>('input[name="next"]')?.value,
    ).toBe("/account/volunteer/children");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("says why there is no application button while intake is closed", async () => {
    session.actor = user([]);
    intake.open = false;
    await renderPage();

    expect(
      screen.queryByRole("link", { name: messages.account.parent.cta }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      messages.parent.applications.closed.title,
    );
    expect(
      screen.getByRole("button", { name: messages.initiatives.volunteer }),
    ).toBeInTheDocument();
  });
});
