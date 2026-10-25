import { NextIntlClientProvider } from "next-intl";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import type { MyVolunteerRow } from "@/features/applications/queries";
import { locale } from "@/i18n/config";
import { axe } from "@/test/axe";

import { MyVolunteersTable } from "../MyVolunteersTable";

const t = messages.parent.myVolunteer;

function row(overrides: Partial<MyVolunteerRow> = {}): MyVolunteerRow {
  return {
    applicationId: "a1",
    childName: "Софія",
    status: "claimed",
    campaignTitle: "Чарівний Миколай",
    claimedAt: new Date("2026-11-01T10:00:00Z"),
    volunteerFirstName: "Олександр",
    volunteerUsername: "ales_wizard",
    volunteerPhone: "+380937861695",
    ...overrides,
  };
}

async function renderTable(rows: MyVolunteerRow[]) {
  const ui = await MyVolunteersTable({ rows });
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

// The table and the cards are both in the DOM (one is hidden per width by CSS,
// which jsdom does not apply), so each fact appears once per markup.
describe("MyVolunteersTable", () => {
  it("is a real table with column headers", async () => {
    await renderTable([row()]);

    const table = screen.getByRole("table", { name: t.tableCaption });
    for (const header of Object.values(t.columns)) {
      expect(
        within(table).getByRole("columnheader", { name: header }),
      ).toBeInTheDocument();
    }
  });

  it("says who is helping which child, and where the help is", async () => {
    await renderTable([
      row(),
      row({ applicationId: "a2", status: "fulfilled", childName: "Максим" }),
    ]);

    expect(screen.getAllByText("Олександр")).toHaveLength(4);
    expect(
      screen.getAllByText(t.forChild.replace("{child}", "Софія")),
    ).toHaveLength(2);
    expect(screen.getAllByText(t.state.active)).toHaveLength(2);
    expect(screen.getAllByText(t.state.completed)).toHaveLength(2);
  });

  // ONE contact: the handle when there is one. The phone was collected as the
  // fallback for someone without a handle, so it must not appear beside it.
  it("shows the Telegram handle, and not the phone beside it", async () => {
    await renderTable([row()]);

    for (const link of screen.getAllByRole("link", { name: "@ales_wizard" })) {
      expect(link).toHaveAttribute("href", "https://t.me/ales_wizard");
    }
    expect(screen.queryByText(/\+380937861695/)).not.toBeInTheDocument();
  });

  it("falls back to the phone for a volunteer with no handle", async () => {
    await renderTable([row({ volunteerUsername: null })]);

    for (const link of screen.getAllByRole("link", {
      name: "+380937861695",
    })) {
      expect(link).toHaveAttribute("href", "tel:+380937861695");
    }
  });

  it("names a volunteer with no first name rather than leaving a blank", async () => {
    await renderTable([row({ volunteerFirstName: null })]);

    expect(screen.getAllByText(t.unnamed).length).toBeGreaterThan(0);
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderTable([
      row(),
      row({ applicationId: "a2", status: "fulfilled" }),
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });
});
