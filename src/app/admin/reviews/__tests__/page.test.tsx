import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
    ...overrides,
  };
}

async function renderPage(rows: ReviewRow[]) {
  data.rows = rows;
  const ui = await AdminReviewsPage();
  return render(<>{ui}</>);
}

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
});
