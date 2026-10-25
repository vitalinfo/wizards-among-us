import { NextIntlClientProvider } from "next-intl";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import type { ApplicationStatus } from "@/db/enums";
import type { ApplicationsQuery } from "@/features/applications/applicationTabs";
import type { MyApplicationRow } from "@/features/applications/queries";
import { formats, locale, timeZone } from "@/i18n/config";
import { axe } from "@/test/axe";

import { ApplicationsTable } from "../ApplicationsTable";

const t = messages.parent.applications;

function row(
  status: ApplicationStatus,
  overrides: Partial<MyApplicationRow> = {},
): MyApplicationRow {
  return {
    id: `id-${status}`,
    childName: `Дитина-${status}`,
    childAge: 10,
    status,
    submittedAt: status === "draft" ? null : new Date("2026-10-10T10:00:00Z"),
    campaignTitle: "Чарівний Миколай",
    reviewed: false,
    ...overrides,
  };
}

async function renderTable(
  rows: MyApplicationRow[],
  query: ApplicationsQuery = { tab: "all", page: 1, per: 10 },
) {
  const ui = await ApplicationsTable({ rows, query });
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

const fill = (template: string, name: string) =>
  template.replace("{name}", name);

// The table and the cards are both in the DOM (one is hidden per width by
// CSS, which jsdom does not apply), so every control appears twice: once per
// markup. Each assertion says how many it expects.
describe("ApplicationsTable actions by status", () => {
  it("a draft can be edited, viewed and deleted", async () => {
    await renderTable([row("draft")]);
    const name = "Дитина-draft";

    expect(
      screen.getAllByRole("link", { name: fill(t.edit, name) })[0],
    ).toHaveAttribute("href", "/account/parent/applications/id-draft");
    expect(
      screen.getAllByRole("link", { name: fill(t.view, name) })[0],
    ).toHaveAttribute("href", "/account/parent/applications/id-draft/view");
    // The bin opens the confirmation over the list — it deletes nothing.
    expect(
      screen.getAllByRole("link", { name: fill(t.delete, name) })[0],
    ).toHaveAttribute(
      "href",
      "/account/parent/applications?dialog=delete&id=id-draft",
    );
  });

  // The same form as the pencil, offered as the row's next step: a draft is
  // the one status where the next move is the parent's.
  it("a draft offers to continue it, and nothing else does", async () => {
    await renderTable([row("draft")]);
    const links = screen.getAllByRole("link", { name: t.continue });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute(
        "href",
        "/account/parent/applications/id-draft",
      );
    }
  });

  it("no other status offers to continue", async () => {
    await renderTable(
      (
        ["submitted", "approved", "rejected", "claimed", "fulfilled"] as const
      ).map((status) => row(status)),
    );
    expect(
      screen.queryByRole("link", { name: t.continue }),
    ).not.toBeInTheDocument();
  });

  // Submitted is still inside the edit lock, so the pencil stays — but it is
  // in the moderation queue, so the bin does not.
  it("a submitted application can be edited and viewed, not deleted", async () => {
    await renderTable([row("submitted")]);
    const name = "Дитина-submitted";

    expect(
      screen.getAllByRole("link", { name: fill(t.edit, name) }),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("link", { name: fill(t.delete, name) }),
    ).not.toBeInTheDocument();
  });

  it("from approval on, it can only be viewed", async () => {
    for (const status of ["approved", "rejected", "fulfilled"] as const) {
      const { unmount } = await renderTable([row(status)]);
      const name = `Дитина-${status}`;

      expect(
        screen.getAllByRole("link", { name: fill(t.view, name) }),
      ).toHaveLength(2);
      expect(
        screen.queryByRole("link", { name: fill(t.edit, name) }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: fill(t.delete, name) }),
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  it("a claimed application offers to confirm the gift arrived", async () => {
    await renderTable([row("claimed")]);

    for (const link of screen.getAllByRole("link", {
      name: t.confirmReceipt,
    })) {
      expect(link).toHaveAttribute(
        "href",
        "/account/parent/applications?dialog=receive&id=id-claimed",
      );
    }
    expect(
      screen.queryByRole("link", { name: fill(t.edit, "Дитина-claimed") }),
    ).not.toBeInTheDocument();
  });

  // Closing the review dialog after confirming must not be the last chance to
  // write one: a fulfilled row offers it until it is left.
  it("a fulfilled row offers the review until it is left", async () => {
    const { unmount } = await renderTable([row("fulfilled")]);
    for (const link of screen.getAllByRole("link", { name: t.leaveReview })) {
      expect(link).toHaveAttribute(
        "href",
        "/account/parent/applications?dialog=review&id=id-fulfilled",
      );
    }
    unmount();

    await renderTable([row("fulfilled", { reviewed: true })]);
    expect(
      screen.queryByRole("link", { name: t.leaveReview }),
    ).not.toBeInTheDocument();
  });

  it("no other status offers the review", async () => {
    await renderTable(
      (["draft", "submitted", "approved", "rejected", "claimed"] as const).map(
        (status) => row(status),
      ),
    );
    expect(
      screen.queryByRole("link", { name: t.leaveReview }),
    ).not.toBeInTheDocument();
  });

  // The confirmation opens over the view the bin was pressed on, and sends
  // the parent back to it.
  it("the bin keeps the tab and page it was pressed on", async () => {
    await renderTable([row("draft")], { tab: "draft", page: 2, per: 10 });

    expect(
      screen.getAllByRole("link", { name: fill(t.delete, "Дитина-draft") })[0],
    ).toHaveAttribute(
      "href",
      "/account/parent/applications?tab=draft&page=2&dialog=delete&id=id-draft",
    );
  });
});

describe("ApplicationsTable content", () => {
  it("is a real table with column headers", async () => {
    await renderTable([row("submitted")]);

    const table = screen.getByRole("table", { name: t.tableCaption });
    for (const header of Object.values(t.columns)) {
      expect(
        within(table).getByRole("columnheader", { name: header }),
      ).toBeInTheDocument();
    }
  });

  // Status is the word, not the pill's colour.
  it("names every status in words", async () => {
    await renderTable(
      (
        [
          "draft",
          "submitted",
          "approved",
          "rejected",
          "claimed",
          "fulfilled",
        ] as const
      ).map((status) => row(status)),
    );
    for (const label of Object.values(t.status)) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("says when it was submitted, and that a draft has not been", async () => {
    await renderTable([row("draft"), row("submitted")]);

    const table = screen.getByRole("table");
    expect(
      within(table).getByText(t.submittedOn.replace("{date}", t.notSubmitted)),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(t.submittedOn.replace("{date}", "10.10.2026")),
    ).toBeInTheDocument();
  });

  it("names a child-less draft rather than leaving the row blank", async () => {
    await renderTable([row("draft", { childName: null })]);

    expect(screen.getAllByText(t.childFallback)).toHaveLength(2);
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderTable([
      row("draft"),
      row("submitted"),
      row("claimed"),
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });
});
