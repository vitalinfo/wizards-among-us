import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  notFound: () => {
    throw new Error("notFound");
  },
}));

// Whether a link resolves is the route's spec (file/__tests__/route.test.ts),
// where the token and its checks run for real. Here: what the page shows.
const resolved = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("@/features/applications/fileLinkQueries", () => ({
  resolveFileLink: async () => resolved.value,
}));

import messages from "../../../../../messages/uk.json";

import PhotoLinkPage, { generateMetadata } from "../page";

const params = (token: string) => ({ params: Promise.resolve({ token }) });

describe("the photo link page", () => {
  it("shows the photo, named by its kind, from the signed-link route", async () => {
    resolved.value = { kind: "letter_photo" };

    const { container } = render(<>{await PhotoLinkPage(params("a.b.c"))}</>);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: messages.photoLink.letter_photo,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: messages.photoLink.letter_photo }),
    ).toHaveAttribute("src", "/photos/a.b.c/file");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("is not a page for a link that does not resolve", async () => {
    resolved.value = null;

    await expect(PhotoLinkPage(params("expired"))).rejects.toThrow("notFound");
  });

  it("sends no Referer, which would carry the token", async () => {
    expect(await generateMetadata()).toMatchObject({
      referrer: "no-referrer",
    });
  });
});
