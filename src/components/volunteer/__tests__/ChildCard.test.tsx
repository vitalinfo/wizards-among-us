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
const card = messages.volunteer.children.card;

// Built through the real projection, not hand-written: the card may only ever
// render what toBrowseCard hands it (child-data invariant, tier 1), so the
// fixture goes through the same gate the application does.
function row({
  letterPhotoId = "file-1",
  claimed = false,
  ...overrides
}: Record<string, unknown> = {}) {
  const card = toBrowseCard(
    {
      id: "a1",
      childName: "Марійка Коваль",
      childAge: 8,
      childGender: "girl",
      homeRegion: "donetsk",
      homeTown: "Донецьк",
      currentRegion: "lviv",
      currentTown: "Стрий",
      giftDescription: "Лялька",
      typeFields: { giftUrls: ["https://rozetka.com.ua/ua/123/p123/?a=1"] },
      familyStory: "Виїхали у 2022 році.",
      status: "approved",
      ...overrides,
    } as Parameters<typeof toBrowseCard>[0],
    letterPhotoId as string | null,
  );
  return { ...card, claimed: claimed as boolean };
}

async function renderCard(
  overrides: Record<string, unknown> = {},
  claimHref: string | null = "/account/volunteer/children/a1/claim",
) {
  const ui = await ChildCard({ row: row(overrides), claimHref });
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ul>{ui}</ul>
    </NextIntlClientProvider>,
  );
}

describe("ChildCard", () => {
  it("shows the first name and age, never the surname", async () => {
    await renderCard();

    // The icon's label rides inside the heading's accessible name, so match on
    // the name rather than against the whole string.
    expect(
      screen.getByRole("heading", { name: /Марійка/ }),
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
      screen.getByRole("heading", { name: /Марійка/ }),
    ).toBeInTheDocument();
  });

  it("offers the claim action and has no accessibility violations", async () => {
    const { container } = await renderCard();

    expect(screen.getByRole("link", { name: t.claimCta })).toHaveAttribute(
      "href",
      "/account/volunteer/children/a1/claim",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

// What the 118:420 card added, and what it must still refuse to show.
describe("ChildCard letter photo and shop links", () => {
  it("shows the letter photo through the authorized route, named as a letter", async () => {
    await renderCard();

    const photo = screen.getByRole("img", { name: card.letterAlt });
    // The proxying route, never a storage url: every read is checked against
    // the file kind and logged, which a signed url would defeat.
    expect(photo).toHaveAttribute("src", "/api/applications/a1/files/file-1");
    // Names the object, not the child.
    expect(card.letterAlt).not.toContain("Марійка");
  });

  it("renders without a photo when the application has none", async () => {
    await renderCard({ letterPhotoId: null });

    expect(
      screen.queryByRole("img", { name: card.letterAlt }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Марійка/ }),
    ).toBeInTheDocument();
  });

  it("links the shop, shortened, and tells the shop nothing about us", async () => {
    await renderCard();

    const link = screen.getByRole("link", { name: /rozetka\.com\.ua/ });
    expect(link).toHaveAttribute(
      "href",
      "https://rozetka.com.ua/ua/123/p123/?a=1",
    );
    // The design shows the shop, not 80 characters of slug and tracking.
    expect(link).toHaveTextContent("https://rozetka.com.ua/…");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    expect(link).toHaveAttribute("target", "_blank");
  });

  // The projection is what keeps these off the card; this is the second gate,
  // in the markup, so a future change to BrowseRow cannot quietly print them.
  it("prints nothing about where the family lives now", async () => {
    const { container } = await renderCard();

    expect(container.textContent).not.toContain("Стрий");
    expect(container.textContent).toContain("Донецьк");
  });

  it("says in words when a child already has a charivnyk", async () => {
    await renderCard({ claimed: true }, null);

    expect(screen.getByText(t.claimed)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: t.claimCta }),
    ).not.toBeInTheDocument();
  });
});
