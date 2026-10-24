import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

let pathname = "/account/parent";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { AccountMenu } from "../AccountMenu";

function menu() {
  return (
    <AccountMenu>
      <summary>Меню</summary>
      {/* A hash, so jsdom does not attempt a navigation it cannot do; the
          component only cares that it is a link. */}
      <a href="#applications">Мої заявки</a>
      <span>Мій профіль</span>
    </AccountMenu>
  );
}

const details = () => screen.getByText("Меню").closest("details")!;

describe("AccountMenu", () => {
  it("opens from its summary", async () => {
    render(menu());
    await userEvent.click(screen.getByText("Меню"));
    expect(details()).toHaveAttribute("open");
  });

  // The account layout persists between its pages, so without this the panel
  // stays over the page the person just picked.
  it("closes when a link in it is tapped", async () => {
    render(menu());
    await userEvent.click(screen.getByText("Меню"));

    await userEvent.click(screen.getByRole("link", { name: "Мої заявки" }));

    expect(details()).not.toHaveAttribute("open");
  });

  it("stays open for a tap that is not a link", async () => {
    render(menu());
    await userEvent.click(screen.getByText("Меню"));

    await userEvent.click(screen.getByText("Мій профіль"));

    expect(details()).toHaveAttribute("open");
  });

  // «Подати заявку» is a form that lands on the new draft by redirect — no
  // link is tapped, only the path changes.
  it("closes when the path changes", async () => {
    const { rerender } = render(menu());
    await userEvent.click(screen.getByText("Меню"));

    pathname = "/account/parent/applications/abc";
    rerender(menu());

    expect(details()).not.toHaveAttribute("open");
    pathname = "/account/parent";
  });
});
