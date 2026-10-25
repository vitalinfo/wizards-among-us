import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
// The session is a database lookup; what is under test is what the page draws
// for each kind of visitor.
const session = vi.hoisted(() => ({ actor: null as unknown }));
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => session.actor,
}));
vi.mock("@/app/volunteer/actions", () => ({
  becomeVolunteerAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

import messages from "../../../../../../messages/uk.json";

import VolunteerCabinetPage from "../page";

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
  const ui = await VolunteerCabinetPage();
  return render(<>{ui}</>);
}

// «Кабінет Чарівника» is open to everyone signed in (Vital). Joining is what
// the button does for someone who has not; browsing still needs the role.
describe("the volunteer cabinet's front page", () => {
  it("offers someone who has not joined the opt-in, as a form", async () => {
    session.actor = user(["parent"]);
    await renderPage();

    const join = screen.getByRole("button", {
      name: messages.initiatives.volunteer,
    });
    const form = join.closest("form")!;
    expect(form).not.toBeNull();
    expect(
      form.querySelector<HTMLInputElement>('input[name="next"]')?.value,
    ).toBe("/account/volunteer/children");
    expect(
      screen.queryByRole("link", {
        name: new RegExp(messages.account.volunteer.cta),
      }),
    ).not.toBeInTheDocument();
  });

  it("sends a volunteer to the children", async () => {
    session.actor = user(["volunteer"]);
    await renderPage();

    expect(
      screen.getByRole("link", {
        name: new RegExp(messages.account.volunteer.cta),
      }),
    ).toHaveAttribute("href", "/account/volunteer/children");
    expect(
      screen.queryByRole("button", { name: messages.initiatives.volunteer }),
    ).not.toBeInTheDocument();
  });

  it("still sends a signed-out visitor to sign in", async () => {
    session.actor = null;
    await expect(renderPage()).rejects.toThrow(
      "redirect:/login?next=%2Faccount%2Fvolunteer",
    );
  });
});
