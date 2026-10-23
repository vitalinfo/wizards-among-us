import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Renders the real server component. See src/test/serverIntl.ts for why the
// request-scoped half of next-intl/server has to be replaced — the translator
// itself is the real one, over the real messages.
vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/config";
import { toBrowseCard } from "@/features/applications/mappers";
import { axe } from "@/test/axe";

import { ChildCard } from "../ChildCard";

const t = messages.volunteer.children;
const genders = messages.genders;

// Built through the real projection, not hand-written: the card may only ever
// render what toBrowseCard hands it (child-data invariant, tier 1), so the
// fixture goes through the same gate the application does.
function row(overrides: Record<string, unknown> = {}) {
  const card = toBrowseCard({
    id: "a1",
    childName: "Марійка Коваль",
    childAge: 8,
    childGender: "girl",
    homeRegion: "donetsk",
    homeTown: "Донецьк",
    currentRegion: "lviv",
    currentTown: "Стрий",
    giftDescription: "Лялька",
    giftPrice: "700.00",
    familyStory: "Виїхали у 2022 році.",
    status: "approved",
    ...overrides,
  } as Parameters<typeof toBrowseCard>[0]);
  return { ...card, claimed: false };
}

async function renderCard(overrides: Record<string, unknown> = {}) {
  const ui = await ChildCard({ row: row(overrides), claimHref: "/claim/a1" });
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ul>{ui}</ul>
    </NextIntlClientProvider>,
  );
}

describe("ChildCard", () => {
  it("shows the first name and age, never the surname", async () => {
    await renderCard();

    expect(
      screen.getByRole("heading", { name: "Марійка" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Коваль/)).not.toBeInTheDocument();
  });

  // The gender is drawn as an icon and appears nowhere else on the card, so
  // without an accessible name a screen reader loses it entirely — the same
  // rule that keeps the claimed/available state as text.
  it("names the child's icon rather than leaving a bare pictograph", async () => {
    await renderCard();

    expect(screen.getByRole("img", { name: genders.girl })).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: genders.boy }),
    ).not.toBeInTheDocument();
  });

  it("draws the boy icon for a boy", async () => {
    await renderCard({ childGender: "boy" });

    expect(screen.getByRole("img", { name: genders.boy })).toBeInTheDocument();
  });

  // Applications submitted before the column existed have no gender. The card
  // still has to render — there is simply no icon on it.
  it("renders without an icon when an older application has no gender", async () => {
    await renderCard({ childGender: null });

    for (const label of [genders.boy, genders.girl]) {
      expect(
        screen.queryByRole("img", { name: label }),
      ).not.toBeInTheDocument();
    }
    expect(
      screen.getByRole("heading", { name: "Марійка" }),
    ).toBeInTheDocument();
  });

  it("offers the claim action and has no accessibility violations", async () => {
    const { container } = await renderCard();

    expect(screen.getByRole("link", { name: t.claimCta })).toHaveAttribute(
      "href",
      "/claim/a1",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
