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
  return card;
}

async function renderCard(
  overrides: Record<string, unknown> = {},
  claimHref = "/account/volunteer/children/a1/claim",
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

  // The card draws «Олена» and nothing beside it. An icon here was mine, not
  // the design's — `childGender` stays in the projection for the screen that
  // does draw one, but this card must not invent a place for it.
  it("draws the name alone, with no gender icon", async () => {
    await renderCard();

    expect(screen.queryByRole("img", { name: genders.girl })).toBeNull();
    expect(screen.queryByText("👧")).toBeNull();
    expect(screen.queryByText("👦")).toBeNull();
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

  // Every child in this list is one nobody holds (`approved` only), so the
  // card has no taken state and no conditional button — the list is what you
  // can still take.
  it("always offers the claim action", async () => {
    await renderCard();

    expect(screen.getByRole("link", { name: t.claimCta })).toBeInTheDocument();
  });

  it("shows the oblast with the town the family left", async () => {
    await renderCard();

    expect(screen.getByText("Донецьк, Донецька область")).toBeInTheDocument();
  });
});

// Ukrainian has three plural forms for a year, and a card prints the age of a
// real child — «1 років» was on screen the first time an application with a
// one-year-old was approved.
describe("ChildCard age", () => {
  it("declines the year for the number in front of it", async () => {
    for (const [age, expected] of [
      [1, "1 рік"],
      [2, "2 роки"],
      [4, "4 роки"],
      [5, "5 років"],
      [11, "11 років"],
      [17, "17 років"],
    ] as const) {
      const { unmount } = await renderCard({ childAge: age });
      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    }
  });
});
