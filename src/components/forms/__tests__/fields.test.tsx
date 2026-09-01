import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/request";
import { axe } from "@/test/axe";

import { SelectField } from "../SelectField";
import { TextField } from "../TextField";

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

// The application form is the highest-stakes surface in the product and is used
// on phones by stressed people, so the field primitives carry the accessibility
// contract: a real label, and errors wired to the control.
describe("TextField", () => {
  it("links a visible label to the input", async () => {
    const user = userEvent.setup();
    wrap(<TextField id="childName" name="childName" label="Ім'я дитини" />);

    const input = screen.getByLabelText(/Ім'я дитини/);
    await user.type(input, "Оля");
    expect(input).toHaveValue("Оля");
  });

  it("marks an invalid field and points aria-describedby at the message", () => {
    wrap(
      <TextField
        id="childName"
        name="childName"
        label="Ім'я дитини"
        hint="Підказка"
        error="Заповніть це поле"
      />,
    );

    const input = screen.getByLabelText(/Ім'я дитини/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toBe(
      "childName-hint childName-error",
    );
    // The message is announced, not just painted red.
    expect(screen.getByRole("alert")).toHaveTextContent("Заповніть це поле");
  });

  it("has no aria-invalid or describedby when clean", () => {
    wrap(<TextField id="childName" name="childName" label="Ім'я дитини" />);
    const input = screen.getByLabelText(/Ім'я дитини/);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });
});

describe("SelectField", () => {
  it("renders a native select with a placeholder and options", async () => {
    const user = userEvent.setup();
    wrap(
      <SelectField
        id="homeRegion"
        name="homeRegion"
        label="Область"
        placeholder="Оберіть область"
        options={[
          { value: "donetsk", label: "Донецька область" },
          { value: "lviv", label: "Львівська область" },
        ]}
      />,
    );

    const select = screen.getByLabelText(/Область/);
    await user.selectOptions(select, "lviv");
    expect(select).toHaveValue("lviv");
  });
});

// Automated sweep over the primitives every form is built from. The assertions
// above encode what we MEANT to build; axe catches the accessibility defects
// nobody thought to assert — a stray aria-* that no longer matches its element,
// a duplicated id, a control that lost its name in a refactor.
//
// Contrast is NOT covered here (axe cannot measure it in jsdom); see
// src/test/__tests__/contrast.test.ts.
describe("field primitives pass an automated accessibility sweep", () => {
  it("TextField, clean and invalid", async () => {
    const clean = wrap(<TextField id="a" name="a" label="Імʼя дитини" />);
    expect(await axe(clean.container)).toHaveNoViolations();
    clean.unmount();

    const invalid = wrap(
      <TextField
        id="b"
        name="b"
        label="Вік"
        hint="Наприклад: 7"
        error="Заповніть це поле"
      />,
    );
    expect(await axe(invalid.container)).toHaveNoViolations();
  });

  it("SelectField, clean and invalid", async () => {
    const options = [
      { value: "lviv", label: "Львівська область" },
      { value: "kyiv", label: "Київська область" },
    ];
    const clean = wrap(
      <SelectField
        id="c"
        name="c"
        label="Область"
        placeholder="Оберіть область"
        options={options}
      />,
    );
    expect(await axe(clean.container)).toHaveNoViolations();
    clean.unmount();

    const invalid = wrap(
      <SelectField
        id="d"
        name="d"
        label="Область"
        placeholder="Оберіть область"
        options={options}
        error="Оберіть значення"
      />,
    );
    expect(await axe(invalid.container)).toHaveNoViolations();
  });
});
