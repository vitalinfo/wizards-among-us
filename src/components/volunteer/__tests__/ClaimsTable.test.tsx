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
    childGender: "girl",
    campaignTitle: "Чарівний Миколай",
    status: "claimed",
    claimedAt: new Date("2026-11-01T10:00:00Z"),
  },
  {
    applicationId: "a2",
    childName: "Максим",
    childAge: 6,
    childGender: "boy",
    campaignTitle: "Чарівний Миколай",
    status: "fulfilled",
    claimedAt: new Date("2026-11-02T10:00:00Z"),
  },
];

async function renderTable(list: MyClaimRow[] = rows) {
  const ui = await ClaimsTable({
    rows: list,
    query: { tab: "active", page: 2, per: 10 },
  });
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
    // …and the same children again as cards, for the phone.
    expect(screen.getAllByRole("listitem")).toHaveLength(rows.length);
  });

  // The name alone — no «Дитина: » prefix (Vital). Rendered twice, because the
  // table and the phone cards are separate markup: one of them is display:none
  // at any given width.
  it("names the child, the age and the campaign on each row", async () => {
    await renderTable();

    expect(screen.getAllByText("Софійка")).toHaveLength(2);
    expect(screen.queryByText(/^Дитина:/)).not.toBeInTheDocument();
    expect(screen.getAllByText("10 років")).toHaveLength(2);
    expect(screen.getAllByText(/Чарівний Миколай/)).toHaveLength(4);
  });

  // The state is the word. A volunteer who cannot tell the blue pill from the
  // green one still reads «Допомога триває» against «Допомогу завершено».
  it("says the state in words, per row", async () => {
    await renderTable();

    expect(screen.getAllByText(t.state.active)).toHaveLength(2);
    expect(screen.getAllByText(t.state.completed)).toHaveLength(2);
  });

  // «Переглянути» repeated down a column tells a screen-reader user nothing
  // about which row they are on, so the link is named with the child.
  it("names each details link with the child it opens", async () => {
    await renderTable();

    for (const [name, id] of [
      ["Софійка", "a1"],
      ["Максим", "a2"],
    ] as const) {
      const links = screen.getAllByRole("link", {
        name: t.view.replace("{name}", name),
      });
      expect(links).toHaveLength(2);
      for (const link of links) {
        expect(link).toHaveAttribute("href", `/account/volunteer/claims/${id}`);
      }
    }
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
    await renderTable([
      { ...rows[0]!, childName: null, childAge: null, childGender: null },
    ]);

    expect(screen.getAllByText(t.noName)).toHaveLength(2);
  });

  // The optional mark: offered on a claimed child, taken off a processed one,
  // never on a fulfilled one. Named with the child, like the details link, and
  // each opens its confirmation over the same view of the list.
  it("offers the processed mark on claimed rows and its undo on processed rows", async () => {
    await renderTable([
      rows[0]!,
      {
        ...rows[0]!,
        applicationId: "a3",
        childName: "Олег",
        status: "processed",
      },
      rows[1]!,
    ]);

    const mark = screen.getAllByRole("link", {
      name: t.markProcessedFor.replace("{name}", "Софійка"),
    });
    expect(mark).toHaveLength(2);
    for (const link of mark) {
      expect(link).toHaveAttribute(
        "href",
        "/account/volunteer/claims?tab=active&page=2&dialog=process&id=a1",
      );
    }
    const unmark = screen.getAllByRole("link", {
      name: t.unmarkProcessedFor.replace("{name}", "Олег"),
    });
    expect(unmark).toHaveLength(2);
    for (const link of unmark) {
      expect(link).toHaveAttribute(
        "href",
        "/account/volunteer/claims?tab=active&page=2&dialog=unprocess&id=a3",
      );
    }
    expect(screen.getAllByText(t.state.processed)).toHaveLength(2);
    expect(
      screen.queryByRole("link", {
        name: t.markProcessedFor.replace("{name}", "Максим"),
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: t.unmarkProcessedFor.replace("{name}", "Максим"),
      }),
    ).not.toBeInTheDocument();
  });

  // Each icon says what it does on hover and focus. The bubble's words must be
  // in the control's name, so a voice-control user can say what they read.
  it("labels each icon with its action", async () => {
    await renderTable([
      rows[0]!,
      { ...rows[0]!, applicationId: "a3", status: "processed" },
    ]);

    for (const [short, full] of [
      [t.markProcessed, t.markProcessedFor],
      [t.unmarkProcessed, t.unmarkProcessedFor],
    ] as const) {
      expect(screen.getAllByText(short)).toHaveLength(2);
      expect(full.replace("{name}", "Софійка")).toContain(short);
    }
    expect(screen.getAllByText(t.viewShort)).toHaveLength(4);
    expect(t.view.replace("{name}", "Софійка")).toContain(t.viewShort);
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderTable();
    expect(await axe(container)).toHaveNoViolations();
  });
});
