import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Tooltip } from "../Tooltip";

// Whether the bubble is VISIBLE is CSS (hover, :focus-visible), which jsdom
// does not apply — the browser is where that is checked. What is testable
// here is what assistive tech gets and what Escape does.
function tooltip() {
  return (
    <Tooltip label="Редагувати">
      {/* A hash, so jsdom does not attempt a navigation it cannot do. */}
      <a href="#edit" aria-label="Редагувати заявку: Софійка">
        <svg aria-hidden="true" />
      </a>
    </Tooltip>
  );
}

describe("Tooltip", () => {
  it("leaves the control's own name alone and hides the bubble from assistive tech", () => {
    render(tooltip());

    expect(
      screen.getByRole("link", { name: "Редагувати заявку: Софійка" }),
    ).toBeInTheDocument();
    // Announced as well, a screen reader would read the action twice.
    expect(screen.getByText("Редагувати").closest("[aria-hidden]")).not.toBe(
      null,
    );
  });

  it("is dismissed with Escape and comes back when focus returns", async () => {
    const user = userEvent.setup();
    render(
      <>
        {tooltip()}
        <button type="button">Далі</button>
      </>,
    );

    await user.tab();
    expect(screen.getByRole("link")).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Редагувати")).toBeNull();

    await user.tab();
    await user.tab({ shift: true });
    expect(screen.getByText("Редагувати")).toBeInTheDocument();
  });

  it("is dismissed with Escape while only hovered, and comes back on the next hover", async () => {
    const user = userEvent.setup();
    render(tooltip());

    await user.hover(screen.getByRole("link"));
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Редагувати")).toBeNull();

    await user.unhover(screen.getByRole("link"));
    await user.hover(screen.getByRole("link"));
    expect(screen.getByText("Редагувати")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(tooltip());
    expect(await axe(container)).toHaveNoViolations();
  });
});
