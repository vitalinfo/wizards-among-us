import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { listReviewsForModeration } from "@/features/reviews/queries";
import { axe } from "@/test/axe";

type ReviewRow = Awaited<ReturnType<typeof listReviewsForModeration>>[number];

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
// The session and the queue are database reads; what is under test is how
// the page draws them.
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => ({
    kind: "admin",
    id: "a1",
    email: "admin@example.com",
  }),
}));
const data = vi.hoisted(() => ({ rows: [] as ReviewRow[] }));
vi.mock("@/features/reviews/queries", () => ({
  listReviewsForModeration: async () => data.rows,
}));
// The turn buttons refresh the page after a turn; the redirect stays real.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: () => {} }),
}));
// AdminNav is async (RTL cannot render it nested).
vi.mock("@/components/admin/AdminNav", () => ({ AdminNav: () => null }));
vi.mock("../actions", () => ({
  setReviewPublishedAction: async () => {},
}));

import messages from "../../../../../messages/uk.json";

import AdminReviewsPage from "../page";

const t = messages.admin.reviews;
const USER_ID = "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da";
const APPLICATION_ID = "0f1e2d3c-4b5a-4968-8776-655443322110";
const FILE_ID = "5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d";

function review(overrides: Partial<ReviewRow>): ReviewRow {
  return {
    id: "r1",
    rating: 5,
    body: "Дякуємо!",
    isPublished: false,
    createdAt: new Date("2026-11-01T10:00:00Z"),
    authorId: USER_ID,
    authorFirstName: "Олена",
    authorUsername: "olena",
    applicationId: APPLICATION_ID,
    childName: "Марко",
    confirmationPhoto: null,
    ...overrides,
  };
}

async function renderPage(rows: ReviewRow[]) {
  data.rows = rows;
  const ui = await AdminReviewsPage();
  // The photo's lightbox is a client component inside the server tree.
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

// jsdom implements <dialog> but not the modal behaviour.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AdminReviewsPage", () => {
  it("shows the empty state", async () => {
    await renderPage([]);
    expect(screen.getByText(t.empty)).toBeInTheDocument();
  });

  it("links the author to their user page and the child to the application", async () => {
    const { container } = await renderPage([review({})]);

    const item = screen.getByRole("listitem");
    expect(within(item).getByRole("link", { name: "Олена" })).toHaveAttribute(
      "href",
      `/admin/users/${USER_ID}`,
    );
    expect(within(item).getByRole("link", { name: "Марко" })).toHaveAttribute(
      "href",
      `/admin/applications/${APPLICATION_ID}`,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("falls back to the @username, and leaves an unlinked review's child as plain text", async () => {
    await renderPage([
      review({
        authorFirstName: null,
        applicationId: null,
        childName: null,
      }),
    ]);

    const item = screen.getByRole("listitem");
    expect(within(item).getByRole("link", { name: "@olena" })).toHaveAttribute(
      "href",
      `/admin/users/${USER_ID}`,
    );
    // Only the author is a link; the missing application has nowhere to go.
    expect(within(item).getAllByRole("link")).toHaveLength(1);
    expect(item).toHaveTextContent("дитина: —");
  });

  it("shows the family's gift photo as a thumbnail linked through the authorized route", async () => {
    const { container } = await renderPage([
      review({ confirmationPhoto: { id: FILE_ID, version: 1700000000000 } }),
    ]);

    const title = t.photoTitle.replace("{child}", "Марко");
    const thumbnail = screen.getByRole("link", {
      name: messages.common.lightbox.open.replace("{title}", title),
    });
    // Through the authorized, audit-logged route — never a storage URL.
    expect(thumbnail).toHaveAttribute(
      "href",
      `/api/applications/${APPLICATION_ID}/files/${FILE_ID}?v=1700000000000`,
    );

    // The overlay's photo carries the description; the thumbnail inside the
    // named link stays decorative so it isn't read twice.
    expect(
      screen.getByRole("img", { name: t.photoAlt, hidden: true }),
    ).toHaveAttribute("src", thumbnail.getAttribute("href"));
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows no thumbnail when the family has not added a gift photo", async () => {
    await renderPage([review({ confirmationPhoto: null })]);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Фото з подарунком/ }),
    ).not.toBeInTheDocument();
  });

  it("lets the admin turn the gift photo", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ ok: true }));
    await renderPage([
      review({ confirmationPhoto: { id: FILE_ID, version: 1700000000000 } }),
    ]);

    await user.click(screen.getByRole("link", { name: /Фото з подарунком/ }));
    const dialog = screen.getByRole("dialog", {
      name: t.photoTitle.replace("{child}", "Марко"),
    });
    await user.click(
      within(dialog).getByRole("button", {
        name: messages.common.lightbox.rotateRight,
      }),
    );

    // This photo's own endpoint, without the cache-busting version.
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/applications/${APPLICATION_ID}/files/${FILE_ID}/rotate`,
      expect.objectContaining({ method: "POST" }),
    );
  });
});
