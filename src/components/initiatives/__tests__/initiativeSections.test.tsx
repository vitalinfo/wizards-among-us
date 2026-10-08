import { NextIntlClientProvider } from "next-intl";
import Link from "next/link";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";
import type { InitiativeStatus } from "@/features/initiatives/catalog";
import { InitiativeBand } from "../InitiativeBand";
import { InitiativeHero } from "../InitiativeHero";
import { InitiativeQuote } from "../InitiativeQuote";
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

  // «Волонтерам» lays four cards on the blue canvas and picks one out with a
  // solid blue disc; the warm bands pick theirs out in yellow. The column
  // count is written out rather than interpolated, because Tailwind reads
  // class names as literals — a `lg:grid-cols-${n}` compiles to nothing and
  // the row silently collapses to one column.
  it("lays out as many columns as there are steps", () => {
    const s = messages.volunteer.info.steps;
    const four = STEPS.slice(0, 4);
    const { container } = wrap(
      <InitiativeSteps
        label={s.label}
        title={s.title}
        subtitle={s.subtitle}
        steps={four}
        tone="canvas"
      />,
    );
    expect(container.firstElementChild?.className).toContain("bg-canvas");
    expect(container.querySelector("ul")?.className).toContain(
      "lg:grid-cols-4",
    );
  });

  it("picks the accented step out in the tone it is given", () => {
    const accented: Step[] = STEPS.map((step, i) =>
      i === 2 ? { ...step, accent: true as const } : step,
    );
    const s = messages.initiatives.mykolai.steps;
    for (const [accentTone, expected] of [
      [undefined, "bg-accent"],
      ["primary", "bg-primary"],
    ] as const) {
      const { unmount } = wrap(
        <InitiativeSteps
          label={s.label}
          title={s.title}
          subtitle={s.subtitle}
          steps={accented}
          accentTone={accentTone}
        />,
      );
      expect(screen.getByText("🪄").className).toContain(expected);
      unmount();
    }
  });
});

describe("InitiativeQuote", () => {
  // The initiative pages derive their actions from the campaign; «Батькам»
  // and «Волонтерам» supply one of their own. Either, never both.
  it("derives the pair from the campaign when given intakeOpen", () => {
    wrap(
      <InitiativeQuote intakeOpen>
        {messages.initiatives.family.quote}
      </InitiativeQuote>,
    );
    expect(
      screen.getByRole("link", { name: messages.initiatives.apply }),
    ).toHaveAttribute("href", "/parent");
    expect(
      screen.getByRole("link", { name: messages.initiatives.volunteer }),
    ).toHaveAttribute("href", "/volunteer");
  });

  it("renders the single action it is given instead", () => {
    wrap(
      <InitiativeQuote
        cta={
          <Link href="/parent/applications">
            {messages.parent.info.applyCta}
          </Link>
        }
      >
        {messages.parent.info.closing}
      </InitiativeQuote>,
    );
    expect(
      screen.getByRole("link", { name: messages.parent.info.applyCta }),
    ).toHaveAttribute("href", "/parent/applications");
    expect(
      screen.queryByRole("link", { name: messages.initiatives.volunteer }),
    ).not.toBeInTheDocument();
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
      "public/initiative-family-hero.webp",
      "public/initiative-family-help.webp",
      "public/parent-hero.webp",
      "public/parent-no-initiative.webp",
      "public/volunteer-hero.webp",
      "public/volunteer-approach.webp",
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
