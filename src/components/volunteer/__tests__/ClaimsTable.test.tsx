import { NextIntlClientProvider } from "next-intl";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/config";
import type { MyClaimRow } from "@/features/claims/queries";
import { axe } from "@/test/axe";

import { ClaimsTable } from "../ClaimsTable";

const t = messages.volunteer.claims;

const rows: MyClaimRow[] = [
  {
    applicationId: "a1",
    childName: "Софійка",
    childAge: 10,
    campaignTitle: "Чарівний Миколай",
    status: "claimed",
    claimedAt: new Date("2026-11-01T10:00:00Z"),
  },
  {
    applicationId: "a2",
    childName: "Максим",
    childAge: 6,
    campaignTitle: "Чарівний Миколай",
    status: "fulfilled",
    claimedAt: new Date("2026-11-02T10:00:00Z"),
  },
];

async function renderTable(list: MyClaimRow[] = rows) {
  const ui = await ClaimsTable({ rows: list });
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ClaimsTable", () => {
  // A real table with real headers: the row reads as «Заявка, Дитина: Софійка»
  // rather than as four unlabelled cells.
  it("is a table with the four column headers", async () => {
    await renderTable();

    const table = screen.getByRole("table", { name: t.tableCaption });
    for (const label of Object.values(t.columns)) {
      expect(
        within(table).getByRole("columnheader", { name: label }),
      ).toBeInTheDocument();
    }
    expect(within(table).getAllByRole("row")).toHaveLength(rows.length + 1);
  });

  it("names the child, the age and the campaign on each row", async () => {
    await renderTable();

    expect(
      screen.getByText(t.childName.replace("{name}", "Софійка")),
    ).toBeInTheDocument();
    expect(screen.getByText("10 років")).toBeInTheDocument();
    expect(screen.getAllByText("Чарівний Миколай")).toHaveLength(2);
  });

  // The state is the word. A volunteer who cannot tell the blue pill from the
  // green one still reads «Допомога триває» against «Допомогу завершено».
  it("says the state in words, per row", async () => {
    await renderTable();

    expect(screen.getByText(t.state.active)).toBeInTheDocument();
    expect(screen.getByText(t.state.completed)).toBeInTheDocument();
  });

  // «Переглянути» repeated down a column tells a screen-reader user nothing
  // about which row they are on, so the link is named with the child.
  it("names each details link with the child it opens", async () => {
    await renderTable();

    expect(
      screen.getByRole("link", {
        name: t.view.replace("{name}", "Софійка"),
      }),
    ).toHaveAttribute("href", "/account/volunteer/claims/a1");
    expect(
      screen.getByRole("link", { name: t.view.replace("{name}", "Максим") }),
    ).toHaveAttribute("href", "/account/volunteer/claims/a2");
  });

  // Nothing tier-2 is in the projection, and nothing tier-2 may appear here:
  // the whole point of the redesign is that the address is one click away, on
  // one child, where the read is logged.
  it("carries no address, parent name or contact", async () => {
    const { container } = await renderTable();

    for (const leaked of ["Нова пошта", "@olena", "Настенко"]) {
      expect(container.textContent).not.toContain(leaked);
    }
  });

  it("renders an application with no name or age", async () => {
    await renderTable([{ ...rows[0]!, childName: null, childAge: null }]);

    expect(
      screen.getByText(t.childName.replace("{name}", t.noName)),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderTable();
    expect(await axe(container)).toHaveNoViolations();
  });
});
