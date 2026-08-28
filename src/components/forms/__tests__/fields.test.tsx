import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/request";

import { SelectField } from "../SelectField";
import { TextField } from "../TextField";

function wrap(ui: React.ReactNode) {
  render(
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
