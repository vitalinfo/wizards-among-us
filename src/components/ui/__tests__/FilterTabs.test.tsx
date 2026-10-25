import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { FilterTabs } from "../FilterTabs";

const tabs = [
  { key: "all", label: "Всі", href: "/list" },
  { key: "draft", label: "Чернетки", href: "/list?tab=draft" },
  { key: "submitted", label: "На перевірці (1)", href: "/list?tab=submitted" },
];

function renderTabs(current = "draft") {
  return render(
    <FilterTabs label="Фільтр заявок" tabs={tabs} current={current} />,
  );
}

// The tab strip renders twice — the pills from lg and the phone's dropdown —
// so each link appears once per markup.
describe("FilterTabs", () => {
  it("is a named nav of links, one per tab", () => {
    renderTabs();

    const nav = screen.getByRole("navigation", { name: "Фільтр заявок" });
    for (const tab of tabs) {
      for (const link of within(nav).getAllByRole("link", {
        name: tab.label,
      })) {
        expect(link).toHaveAttribute("href", tab.href);
      }
    }
  });

  // The filled pill is the visual cue; aria-current is the one a screen reader
  // gets, so it must be on the right tab and only that one.
  it("marks only the current tab", () => {
    renderTabs("submitted");

    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.length).toBeGreaterThan(0);
    for (const link of current) {
      expect(link).toHaveTextContent("На перевірці (1)");
    }
  });

  it("names the current tab on the phone's dropdown", () => {
    renderTabs("draft");
    // A <summary> has no ARIA role testing-library can query by, so this one
    // reaches for the element itself.

    const summary = screen.getByRole("navigation").querySelector("summary");
    expect(summary).toHaveTextContent("Чернетки");
  });

  // Choosing a tab keeps the page mounted (only the query string changes), so
  // the dropdown has to close itself or it stays open over the list.
  it("closes the phone's dropdown when a tab is chosen", async () => {
    renderTabs("draft");
    const details = screen.getByRole("navigation").querySelector("details")!;

    await userEvent.click(details.querySelector("summary")!);
    expect(details).toHaveAttribute("open");

    // jsdom cannot follow a link; cancel only the browser's default action,
    // after the component's own handler has seen the click.
    const stay = (event: Event) => event.preventDefault();
    document.addEventListener("click", stay);
    await userEvent.click(
      within(details).getByRole("link", { name: "На перевірці (1)" }),
    );
    document.removeEventListener("click", stay);

    expect(details).not.toHaveAttribute("open");
  });

  it("has no accessibility violations", async () => {
    const { container } = renderTabs();
    expect(await axe(container)).toHaveNoViolations();
  });
});
