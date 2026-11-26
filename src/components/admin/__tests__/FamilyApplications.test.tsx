import { NextIntlClientProvider } from "next-intl";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { formats, locale, timeZone } from "@/i18n/config";
import type { FamilyApplicationRow } from "@/features/applications/adminQueries";
import { axe } from "@/test/axe";

import { FamilyApplications } from "../FamilyApplications";

const t = messages.admin.applications.familyApplications;
const status = messages.parent.applications.status;

const ITEMS: FamilyApplicationRow[] = [
  {
    id: "11111111-0000-0000-0000-000000000001",
    childName: "Марія",
    status: "approved",
    createdAt: new Date("2026-11-03T10:00:00Z"),
  },
  {
    id: "11111111-0000-0000-0000-000000000002",
    childName: null,
    status: "draft",
    // 23:30 UTC is already the next day in Kyiv — the date must follow the
    // pinned zone, not the server's.
    createdAt: new Date("2026-11-20T23:30:00Z"),
  },
];

function wrap(items = ITEMS, hrefSearch = "status=all&campaign=active") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone}
      formats={formats}
    >
      <FamilyApplications items={items} hrefSearch={hrefSearch} />
    </NextIntlClientProvider>,
  );
}

describe("FamilyApplications", () => {
  it("starts collapsed, with the count in the summary", () => {
    wrap();
    const summary = screen.getByText(t.summary.replace("{count}", "2"));
    expect(summary.closest("details")).not.toHaveAttribute("open");
  });

  // Opening is the browser's job (a native <details>); jsdom models the click
  // but not a keyboard toggle on <summary>, so the click stands in for both.
  it("expands to a table of each child's status and created date", async () => {
    const user = userEvent.setup();
    wrap();
    const summary = screen.getByText(t.summary.replace("{count}", "2"));
    await user.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");

    const table = screen.getByRole("table", { name: t.caption });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual([t.columns.child, t.columns.status, t.columns.createdAt]);

    // Header row + one row per application.
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);

    const first = within(rows[0]!);
    expect(first.getByRole("rowheader")).toHaveTextContent("Марія");
    expect(first.getByRole("link", { name: "Марія" })).toHaveAttribute(
      "href",
      "/admin/applications/11111111-0000-0000-0000-000000000001?status=all&campaign=active",
    );
    expect(first.getAllByRole("cell").map((td) => td.textContent)).toEqual([
      status.approved,
      "03.11.2026",
    ]);

    const second = within(rows[1]!);
    // A draft may not have a name yet.
    expect(second.getByRole("link", { name: t.unnamed })).toBeInTheDocument();
    expect(second.getAllByRole("cell").map((td) => td.textContent)).toEqual([
      status.draft,
      "21.11.2026",
    ]);
  });

  it("links without a query string when there is no queue view", () => {
    wrap(ITEMS.slice(0, 1), "");
    expect(screen.getByRole("link", { name: "Марія" })).toHaveAttribute(
      "href",
      "/admin/applications/11111111-0000-0000-0000-000000000001",
    );
  });

  it("has no axe violations", async () => {
    const { container } = wrap();
    expect(await axe(container)).toHaveNoViolations();
  });
});
