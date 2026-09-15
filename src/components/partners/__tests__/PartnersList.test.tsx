import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";
import { PARTNERS } from "../partners";
import { PartnersList } from "../PartnersList";

function renderList() {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <PartnersList />
    </NextIntlClientProvider>,
  );
}

describe("PartnersList", () => {
  it("names every partner in the roster", () => {
    renderList();

    for (const partner of PARTNERS) {
      const item =
        messages.partners.list.items[
          partner.key as keyof typeof messages.partners.list.items
        ];
      expect(
        screen.getByRole("heading", { name: item.name, level: 3 }),
      ).toBeInTheDocument();
      expect(screen.getByText(item.description)).toBeInTheDocument();
    }
  });

  // A logo is the partner's identity, not decoration, so it carries a name —
  // and the name has to say WHOSE logo it is, not "logo".
  it("labels each logo with the company it belongs to", () => {
    renderList();

    for (const partner of PARTNERS) {
      const item =
        messages.partners.list.items[
          partner.key as keyof typeof messages.partners.list.items
        ];
      expect(
        screen.getByRole("img", { name: `Логотип ${item.name}` }),
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
