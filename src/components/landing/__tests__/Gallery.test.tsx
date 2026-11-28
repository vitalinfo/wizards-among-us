import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import type { GalleryPhoto } from "@/features/reviews/gallery";
import { axe } from "@/test/axe";

import { Gallery } from "../Gallery";

const t = messages.landing.gallery;

const PHOTOS: GalleryPhoto[] = [
  { reviewId: "0c9e5c55-6a3f-4a86-9a0e-4f1d2f6b7a10", version: 1700000000000 },
  { reviewId: "5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d", version: 1700000000001 },
];

function renderGallery(photos: readonly GalleryPhoto[], title?: string) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <Gallery photos={photos} title={title} />
    </NextIntlClientProvider>,
  );
}

describe("Gallery", () => {
  it("shows each photo through the public gallery route, numbered", async () => {
    const { container } = renderGallery(PHOTOS);

    expect(
      screen.getByRole("heading", { level: 2, name: t.title }),
    ).toBeInTheDocument();
    const row = screen.getByRole("list", { name: t.region });
    const images = within(row).getAllByRole("img");
    expect(images.map((img) => img.getAttribute("src"))).toEqual([
      `/gallery/${PHOTOS[0].reviewId}/photo?v=1700000000000`,
      `/gallery/${PHOTOS[1].reviewId}/photo?v=1700000000001`,
    ]);
    expect(images.map((img) => img.getAttribute("alt"))).toEqual([
      t.photoAlt.replace("{n}", "1"),
      t.photoAlt.replace("{n}", "2"),
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("keeps the paging arrows", () => {
    renderGallery(PHOTOS);

    expect(screen.getByRole("button", { name: t.prev })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.next })).toBeInTheDocument();
  });

  it("takes the caller's heading in place of its own", () => {
    renderGallery(PHOTOS, "Все почалося з бажання бути поруч.");

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Все почалося з бажання бути поруч.",
      }),
    ).toBeInTheDocument();
  });

  // An empty gallery — nobody has added a photo yet, or the database is
  // unreachable — draws nothing, not a heading over an empty row.
  it("renders nothing without photos", () => {
    const { container } = renderGallery([]);

    expect(container).toBeEmptyDOMElement();
  });
});
