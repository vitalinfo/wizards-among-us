import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { FormStepper } from "../FormStepper";

const steps = ["Особиста інформація", "Історія", "Мрія", "Доставка", "Згода"];

describe("FormStepper", () => {
  // Every step is named in the list at every width; the filled circle is the
  // visual cue, aria-current the one a screen reader gets.
  it("lists every step and marks only the current one", () => {
    render(<FormStepper label="Кроки анкети" steps={steps} current={2} />);

    const list = screen.getByRole("navigation", { name: "Кроки анкети" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items.map((item) => item.getAttribute("aria-current"))).toEqual([
      null,
      null,
      "step",
      null,
      null,
    ]);
    expect(items[2]).toHaveTextContent("Мрія");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <FormStepper label="Кроки анкети" steps={steps} current={0} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
