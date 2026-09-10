import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";
import { Breadcrumb } from "../Breadcrumb";

const ITEMS = [{ label: "Головна", href: "/" }, { label: "Контакти" }] as const;

describe("Breadcrumb", () => {
  it("links the earlier steps and marks the last as the current page", () => {
    render(<Breadcrumb items={ITEMS} label="Навігаційний ланцюжок" />);

    expect(screen.getByRole("link", { name: "Головна" })).toHaveAttribute(
      "href",
      "/",
    );
    // A link to where you already are is a dead control, so the last crumb
    // must NOT be one.
    expect(
      screen.queryByRole("link", { name: "Контакти" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Контакти")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("exposes the trail as a labelled navigation landmark", () => {
    render(<Breadcrumb items={ITEMS} label="Навігаційний ланцюжок" />);

    expect(
      screen.getByRole("navigation", { name: "Навігаційний ланцюжок" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Breadcrumb items={ITEMS} label="Навігаційний ланцюжок" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
