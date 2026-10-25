import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import type { BrowseQuery } from "@/features/claims/browseFilters";
import { axe } from "@/test/axe";

import { BrowseFilterForm } from "../BrowseFilterForm";

const t = messages.volunteer.children.filters;

async function renderForm(query: Partial<BrowseQuery> = {}) {
  const ui = await BrowseFilterForm({
    query: { region: null, age: null, page: 1, ...query },
    anchor: "children",
  });
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

// The phone's sheet trigger. A <summary> has no role testing-library can
// query by, so it is found by its label.
function trigger() {
  return screen.getByText(t.openSheet).closest("summary")!;
}

describe("BrowseFilterForm", () => {
  // On a phone the pickers are hidden in the sheet, so the trigger is the only
  // thing on screen that can say the list is narrowed — and it must say it in
  // words, not by turning blue.
  it("says how many filters are applied, in words", async () => {
    await renderForm({ region: "kharkiv", age: "5-8" });
    expect(trigger()).toHaveTextContent("(застосовано 2 фільтри)");
  });

  it("counts one filter", async () => {
    await renderForm({ age: "5-8" });
    expect(trigger()).toHaveTextContent("(застосовано 1 фільтр)");
  });

  it("says nothing extra when nothing is applied", async () => {
    await renderForm();
    expect(trigger()).not.toHaveTextContent("застосовано");
  });

  // Each layout's pickers are named by their own labels. With one id shared
  // by both, the sheet's labels named the row's hidden selects instead.
  it("names both layouts' pickers, and keeps the applied values", async () => {
    await renderForm({ age: "5-8" });
    const ages = screen.getAllByLabelText(t.age);
    expect(ages).toHaveLength(2);
    expect(new Set(ages.map((select) => select.id)).size).toBe(2);
    for (const select of ages) {
      expect(select).toHaveValue("5-8");
    }
    expect(screen.getAllByLabelText(t.region)).toHaveLength(2);
  });

  it("has no axe violations, with and without filters", async () => {
    const plain = await renderForm();
    expect(await axe(plain.container)).toHaveNoViolations();
    plain.unmount();

    const narrowed = await renderForm({ region: "kharkiv" });
    expect(await axe(narrowed.container)).toHaveNoViolations();
  });
});
