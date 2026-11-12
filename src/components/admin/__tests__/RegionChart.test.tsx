import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import messages from "../../../../messages/uk.json";
import { RegionChart } from "../RegionChart";

const t = messages.admin.campaigns.analytics;
const labels = { title: t.regionsTitle, description: t.regionsDescription };

describe("RegionChart", () => {
  it("names each region with its count in text, in the order given", async () => {
    const { container } = render(
      <RegionChart
        bars={[
          { region: "donetsk", label: messages.regions.donetsk, count: 4 },
          { region: "kharkiv", label: messages.regions.kharkiv, count: 1 },
          { region: "crimea", label: messages.regions.crimea, count: 0 },
        ]}
        labels={labels}
      />,
    );

    const figure = screen.getByRole("figure", {
      name: t.regionsTitle,
    });
    expect(within(figure).getByText(t.regionsDescription)).toBeInTheDocument();
    expect(
      within(figure)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      `${messages.regions.donetsk}4`,
      `${messages.regions.kharkiv}1`,
      `${messages.regions.crimea}0`,
    ]);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("draws a chart of zeros without dividing by zero", async () => {
    const { container } = render(
      <RegionChart
        bars={[
          { region: "donetsk", label: messages.regions.donetsk, count: 0 },
        ]}
        labels={labels}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(
      `${messages.regions.donetsk}0`,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
