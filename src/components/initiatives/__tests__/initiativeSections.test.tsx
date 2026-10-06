import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";
import type { InitiativeStatus } from "@/features/initiatives/catalog";
import { InitiativeHero } from "../InitiativeHero";
import { InitiativeSteps, type Step } from "../InitiativeSteps";

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function hero(status: InitiativeStatus) {
  return wrap(
    <InitiativeHero
      status={status}
      title="Чарівний Миколай"
      lead={messages.initiatives.mykolai.lead}
    />,
  );
}

const STATUS = messages.landing.initiatives.status;

describe("InitiativeHero", () => {
  // The design hardcodes «Відбувається набір» into this pill. It comes from
  // the database instead, so the page cannot advertise a campaign the server
  // would refuse — the same contract the cards got.
  it("shows the recruitment state it is given", () => {
    hero("closed");
    expect(screen.getByText(STATUS.closed)).toBeInTheDocument();
    expect(screen.queryByText(STATUS.open)).not.toBeInTheDocument();
  });

  it("offers «Подати заявку» as a real link only while intake is open", () => {
    hero("open");
    expect(
      screen.getByRole("link", { name: messages.initiatives.apply }),
    ).toHaveAttribute("href", "/parent");
  });

  // A control that cannot be used should not be focusable or announced as a
  // link — so it is a disabled button, not a greyed-out anchor.
  it("disables it when intake is shut", () => {
    hero("soon");
    expect(
      screen.getByRole("button", { name: messages.initiatives.apply }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("link", { name: messages.initiatives.apply }),
    ).not.toBeInTheDocument();
  });

  // Signing up to help never depends on whether a campaign is taking
  // applications from families.
  it("always offers the volunteer route", () => {
    for (const status of ["open", "soon", "closed"] as const) {
      const { unmount } = hero(status);
      expect(
        screen.getByRole("link", { name: messages.initiatives.volunteer }),
      ).toHaveAttribute("href", "/volunteer");
      unmount();
    }
  });

  it("has no accessibility violations", async () => {
    const { container } = hero("open");
    expect(await axe(container)).toHaveNoViolations();
  });
});

const STEPS: Step[] = (
  ["letter", "wish", "read", "gift", "share"] as const
).map((key, i) => ({
  key,
  emoji: ["✍️", "📄", "🪄", "🎁", "❤️"][i],
  title: messages.initiatives.mykolai.steps.items[key].title,
  body: messages.initiatives.mykolai.steps.items[key].body,
}));

describe("InitiativeSteps", () => {
  function renderSteps() {
    const s = messages.initiatives.mykolai.steps;
    return wrap(
      <InitiativeSteps
        label={s.label}
        title={s.title}
        subtitle={s.subtitle}
        steps={STEPS}
      />,
    );
  }

  it("renders every step in order", () => {
    renderSteps();
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual(STEPS.map((s) => s.title));
  });

  // The emoji is the design's icon. "writing hand" read before «Дитина пише
  // лист» is noise, so it must not reach the accessibility tree.
  it("keeps the emoji out of the accessibility tree", () => {
    renderSteps();
    for (const step of STEPS) {
      expect(screen.getByText(step.emoji)).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    }
  });

  it("has no accessibility violations", async () => {
    const { container } = renderSteps();
    expect(await axe(container)).toHaveNoViolations();
  });
});

// Each illustration is welded to a committed file, so a typo'd path is a
// broken picture on a page a family reads.
describe("the Mykolai illustrations", () => {
  it("exist in public/", async () => {
    const { statSync } = await import("node:fs");
    for (const file of [
      "public/initiative-mykolai-why.webp",
      "public/initiative-mykolai-letter.webp",
    ]) {
      expect(() => statSync(file), `missing ${file}`).not.toThrow();
    }
  });
});
