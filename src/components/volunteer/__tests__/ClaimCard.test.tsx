import { NextIntlClientProvider } from "next-intl";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// Renders the real server component. See src/test/serverIntl.ts for why the
// request-scoped half of next-intl/server has to be replaced — the translator
// itself is the real one, over the real messages.
vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import { formats, locale, timeZone } from "@/i18n/config";
import { axe } from "@/test/axe";

import { ClaimCard } from "../ClaimCard";

const t = messages.volunteer.claims;
const tFields = messages.admin.applications.fields;

// A submitted application, only as far as this card reads it.
const application = {
  id: "a1",
  childName: "Марійка",
  status: "claimed",
  giftDescription: "Лялька",
  giftPrice: "700.00",
  parentName: "Олена Коваль",
  familyStory: "Виїхали у 2022 році.",
  currentTown: "Стрий",
  deliveryInformation: "Нова пошта, відділення 3",
} as unknown as Parameters<typeof ClaimCard>[0]["application"];

async function renderCard(
  props: Partial<Parameters<typeof ClaimCard>[0]> = {},
) {
  const ui = await ClaimCard({
    application,
    claimedAt: new Date("2026-09-01T10:00:00Z"),
    parentUsername: "olena",
    parentPhone: null,
    photos: [],
    defaultOpen: false,
    ...props,
  });
  // The tree contains a CLIENT component (PhotoLightbox), which needs the real
  // provider — the server-side mock only covers next-intl/server.
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      formats={formats}
      timeZone={timeZone}
    >
      <ul>{ui}</ul>
    </NextIntlClientProvider>,
  );
}

describe("ClaimCard", () => {
  // The change this exists for: three children used to mean three fully
  // expanded cards, every delivery address on one scroll.
  it("keeps the child identifiable while collapsed", async () => {
    await renderCard();

    expect(screen.getByRole("heading", { name: "Марійка" })).toBeVisible();
    expect(screen.getByText(t.inProgress)).toBeVisible();
    expect(screen.getByText(/01\.09\.2026/)).toBeVisible();
  });

  // Collapsed content STAYS in the DOM — <details> hides it, it is not removed
  // — so this has to assert visibility. A queryBy/toBeNull test would pass
  // against a card that never collapsed at all.
  it("hides the family's details until asked", async () => {
    await renderCard();

    const details = screen.getByRole("group");
    expect(details).not.toHaveAttribute("open");
    expect(
      within(details).getByText("Нова пошта, відділення 3"),
    ).not.toBeVisible();
  });

  it("reveals them on click", async () => {
    const user = userEvent.setup();
    await renderCard();

    await user.click(screen.getByText("Марійка"));

    const details = screen.getByRole("group");
    expect(details).toHaveAttribute("open");
    expect(within(details).getByText("Нова пошта, відділення 3")).toBeVisible();
    expect(within(details).getByText("@olena")).toBeVisible();
  });

  // Clicking to reveal the single thing on the page is pure friction; the page
  // decides this from rows.length === 1.
  it("starts open when it is the volunteer's only child", async () => {
    await renderCard({ defaultOpen: true });

    expect(screen.getByRole("group")).toHaveAttribute("open");
    expect(screen.getByText("Нова пошта, відділення 3")).toBeVisible();
  });

  // Tier 2, all of it — shown because this volunteer holds the active claim.
  it("shows the tier-2 fields the claim entitles them to", async () => {
    await renderCard({ defaultOpen: true });

    for (const label of [
      tFields.parentName,
      tFields.familyStory,
      tFields.currentTown,
      tFields.deliveryInformation,
      tFields.contact,
    ]) {
      expect(screen.getByText(label)).toBeVisible();
    }
  });

  // A phone is the fallback when the family has no Telegram handle; a volunteer
  // with no way to reach them is the failure this guards.
  it("falls back to the phone when there is no handle", async () => {
    await renderCard({
      defaultOpen: true,
      parentUsername: null,
      parentPhone: "+380671234567",
    });

    expect(screen.getByText("+380671234567")).toBeVisible();
  });

  // Keyboard operation comes from the elements. jsdom models neither <summary>
  // focus nor Enter-to-toggle, so a test of those would assert jsdom's gaps;
  // this guards the regression that would really break it — a <div onClick> in
  // place of the disclosure, or a tabindex bolted on.
  it("uses the native disclosure rather than a hand-rolled toggle", async () => {
    await renderCard();
    const summary = screen.getByText("Марійка").closest("summary");

    expect(summary).not.toBeNull();
    expect(summary).not.toHaveAttribute("tabindex");
    expect(summary?.parentElement?.tagName).toBe("DETAILS");
  });

  // <summary> already exposes its own expanded state; a second, static
  // "expand" would be announced alongside it and contradict it once open.
  it("does not announce its own affordance twice", async () => {
    await renderCard();

    expect(screen.getByText(t.expand)).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(t.collapse)).toHaveAttribute("aria-hidden", "true");
  });

  it("swaps the badge and the note once the dream is done", async () => {
    await renderCard({
      application: { ...application, status: "fulfilled" },
      defaultOpen: true,
    });

    expect(screen.getByText(t.fulfilled)).toBeVisible();
    expect(screen.getByText(t.thanks)).toBeVisible();
    expect(screen.queryByText(t.releaseNote)).toBeNull();
  });

  it("shows the letter photos the volunteer may see", async () => {
    await renderCard({
      defaultOpen: true,
      photos: [
        { id: "f1", kind: "letter_photo" },
        { id: "f2", kind: "child_with_letter_photo" },
      ],
    });

    // Two matches each: the caption, and the title inside the lightbox that
    // opens from it.
    expect(
      screen.getAllByText(t.photos.letter_photo.title).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(t.photos.child_with_letter_photo.title).length,
    ).toBeGreaterThan(0);

    // Opens in place, not in a new tab — the volunteer comparing a letter
    // against a shop page must not lose the delivery details to do it.
    const open = messages.common.lightbox.open.replace(
      "{title}",
      t.photos.letter_photo.title,
    );
    expect(screen.getByRole("link", { name: open })).toBeVisible();

    // Never a direct storage url — always the authorized, audited route.
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute(
        "href",
        expect.stringContaining("/api/applications/a1/files/"),
      );
    }
  });

  it("has no accessibility violations, open or closed", async () => {
    const closed = await renderCard();
    expect(await axe(closed.container)).toHaveNoViolations();
    closed.unmount();

    const open = await renderCard({
      defaultOpen: true,
      photos: [{ id: "f1", kind: "letter_photo" }],
    });
    expect(await axe(open.container)).toHaveNoViolations();
  });
});
