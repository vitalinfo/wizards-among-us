import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import { formats, locale, timeZone } from "@/i18n/config";
import { axe } from "@/test/axe";

import { ApplicationSummary } from "../ApplicationSummary";

const t = messages.admin.applications.fields;
const tFiles = messages.admin.applications.files;
const tSummary = messages.parent.applications.summary;

const application = {
  id: "a1",
  childName: "Марійка",
  childAge: 8,
  homeTown: "Бахмут",
  homeRegion: "donetsk",
  currentTown: "Стрий",
  currentRegion: "lviv",
  displacedYear: 2022,
  parentName: "Олена Коваль",
  familyStory: "Виїхали у 2022 році.",
  giftDescription: "Лялька",
  giftPrice: "700.00",
  deliveryInformation: "Нова пошта, відділення 3",
} as unknown as Parameters<typeof ApplicationSummary>[0]["application"];

async function renderSummary(
  props: Partial<Parameters<typeof ApplicationSummary>[0]> = {},
) {
  const ui = await ApplicationSummary({
    application,
    files: [],
    giftUrls: [],
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
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ApplicationSummary", () => {
  // Before this, a locked application showed one line of explanation and
  // nothing else — on the one page that is about the parent's own child.
  it("shows the parent everything they sent", async () => {
    await renderSummary();

    expect(screen.getByText("Марійка")).toBeVisible();
    expect(screen.getByText("Виїхали у 2022 році.")).toBeVisible();
    expect(screen.getByText("Нова пошта, відділення 3")).toBeVisible();
    expect(screen.getByText("Олена Коваль")).toBeVisible();
    expect(screen.getByText("700.00")).toBeVisible();
  });

  // Regions are stored as slugs; a parent must not be shown "donetsk".
  it("renders regions in Ukrainian, not as slugs", async () => {
    await renderSummary();

    expect(screen.getByText(messages.regions.donetsk)).toBeVisible();
    expect(screen.getByText(messages.regions.lviv)).toBeVisible();
    expect(screen.queryByText("donetsk")).toBeNull();
  });

  // A draft can be missing anything; an em dash is the difference between
  // "you left this blank" and a broken page.
  it("marks an unanswered field rather than rendering nothing", async () => {
    await renderSummary({
      application: {
        ...application,
        familyStory: null,
        childAge: null,
      },
    });

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText(t.familyStory)).toBeVisible();
  });

  // The shop links live in type_fields, not a column, so the page resolves them
  // and passes them in — a regression here silently drops them.
  it("lists the shop links", async () => {
    await renderSummary({
      giftUrls: ["https://rozetka.com.ua/a", "https://rozetka.com.ua/b"],
    });

    expect(
      screen.getByText(/rozetka\.com\.ua\/a[\s\S]*rozetka\.com\.ua\/b/),
    ).toBeVisible();
  });

  it("says so when there are no links", async () => {
    await renderSummary();
    expect(screen.getByText(t.giftUrls)).toBeVisible();
  });

  // Including the ВПО certificate: it is admin-only in the sense of "never a
  // volunteer", not "not even the parent who uploaded it".
  it("shows the parent their own uploads, certificate included", async () => {
    await renderSummary({
      files: [
        { id: "f1", kind: "idp_certificate" },
        { id: "f2", kind: "letter_photo" },
      ] as never,
    });

    // Two matches each: the caption, and the title inside the lightbox that
    // opens from it.
    expect(screen.getAllByText(tFiles.idp_certificate).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(tFiles.letter_photo).length).toBeGreaterThan(0);

    // The thumbnail's alt is empty (the caption names it), so the LINK has to
    // carry the name — otherwise it is a tab stop that announces nothing.
    const open = messages.common.lightbox.open.replace(
      "{title}",
      tFiles.letter_photo,
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

  it("omits the photo section entirely when nothing was uploaded", async () => {
    await renderSummary();

    expect(screen.queryByText(tSummary.files)).toBeNull();
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderSummary({
      files: [{ id: "f1", kind: "letter_photo" }] as never,
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
