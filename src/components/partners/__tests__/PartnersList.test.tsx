import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";
import { PARTNERS } from "../partners";
import { PartnersList } from "../PartnersList";

const VISIBLE = PARTNERS.filter((p) => !p.hidden);
const HIDDEN = PARTNERS.filter((p) => p.hidden);

function copy(key: string) {
  return messages.partners.list.items[
    key as keyof typeof messages.partners.list.items
  ];
}

function renderList() {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <PartnersList />
    </NextIntlClientProvider>,
  );
}

describe("PartnersList", () => {
  it("names every visible partner", () => {
    renderList();

    for (const partner of VISIBLE) {
      const item = copy(partner.key);
      expect(
        screen.getByRole("heading", { name: item.name, level: 3 }),
      ).toBeInTheDocument();
      expect(screen.getByText(item.description)).toBeInTheDocument();
    }
  });

  // Nothing is hidden today, so this is a count rather than a loop over the
  // hidden rows — that loop passed vacuously the moment the roster emptied of
  // them, which is worse than no test. A count stays honest either way: hide a
  // partner and this fails unless the filter actually drops it.
  it("renders exactly the visible partners, and no others", () => {
    renderList();

    expect(screen.getAllByRole("listitem")).toHaveLength(VISIBLE.length);
    for (const partner of HIDDEN) {
      expect(
        screen.queryByRole("heading", { name: copy(partner.key).name }),
      ).not.toBeInTheDocument();
    }
  });

  // A logo is the partner's identity, not decoration, so it carries a name —
  // and the name has to say WHOSE logo it is, not "logo".
  it("labels each logo with the company it belongs to", () => {
    renderList();

    for (const partner of VISIBLE) {
      expect(
        screen.getByRole("img", { name: `Логотип ${copy(partner.key).name}` }),
      ).toBeInTheDocument();
    }
  });

  it("has no accessibility violations", async () => {
    const { container } = renderList();
    expect(await axe(container)).toHaveNoViolations();
  });
});

// Every row is welded to a committed file, so a typo'd path is a broken logo
// on the only page a prospective partner reads.
describe("the partner roster", () => {
  // Deliberately over PARTNERS, not over VISIBLE: a hidden partner is meant to
  // come back by deleting one word, which it cannot if its logo has gone
  // missing while nobody was looking at it.
  it("points at files that exist, with the dimensions they really have", async () => {
    const { statSync } = await import("node:fs");

    for (const partner of PARTNERS) {
      expect(
        () => statSync(`public${partner.src}`),
        `missing public${partner.src}`,
      ).not.toThrow();
      expect(partner.width).toBeGreaterThan(0);
      expect(partner.height).toBeGreaterThan(0);
    }
  });

  it("has a message entry for every partner, and no orphans", () => {
    const keys = PARTNERS.map((p) => p.key).sort();
    expect(Object.keys(messages.partners.list.items).sort()).toEqual(keys);
  });
});
