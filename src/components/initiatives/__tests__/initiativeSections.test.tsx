import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";
import type { InitiativeStatus } from "@/features/initiatives/catalog";
import { InitiativeBand } from "../InitiativeBand";
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

  it("offers the volunteer route while intake is open", () => {
    hero("open");
    expect(
      screen.getByRole("link", { name: messages.initiatives.volunteer }),
    ).toHaveAttribute("href", "/volunteer");
  });

  // BOTH buttons follow the campaign (Vital). An initiative with nothing
  // running offers no way in at all — and they are disabled BUTTONS, not
  // greyed-out links, so neither is focusable or announced as a link.
  it("disables both actions when intake is shut", () => {
    for (const status of ["soon", "closed"] as const) {
      const { unmount } = hero(status);
      for (const name of [
        messages.initiatives.apply,
        messages.initiatives.volunteer,
      ]) {
        expect(screen.getByRole("button", { name })).toBeDisabled();
        expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
      }
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
describe("the initiative illustrations", () => {
  it("exist in public/", async () => {
    const { statSync } = await import("node:fs");
    for (const file of [
      "public/initiative-mykolai-why.webp",
      "public/initiative-mykolai-letter.webp",
      "public/initiative-school-supplies.webp",
      "public/initiative-school-wizard.webp",
    ]) {
      expect(() => statSync(file), `missing ${file}`).not.toThrow();
    }
  });
});

describe("InitiativeBand", () => {
  it("renders its label, heading and prose", () => {
    const a = messages.initiatives.school.approach;
    const { container } = wrap(
      <InitiativeBand tone="canvas" label={a.label} title={a.title}>
        <p>{a.body}</p>
      </InitiativeBand>,
    );

    expect(screen.getByText(a.label)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: a.title, level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText(a.body)).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain("bg-canvas");
  });
});
