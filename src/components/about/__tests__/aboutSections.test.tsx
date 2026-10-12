import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";
import { CommunityBanner, type BannerStat } from "../CommunityBanner";
import { Timeline, type Milestone } from "../Timeline";

const t = messages.about;

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const MILESTONES: Milestone[] = (
  ["displaced", "invasion", "today"] as const
).map((key) => ({
  key,
  value: t.timeline.items[key].value,
  label: t.timeline.items[key].label,
}));

describe("Timeline", () => {
  // The order IS the meaning: 2014 → 2022 → сьогодні is a sequence, not three
  // facts. A list keeps that for a screen reader, which the dashes cannot.
  it("lists the milestones in order", () => {
    wrap(<Timeline label={t.timeline.region} items={MILESTONES} />);
    const items = within(
      screen.getByRole("list", { name: t.timeline.region }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items.map((li) => li.textContent)).toEqual(
      MILESTONES.map((m) => m.value + m.label),
    );
  });

  // The dashes between the cards are punctuation. They must not reach the
  // accessibility tree, where they would read as three empty graphics.
  it("keeps the connectors out of the accessibility tree", () => {
    const { container } = wrap(
      <Timeline label={t.timeline.region} items={MILESTONES} />,
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("has no accessibility violations", async () => {
    const { container } = wrap(
      <Timeline label={t.timeline.region} items={MILESTONES} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

const STATS: BannerStat[] = (["friends", "wizards", "families"] as const).map(
  (key) => ({
    key,
    value: t.community.stats[key].value,
    label: t.community.stats[key].label,
  }),
);

function banner() {
  return wrap(
    <CommunityBanner
      image="/about-community.webp"
      imageAlt={t.community.imageAlt}
      label={t.community.label}
      title={t.community.title}
      statsLabel={t.community.region}
      stats={STATS}
    >
      <p>{t.community.note}</p>
    </CommunityBanner>,
  );
}

describe("CommunityBanner", () => {
  it("renders its label, heading, prose and illustration", () => {
    banner();
    expect(screen.getByText(t.community.label)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: t.community.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(t.community.note)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: t.community.imageAlt }),
    ).toBeInTheDocument();
  });

  // The figure is drawn above its label but written AFTER it: «Друзів» is the
  // term and «35» describes it, which is the only way round a description
  // list means anything, and `order` does the visual half. This asserts the
  // half that is read aloud — a swap here would have a screen reader announce
  // a bare number with nothing to attach it to. There is no role query for a
  // description list's pairs, which is the case testing.md keeps a selector
  // for.
  it("pairs each figure with its label, term first", () => {
    const { container } = banner();
    const pairs = [...container.querySelectorAll("dd, dt")].map(
      (el) => el.textContent,
    );
    expect(pairs).toEqual(STATS.flatMap((s) => [s.label, s.value]));
  });

  it("has no accessibility violations", async () => {
    const { container } = banner();
    expect(await axe(container)).toHaveNoViolations();
  });
});

// The designer breaks these paragraphs at sentence boundaries and the breaks
// only apply from lg, so each <br> is display:none on a phone. The space has
// to live in the copy, BEFORE the break — a trailing space collapses at a
// line end, but without one the clauses run together as «вчинки.А разом» in
// the text a screen reader reads and a reader copies, at every width.
//
// jsdom cannot tell us where a line falls, so this asserts the thing that
// survives the break being switched off: the sentence still reads as one.
describe("the line breaks the designer typed", () => {
  const strip = (s: string) =>
    s.replace(/<br><\/br>/g, "").replace(/<\/?(em|faint|b)>/g, "");

  it.each([
    ["about.intro.story", t.intro.story],
    ["about.quote.note", t.quote.note],
    ["about.closing.note", t.closing.note],
  ])("leaves %s readable with the breaks off", (_key, message) => {
    const text = strip(message);
    expect(text).not.toMatch(/\S<br>/);
    // No clause boundary without a space after it.
    expect(text).not.toMatch(/[.,:;!?]\p{Lu}/u);
    expect(text).not.toMatch(/\s\s/);
  });
});
