import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/auth/actions", () => ({ logout: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/account/parent" }));

import messages from "../../../../messages/uk.json";
import { AccountShell } from "../AccountShell";

function renderShell() {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <AccountShell
        identity={null}
        cabinets={[
          {
            key: "parent",
            href: "/account/parent",
            emoji: "👫",
            available: true,
            links: [],
          },
        ]}
      >
        <h1>Кабінет</h1>
      </AccountShell>
    </NextIntlClientProvider>,
  );
}

// Sign-out lives in two places because the round header button is a different
// control at each width: sign-out on desktop, the menu toggle on a phone.
describe("AccountShell sign-out", () => {
  it("is the round header button on desktop", () => {
    renderShell();

    const round = screen.getByRole("button", {
      name: messages.common.signOut,
    });
    expect(round).toHaveAttribute("type", "submit");
    expect(round.closest("form")).not.toBeNull();
  });

  // Figma 136:3530: the phone menu ends with a «Вихід» row, named by its own
  // visible text rather than by an aria-label.
  it("is the «Вихід» row at the foot of the phone menu", () => {
    renderShell();

    const row = screen.getByRole("button", {
      name: messages.account.nav.signOut,
      hidden: true,
    });
    expect(row).toHaveAttribute("type", "submit");
    expect(row).not.toHaveAttribute("aria-label");
    expect(row.closest("form")).not.toBeNull();
  });
});
