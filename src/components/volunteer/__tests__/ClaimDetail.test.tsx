import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/config";
import { axe } from "@/test/axe";

import { ClaimDetail } from "../ClaimDetail";

const t = messages.volunteer.claims.card;
// The card's shared copy — fields, prices, the two portraits — lives with the
// shared card, which the parent's view of their own application draws too.
const tShared = messages.applicationCard;

const application = {
  id: "a1",
  status: "claimed",
  childName: "Настенко Олена Іванівна",
  childAge: 10,
  homeTown: "Маріуполь",
  homeRegion: "donetsk",
  currentTown: "Київ",
  currentRegion: "kyiv",
  displacedYear: 2023,
  parentName: "Настенко Ірина",
  familyStory: "Раніше родина жила у Дружківці.",
  giftDescription: "Мріє про ляльку.",
  giftPrice: "540.00",
  deliveryInformation: "місто Київ, нова пошта 303",
  typeFields: {
    giftUrls: ["https://rozetka.com.ua/p/", "javascript:alert(1)"],
  },
} as unknown as Parameters<typeof ClaimDetail>[0]["application"];

async function renderDetail(
  overrides: Partial<Parameters<typeof ClaimDetail>[0]> = {},
) {
  const ui = await ClaimDetail({
    application,
    photos: [
      { id: "f1", kind: "letter_photo" },
      { id: "f2", kind: "child_with_letter_photo" },
    ],
    contact: { method: "telegram", value: "wedmejatko" },
    ...overrides,
  });
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ClaimDetail", () => {
  // This is the tier-2 surface: the one place a volunteer sees where the family
  // lives now, how the gift is delivered and how to reach them.
  it("shows the family's details to the volunteer holding the claim", async () => {
    await renderDetail();

    for (const value of [
      "Маріуполь",
      "Київ",
      "2023",
      "Настенко Ірина",
      "місто Київ, нова пошта 303",
      "@wedmejatko",
    ]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(
      screen.getByRole("heading", { name: "Настенко Олена Іванівна" }),
    ).toBeInTheDocument();
    // The VALUE, not just the label. Asserting labels only is how a missing
    // `price` key rendered «volunteer.children.card.price» on the page and this
    // spec still passed.
    expect(
      screen.getByText(tShared.price.replace("{price}", "540")),
    ).toBeInTheDocument();
  });

  it("labels every line, so a value is never a bare string", async () => {
    await renderDetail();

    for (const label of Object.values(tShared.fields)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  // Same rule as the browse card: a parent-written url goes into an href, and
  // zod's `.url()` accepts `javascript:`.
  it("drops a link that is not http(s)", async () => {
    await renderDetail();

    expect(
      screen.getByRole("link", { name: "https://rozetka.com.ua/p/" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/javascript:/)).not.toBeInTheDocument();
  });

  it("opens each photo through the authorized route", async () => {
    await renderDetail();

    for (const [kind, fileId] of [
      ["letter_photo", "f1"],
      ["child_with_letter_photo", "f2"],
    ] as const) {
      expect(
        screen.getByRole("link", {
          name: messages.common.lightbox.open.replace(
            "{title}",
            tShared.photos[kind].title,
          ),
        }),
      ).toHaveAttribute("href", `/api/applications/a1/files/${fileId}`);
    }
  });

  // «Фото від родини» exists as a heading before the photo does: a volunteer
  // waiting for the family to confirm should be told that is what they are
  // waiting for, not shown an empty space.
  it("explains the family photo is still to come", async () => {
    await renderDetail();

    expect(
      screen.getByRole("heading", { name: t.sections.familyPhoto }),
    ).toBeInTheDocument();
    expect(screen.getByText(t.awaiting)).toBeInTheDocument();
  });

  it("thanks the volunteer only once the family has confirmed", async () => {
    await renderDetail();
    expect(screen.queryByText(t.thanks)).not.toBeInTheDocument();

    await renderDetail({
      application: { ...application, status: "fulfilled" },
      photos: [{ id: "f3", kind: "confirmation" }],
    });
    expect(screen.getByText(t.thanks)).toBeInTheDocument();
  });

  it("goes back to the list, and has no accessibility violations", async () => {
    const { container } = await renderDetail();

    expect(screen.getByRole("link", { name: t.close })).toHaveAttribute(
      "href",
      "/account/volunteer/claims",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
