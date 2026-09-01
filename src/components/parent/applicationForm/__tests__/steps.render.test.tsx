import { NextIntlClientProvider } from "next-intl";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import messages from "../../../../../messages/uk.json";
import { locale } from "@/i18n/request";
import {
  CHILD_AGE_MAX,
  DISPLACED_YEAR_MIN,
} from "@/lib/applicationFieldOptions";
import { axe } from "@/test/axe";

import { ChildStep } from "../ChildStep";
import { FamilyStep } from "../FamilyStep";
import { GiftStep } from "../GiftStep";

const child = messages.parent.form.steps.child;
const family = messages.parent.form.steps.family;
const gift = messages.parent.form.steps.gift;
const regions = messages.regions;

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

// Age and displacement year are bounded ranges, so they are pickers rather than
// number inputs: one tap on a phone, and no way to enter a value the server
// then rejects.
describe("ChildStep", () => {
  it("offers the child's age as a list ending at the oldest child we serve", async () => {
    const user = userEvent.setup();
    wrap(<ChildStep values={{}} errors={{}} />);

    const age = screen.getByLabelText(new RegExp(child.childAge.label));
    expect(age.tagName).toBe("SELECT");

    await user.selectOptions(age, String(CHILD_AGE_MAX));
    expect(age).toHaveValue(String(CHILD_AGE_MAX));
    expect(
      screen.queryByRole("option", { name: String(CHILD_AGE_MAX + 1) }),
    ).toBeNull();
  });

  it("offers displacement years from the start of the war", async () => {
    const user = userEvent.setup();
    wrap(<ChildStep values={{}} errors={{}} />);

    const year = screen.getByLabelText(new RegExp(child.displacedYear.label));
    expect(year.tagName).toBe("SELECT");

    await user.selectOptions(year, String(DISPLACED_YEAR_MIN));
    expect(year).toHaveValue(String(DISPLACED_YEAR_MIN));
    expect(
      screen.queryByRole("option", { name: String(DISPLACED_YEAR_MIN - 1) }),
    ).toBeNull();
  });

  // Values come back from the DB as numbers; a <select> matches on strings.
  it("preselects the values already saved on a draft", () => {
    wrap(
      <ChildStep values={{ childAge: 3, displacedYear: 2022 }} errors={{}} />,
    );

    expect(screen.getByLabelText(new RegExp(child.childAge.label))).toHaveValue(
      "3",
    );
    expect(
      screen.getByLabelText(new RegExp(child.displacedYear.label)),
    ).toHaveValue("2022");
  });

  // Where a family LEFT is the occupied and front-line oblasts; where they
  // live NOW is anywhere in the country. Two lists, one taxonomy.
  it("asks a narrower question about where the family came from", () => {
    wrap(<ChildStep values={{}} errors={{}} />);

    const origin = screen.getByLabelText(new RegExp(child.homeRegion.label));
    const now = screen.getByLabelText(new RegExp(child.currentRegion.label));

    expect(
      within(origin).queryByRole("option", { name: regions.lviv }),
    ).toBeNull();
    expect(
      within(origin).getByRole("option", { name: regions.donetsk }),
    ).toBeInTheDocument();
    expect(
      within(now).getByRole("option", { name: regions.lviv }),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = wrap(<ChildStep values={{}} errors={{}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("FamilyStep", () => {
  // Saves the parent retyping a name we already have from their verified
  // Telegram profile.
  it("prefills the parent's name from their profile", () => {
    wrap(
      <FamilyStep values={{}} errors={{}} defaultParentName="Олена Коваль" />,
    );

    expect(
      screen.getByLabelText(new RegExp(family.parentName.label)),
    ).toHaveValue("Олена Коваль");
  });

  // A prefill, never a copy: the gift is handed over against this name, so what
  // the parent actually typed always wins over the provider's display name.
  it("does not override a name the parent already gave", () => {
    wrap(
      <FamilyStep
        values={{ parentName: "Олена Іванівна Коваль" }}
        errors={{}}
        defaultParentName="Олена Коваль"
      />,
    );

    expect(
      screen.getByLabelText(new RegExp(family.parentName.label)),
    ).toHaveValue("Олена Іванівна Коваль");
  });
});

describe("GiftStep", () => {
  // A wish is usually a few items with sizes and colours; a single-line input
  // hid everything past the first few words while the parent was still writing.
  it("gives the wish room to be more than one line", async () => {
    const user = userEvent.setup();
    wrap(<GiftStep values={{}} errors={{}} />);

    const wish = screen.getByLabelText(new RegExp(gift.giftDescription.label));
    expect(wish.tagName).toBe("TEXTAREA");

    await user.type(wish, "Лялька\nі набір фарб");
    expect(wish).toHaveValue("Лялька\nі набір фарб");
  });

  it("has no accessibility violations", async () => {
    const { container } = wrap(<GiftStep values={{}} errors={{}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
