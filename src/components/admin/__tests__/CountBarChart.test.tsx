import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import messages from "../../../../messages/uk.json";
import { CountBarChart } from "../CountBarChart";

const t = messages.admin.campaigns.analytics;
const labels = { title: t.regionsTitle, description: t.regionsDescription };

describe("CountBarChart", () => {
  it("names each bar with its count in text, in the order given", async () => {
    const { container } = render(
      <CountBarChart
        id="by-region"
        bars={[
          { key: "donetsk", label: messages.regions.donetsk, count: 4 },
          { key: "kharkiv", label: messages.regions.kharkiv, count: 1 },
          { key: "crimea", label: messages.regions.crimea, count: 0 },
        ]}
        labels={labels}
      />,
    );

    const figure = screen.getByRole("figure", { name: t.regionsTitle });
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
      <CountBarChart
        id="by-region"
        bars={[{ key: "donetsk", label: messages.regions.donetsk, count: 0 }]}
        labels={labels}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(
      `${messages.regions.donetsk}0`,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("keeps two charts on one page apart by name", async () => {
    const { container } = render(
      <>
        <CountBarChart id="by-region" bars={[]} labels={labels} />
        <CountBarChart
          id="by-gender"
          bars={[]}
          labels={{ title: t.genderTitle, description: t.genderDescription }}
        />
      </>,
    );

    expect(
      screen.getByRole("figure", { name: t.regionsTitle }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("figure", { name: t.genderTitle }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
