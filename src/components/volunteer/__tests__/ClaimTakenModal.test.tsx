import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";

import { ClaimTakenModal } from "../ClaimTakenModal";

const t = messages.volunteer.children.claimTaken;
const closeHref = "/account/volunteer/children?region=lviv#children";

describe("ClaimTakenModal", () => {
  it("tells the volunteer the child was taken, as a named dialog", async () => {
    const { container } = render(<>{await ClaimTakenModal({ closeHref })}</>);

    const dialog = screen.getByRole("dialog", { name: t.title });
    expect(dialog).toHaveAccessibleDescription(t.body);
    expect(await axe(container)).toHaveNoViolations();
  });

  // Links, not buttons with handlers: they close without JS, and keep the view
  // the volunteer was on.
  it("closes by × and by the button, back to the same view", async () => {
    render(<>{await ClaimTakenModal({ closeHref })}</>);

    expect(
      screen.getByRole("link", { name: messages.common.close }),
    ).toHaveAttribute("href", closeHref);
    expect(screen.getByRole("link", { name: t.back })).toHaveAttribute(
      "href",
      closeHref,
    );
  });
});
