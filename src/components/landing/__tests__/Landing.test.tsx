import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../messages/uk.json";
import type { CampaignStates } from "@/features/campaigns/queries";
import { SITE } from "@/lib/site";
import { axe } from "@/test/axe";

import { Landing } from "../Landing";

// The hero title carries an <em> tag that next-intl replaces with a coloured
// span; the accessible name is the sentence with the markup taken out.
const heroTitle = messages.landing.hero.title.replace(/<\/?em>/g, "");

function renderLanding(campaigns: CampaignStates = {}) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <Landing campaigns={campaigns} />
    </NextIntlClientProvider>,
  );
}

describe("Landing", () => {
  it("renders the hero heading", () => {
    renderLanding();
    expect(
      screen.getByRole("heading", { level: 1, name: heroTitle }),
    ).toBeInTheDocument();
  });

  it("routes the two hero CTAs to the parent and volunteer pages", () => {
    renderLanding();
    expect(
      screen.getByRole("link", { name: messages.landing.hero.parentCta }),
    ).toHaveAttribute("href", "/parent");
    expect(
      screen.getByRole("link", { name: messages.landing.hero.volunteerCta }),
    ).toHaveAttribute("href", "/volunteer");
  });

  it("states the promise the whole product rests on", () => {
    renderLanding();
    expect(
      screen.getByText(messages.landing.hero.promise.title),
    ).toBeInTheDocument();
  });

  it("pairs every statistic with what it counts", () => {
    renderLanding();
    for (const key of ["gifts", "school", "wizards"] as const) {
      const stat = messages.landing.stats[key];
      expect(screen.getByText(stat.value)).toBeInTheDocument();
      expect(screen.getByText(stat.label)).toBeInTheDocument();
    }
  });

  // Not "4+": the figure is years-since-2022, so it has to be right in 2030
  // too. Both halves of the cell are computed from the same constant.
  it("counts the years since the initiative started rather than hardcoding them", () => {
    renderLanding();
    const years = new Date().getFullYear() - SITE.foundedYear;
    expect(screen.getByText(`${years}+`)).toBeInTheDocument();
    expect(
      screen.getByText(
        `з ${SITE.foundedYear} року даруємо дітям віру у справжнє диво`,
      ),
    ).toBeInTheDocument();
  });

  it("walks a family through all five steps", () => {
    renderLanding();
    for (const step of [
      "tell",
      "verify",
      "found",
      "support",
      "share",
    ] as const) {
      expect(
        screen.getByRole("heading", {
          name: messages.landing.families.steps[step].title,
        }),
      ).toBeInTheDocument();
    }
  });

  it("walks a volunteer through all four steps", () => {
    renderLanding();
    for (const step of ["choose", "meet", "help", "receive"] as const) {
      expect(
        screen.getByRole("heading", {
          name: messages.landing.volunteers.steps[step].title,
        }),
      ).toBeInTheDocument();
    }
  });

  it("sends each manifesto's call to action to its own audience", () => {
    renderLanding();
    expect(
      screen.getByRole("link", {
        name: messages.landing.manifesto.families.cta,
      }),
    ).toHaveAttribute("href", "/parent");
    expect(
      screen.getByRole("link", {
        name: messages.landing.manifesto.volunteers.cta,
      }),
    ).toHaveAttribute("href", "/volunteer");
  });

  // The three initiative cards are static copy, but "is this one open?" is
  // not: it comes from the active campaign, so the badge and the button have
  // to follow it rather than repeating what the mock happened to show.
  it("opens only the initiative whose campaign is running", () => {
    renderLanding({ saint_nicholas_day: "active" });
    const s = messages.landing.initiatives.status;
    expect(screen.getByText(s.open)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: messages.landing.initiatives.cta }),
    ).toHaveAttribute("href", "/parent");
    // The other two offer no route in: disabled buttons, not greyed links.
    expect(
      screen.getAllByRole("button", {
        name: messages.landing.initiatives.cta,
      }),
    ).toHaveLength(2);
  });

  // Three states, and the difference between the last two is whether we have
  // ever run that campaign — not something the copy can know.
  it("distinguishes a campaign that has ended from one never run", () => {
    renderLanding({ saint_nicholas_day: "inactive" });
    const s = messages.landing.initiatives.status;
    expect(screen.getByText(s.closed)).toBeInTheDocument();
    // «Чарівник для родини» has no campaign type, and «Шкільний Чарівник» has
    // never run — both read as not yet open.
    expect(screen.getAllByText(s.soon)).toHaveLength(2);
    expect(screen.queryByText(s.open)).not.toBeInTheDocument();
  });

  it("shows nothing as open when the database is unreachable", () => {
    renderLanding({});
    expect(
      screen.getAllByText(messages.landing.initiatives.status.soon),
    ).toHaveLength(3);
    expect(
      screen.queryByRole("link", { name: messages.landing.initiatives.cta }),
    ).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderLanding();
    expect(await axe(container)).toHaveNoViolations();
  });
});
