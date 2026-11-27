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
const data = vi.hoisted(() => ({
  rows: [] as ReviewRow[],
  // The filter's total; null means "just the rows on this page".
  total: null as number | null,
  status: undefined as string | undefined,
  slice: undefined as { limit: number; offset: number } | undefined,
}));
vi.mock("@/features/reviews/queries", () => ({
  countReviewsForModeration: async () => data.total ?? data.rows.length,
  listReviewsForModeration: async (
    status: string,
    slice: { limit: number; offset: number },
  ) => {
    data.status = status;
    data.slice = slice;
    return data.rows;
  },
}));
// The turn buttons refresh the page after a turn; the redirect stays real.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: () => {} }),
}));
// AdminNav is async (RTL cannot render it nested).
vi.mock("@/components/admin/AdminNav", () => ({ AdminNav: () => null }));
// Pager is async too, and has its own spec. This stand-in draws what the page
// hands it, so what is under test is the page's arithmetic and its urls.
vi.mock("@/components/ui/Pager", () => ({
  Pager: (props: {
    label: string;
    page: number;
    pageCount: number;
    total: number;
    from: number;
    to: number;
    hrefFor: (page: number) => string;
  }) => (
    <nav aria-label={props.label}>
      <p>{`${props.from}–${props.to} / ${props.total}, ${props.page} / ${props.pageCount}`}</p>
      {props.page > 1 ? <a href={props.hrefFor(props.page - 1)}>prev</a> : null}
      {props.page < props.pageCount ? (
        <a href={props.hrefFor(props.page + 1)}>next</a>
      ) : null}
    </nav>
  ),
}));
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

async function renderPage(
  rows: ReviewRow[],
  status?: string,
  { page, total = null }: { page?: string; total?: number | null } = {},
) {
  data.rows = rows;
  data.total = total;
  const ui = await AdminReviewsPage({
    searchParams: Promise.resolve({ status, page }),
  });
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

  it("lists every review by default", async () => {
    await renderPage([review({})]);

    expect(data.status).toBe("all");
    expect(screen.getByLabelText(t.filter.status)).toHaveValue("all");
  });

  it("narrows the list to the status in the url", async () => {
    await renderPage([review({ isPublished: true })], "published");

    expect(data.status).toBe("published");
    expect(screen.getByLabelText(t.filter.status)).toHaveValue("published");
  });

  it("reads an unknown status as all", async () => {
    await renderPage([review({})], "deleted");

    expect(data.status).toBe("all");
  });

  it("asks for the first page by default", async () => {
    await renderPage([review({})]);

    expect(data.slice).toEqual({ limit: 20, offset: 0 });
    const pager = screen.getByRole("navigation", { name: t.pager.label });
    expect(pager).toHaveTextContent("1–1 / 1, 1 / 1");
  });

  it("reads the page from the url and keeps the filter in the pager's links", async () => {
    await renderPage([review({})], "hidden", { page: "2", total: 45 });

    expect(data.status).toBe("hidden");
    expect(data.slice).toEqual({ limit: 20, offset: 20 });
    const pager = screen.getByRole("navigation", { name: t.pager.label });
    expect(pager).toHaveTextContent("21–21 / 45, 2 / 3");
    expect(within(pager).getByRole("link", { name: "prev" })).toHaveAttribute(
      "href",
      "/admin/reviews?status=hidden",
    );
    expect(within(pager).getByRole("link", { name: "next" })).toHaveAttribute(
      "href",
      "/admin/reviews?status=hidden&page=3",
    );
  });

  // A stale link, or publishing the last review on a filtered page, must not
  // land on an empty slice that reads as "no reviews".
  it("clamps a page past the end to the last page", async () => {
    await renderPage([review({})], undefined, { page: "9", total: 25 });

    expect(data.slice).toEqual({ limit: 20, offset: 20 });
  });

  it("reads a nonsense page as the first", async () => {
    await renderPage([review({})], undefined, { page: "-3", total: 45 });

    expect(data.slice).toEqual({ limit: 20, offset: 0 });
  });

  // «No reviews yet» over a filtered list would read as if there were none.
  it("says the filter matched nothing, not that there are no reviews", async () => {
    await renderPage([], "hidden");

    expect(screen.getByText(t.emptyFiltered)).toBeInTheDocument();
    expect(screen.queryByText(t.empty)).not.toBeInTheDocument();
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
