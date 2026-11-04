import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import messages from "../../../../messages/uk.json";
import { LoginSafety } from "../LoginSafety";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

const copy = messages.login.safety;
const plain = (s: string) => s.replace(/<\/?b>/g, "");

async function renderSafety() {
  const ui = await LoginSafety({
    telegramHost: "oauth.telegram.org",
    siteHost: "wizards-among-us.pp.ua",
  });
  return render(<>{ui}</>);
}

describe("LoginSafety", () => {
  // Keyboard toggling is the native <summary>'s, which jsdom does not model;
  // it is checked in a real browser instead.
  it("is closed until opened", async () => {
    const user = userEvent.setup();
    await renderSafety();
    const heading = screen.getByRole("heading", { name: copy.stepsTitle });
    expect(heading).not.toBeVisible();

    await user.click(screen.getByText(copy.summary));
    expect(heading).toBeVisible();
  });

  it("names the exact hosts a person should see in the address bar", async () => {
    await renderSafety();
    const steps = screen.getAllByRole("listitem").slice(0, 3);
    expect(steps.map((li) => li.textContent)).toEqual([
      plain(copy.steps.open).replace("{telegramHost}", "oauth.telegram.org"),
      copy.steps.confirm,
      plain(copy.steps.return).replace("{siteHost}", "wizards-among-us.pp.ua"),
    ]);
  });

  it("lists what we never ask for, and calls a request for it fraud", async () => {
    await renderSafety();
    expect(
      screen.getByRole("heading", { name: copy.neverTitle }),
    ).toBeInTheDocument();
    for (const item of Object.values(copy.never)) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(screen.getByText(copy.warning)).toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    const { container } = await renderSafety();
    await user.click(screen.getByText(copy.summary));
    expect(await axe(container)).toHaveNoViolations();
  });
});
