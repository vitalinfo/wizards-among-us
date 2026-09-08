import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { ErrorScreen } from "../ErrorScreen";

// The shared dead-end page. It takes copy already translated, so it can be
// rendered on its own — which is the point of it being presentational.
describe("ErrorScreen", () => {
  function renderScreen(code = "404") {
    return render(
      <ErrorScreen code={code} title="Заголовок" body="Пояснення">
        <Link href="/">На головну</Link>
      </ErrorScreen>,
    );
  }

  it("puts the message in the page heading", () => {
    renderScreen();
    expect(
      screen.getByRole("heading", { level: 1, name: "Заголовок" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Пояснення")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "На головну" }),
    ).toBeInTheDocument();
  });

  // The status code is decoration — the heading already says what happened,
  // and a screen reader announcing "404" out of a drawing adds nothing.
  it("hides the artwork, code and all, from assistive technology", () => {
    const { container } = renderScreen("500");
    const art = container.querySelector('[aria-hidden="true"]');
    expect(art).not.toBeNull();
    expect(art).toHaveTextContent("500");
    // Nothing about the code reaches the accessibility tree as content.
    expect(screen.queryByText("500", { ignore: "[aria-hidden] *" })).toBeNull();
  });

  it("renders without actions", () => {
    render(<ErrorScreen code="404" title="Заголовок" body="Пояснення" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderScreen();
    expect(await axe(container)).toHaveNoViolations();
  });
});
